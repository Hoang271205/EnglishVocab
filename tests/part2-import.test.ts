import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { contentSchema, topicSchema } from '../src/content/schema';
import { compareTopics } from '../src/domain/topic-order';
import type { Entry, Topic } from '../src/domain/types';
import {
  buildPart2Plan,
  executePart2Import,
  type Part2Snapshot,
} from '../server/src/scripts/part2-import-plan';
import { sample } from './fixtures';

function fixture() {
  const catalog: Topic[] = JSON.parse(
    readFileSync('content/catalog.json', 'utf8'),
  );
  const topics: Topic[] = catalog.map((t) => ({
    ...t,
    id: t.id + '-part-2',
    part: 2,
    parentTopicId: t.id,
    nameEn: t.nameEn + ' (Part 2)',
    nameVi: t.nameVi + ' (Phần 2)',
    order: t.order + 100,
    entryIds: Array.from(
      { length: 10 },
      (_, i) => `part2-${t.collectionId}-${t.order}-${i}`,
    ),
  }));
  const entries: Entry[] = topics.flatMap((t) =>
    t.entryIds.map((id) => ({
      ...sample(),
      id,
      collectionId: t.collectionId,
      senseKey: id,
      headword: id,
      cefr: { level: null, status: 'unknown', note: '' },
    })),
  );
  const pack = {
    schemaVersion: 1,
    contentVersion: 'test-part2',
    entries,
    topics,
  };
  const snapshot: Part2Snapshot = {
    entries: [],
    topics: catalog.map((t) => ({ _id: t.id, ...t })),
  };
  return { catalog, pack, snapshot };
}

test('Part 2 order interleaves without changing stored parent order', () => {
  const f = fixture(),
    a = f.catalog[0]!,
    b = f.catalog[1]!,
    p = f.pack.topics[0]!;
  assert.deepEqual(
    [b, p, a].sort(compareTopics).map((t) => t.id),
    [a.id, p.id, b.id],
  );
  assert.equal(a.order, 1);
  assert.equal(p.order, 101);
  assert.equal(topicSchema.safeParse({ ...a, order: 101 }).success, false);
  assert.equal(
    topicSchema.safeParse({ ...p, parentTopicId: undefined }).success,
    false,
  );
});

test('200 new topics are scoped correctly, max ten; original topics stay byte-equivalent', () => {
  const f = fixture(),
    before = structuredClone(f.snapshot);
  const plan = buildPart2Plan({
    package: f.pack,
    catalog: f.catalog,
    snapshot: f.snapshot,
  });
  assert.equal(plan.entriesToInsert.length, 2000);
  assert.equal(plan.topicsToInsert.length, 200);
  assert.deepEqual(f.snapshot, before);
  f.pack.topics[0]!.entryIds.push(f.pack.topics[1]!.entryIds[0]!);
  assert.throws(() =>
    buildPart2Plan({
      package: f.pack,
      catalog: f.catalog,
      snapshot: f.snapshot,
    }),
  );
});

test('a repeated import is a no-op; same-ID entry/topic conflicts stop planning', () => {
  const f = fixture();
  f.snapshot.entries.push(...f.pack.entries.map((e) => ({ _id: e.id, ...e })));
  f.snapshot.topics.push(...f.pack.topics.map((t) => ({ _id: t.id, ...t })));
  const plan = buildPart2Plan({
    package: f.pack,
    catalog: f.catalog,
    snapshot: f.snapshot,
  });
  assert.equal(plan.entriesToInsert.length, 0);
  assert.equal(plan.topicsToInsert.length, 0);
  f.snapshot.entries[0]!.meaningVi = 'unexpected content';
  assert.throws(
    () =>
      buildPart2Plan({
        package: f.pack,
        catalog: f.catalog,
        snapshot: f.snapshot,
      }),
    /Entry content conflict/,
  );
  f.snapshot.entries[0]!.meaningVi = f.pack.entries[0]!.meaningVi;
  f.snapshot.topics.at(-1)!.nameEn = 'changed';
  assert.throws(
    () =>
      buildPart2Plan({
        package: f.pack,
        catalog: f.catalog,
        snapshot: f.snapshot,
      }),
    /Topic content conflict/,
  );
});

test('wrong collection, missing parent and occupied unique order are rejected', () => {
  const f = fixture();
  f.pack.entries[0]!.collectionId = 'daily';
  assert.throws(() =>
    buildPart2Plan({
      package: f.pack,
      catalog: f.catalog,
      snapshot: f.snapshot,
    }),
  );
  const g = fixture();
  g.snapshot.topics.shift();
  assert.throws(
    () =>
      buildPart2Plan({
        package: g.pack,
        catalog: g.catalog,
        snapshot: g.snapshot,
      }),
    /parent/,
  );
  const h = fixture();
  h.snapshot.topics.push({
    ...h.pack.topics[0]!,
    id: 'occupied',
    _id: 'occupied',
  });
  assert.throws(
    () =>
      buildPart2Plan({
        package: h.pack,
        catalog: h.catalog,
        snapshot: h.snapshot,
      }),
    /order occupied/,
  );
});

test('dry-run never starts a transaction or calls apply', async () => {
  const f = fixture();
  let transactions = 0,
    applies = 0;
  const result = await executePart2Import({
    write: false,
    read: async () => f.snapshot,
    plan: (snapshot) =>
      buildPart2Plan({ package: f.pack, catalog: f.catalog, snapshot }),
    transaction: async (work) => {
      transactions++;
      return work('session');
    },
    apply: async () => {
      applies++;
    },
  });
  assert.equal(result.applied, false);
  assert.equal(transactions, 0);
  assert.equal(applies, 0);
});

test('transaction failure rolls back inserted entries; preflight conflict makes no writes', async () => {
  const f = fixture(),
    before = structuredClone(f.snapshot);
  let db = structuredClone(f.snapshot),
    applies = 0;
  await assert.rejects(
    executePart2Import<Part2Snapshot>({
      write: true,
      read: async (session) => session ?? db,
      plan: (snapshot) =>
        buildPart2Plan({ package: f.pack, catalog: f.catalog, snapshot }),
      transaction: async (work) => {
        const staged = structuredClone(db);
        const result = await work(staged);
        db = staged;
        return result;
      },
      apply: async (session, plan) => {
        applies++;
        session.entries.push(
          ...plan.entriesToInsert.map((e) => ({ _id: e.id, ...e })),
        );
        throw new Error('simulated topic insert failure');
      },
    }),
    /simulated/,
  );
  assert.deepEqual(db, before);
  assert.equal(applies, 1);
  f.pack.entries[0]!.headword = f.pack.entries[1]!.headword;
  await assert.rejects(
    executePart2Import<Part2Snapshot>({
      write: true,
      read: async () => db,
      plan: (snapshot) =>
        buildPart2Plan({ package: f.pack, catalog: f.catalog, snapshot }),
      transaction: (work) => work(db),
      apply: async () => {
        applies++;
      },
    }),
    /collision/,
  );
  assert.equal(applies, 1);
  assert.deepEqual(db, before);
});

test('combined 400 topics are valid; original content remains valid', () => {
  const f = fixture();
  assert.equal(
    contentSchema.safeParse({
      ...f.pack,
      topics: [...f.catalog, ...f.pack.topics],
    }).success,
    true,
  );
});
