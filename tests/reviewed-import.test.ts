import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentSchema, entrySchema, topicSchema } from '../src/content/schema';
import type { Entry, Topic } from '../src/domain/types';
import { runReviewedImport } from '../server/src/scripts/review-import-executor';
import { buildReviewedImportPlan, type ImportSnapshot, type ReviewedPackage, type StoredEntry, type StoredTopic } from '../server/src/scripts/review-import-plan';

const source = (field: 'meaning' | 'example', status: 'authored' | 'unverified') => ({
  field,
  attribution: 'Local source attribution',
  license: 'CC BY-SA 4.0',
  url: 'https://en.wiktionary.org/wiki/example',
  status,
  checkedAt: null,
});

const makeEntry = (id: string, collectionId: 'ielts' | 'daily', headword: string, local = false): Entry =>
  entrySchema.parse({
    id,
    revision: 1,
    collectionId,
    headword,
    partOfSpeech: 'n.',
    senseKey: `sense-${id}`,
    meaningVi: `Nghĩa ${headword}`,
    acceptedLearnAnswers: [headword],
    cefr: {level: null, status: 'unknown', note: 'No source CEFR.'},
    pronunciation: {ipa: null, accent: null},
    examples: [{id: `example-${id}`, prefix: `${headword} `, targetSurface: headword, suffix: ' matters.', acceptedAnswers: [headword]}],
    provenance: [source('meaning', local ? 'unverified' : 'authored'), source('example', local ? 'unverified' : 'authored')],
    contentStatus: 'ready',
  });

function fixture(conflict = false, alreadyPublished = false) {
  const catalog: Topic[] = [];
  for (const collectionId of ['ielts', 'daily'] as const) {
    for (let order = 1; order <= 100; order += 1) {
      catalog.push(topicSchema.parse({
        id: `${collectionId}-${String(order).padStart(3, '0')}`,
        collectionId,
        nameEn: `${collectionId} topic ${order}`,
        nameVi: `Topic ${order}`,
        order,
        entryIds: [],
      }));
    }
  }
  const targets = catalog.filter((topic) => topic.collectionId === 'ielts' ? topic.order >= 56 : topic.order >= 11);
  const oldEntry = makeEntry('old-road-word', 'ielts', 'existing');
  const newEntry = makeEntry('new-road-word', 'ielts', 'collision', true);
  const firstId = 'ielts-056';
  const currentTopics = catalog.map((topic) => topic.id === firstId
    ? {...topic, entryIds: alreadyPublished ? [oldEntry.id, newEntry.id] : [oldEntry.id]}
    : topic);
  const currentContent = contentSchema.parse({
    schemaVersion: 1,
    contentVersion: 'published-current',
    entries: alreadyPublished ? [oldEntry, newEntry] : [oldEntry],
    topics: currentTopics,
  });
  const topicRows = targets.map((topic) => {
    const currentWords = topic.id === firstId ? [{id: oldEntry.id}] : [];
    const proposedAdditions = topic.id === firstId ? [{entryId: newEntry.id, headword: newEntry.headword}] : [];
    return {
      topicId: topic.id,
      collectionId: topic.collectionId,
      order: topic.order,
      nameEn: topic.nameEn,
      nameVi: topic.nameVi,
      currentCount: currentWords.length,
      addedCount: proposedAdditions.length,
      totalAfter: currentWords.length + proposedAdditions.length,
      currentWords,
      proposedAdditions,
      publishPack: `publish-packs/${topic.collectionId}/topics/crawled-${topic.id}.json`,
    };
  });
  const packsByTopic = new Map<string, ReturnType<typeof contentSchema.parse>>();
  for (const topic of targets) {
    const ids = topic.id === firstId ? [oldEntry.id, newEntry.id] : [];
    packsByTopic.set(topic.id, contentSchema.parse({
      schemaVersion: 1,
      contentVersion: `review-${topic.id}`,
      entries: topic.id === firstId ? [oldEntry, newEntry] : [],
      topics: [{...topic, entryIds: ids}],
    }));
  }
  const reviewed: ReviewedPackage = {
    topicRows,
    packsByTopic,
    entriesById: new Map([[oldEntry.id, oldEntry], [newEntry.id, newEntry]]),
  };
  const dbTopics: StoredTopic[] = targets.map((topic) => ({
    ...topic,
    entryIds: topic.id === firstId ? [oldEntry.id] : [],
    _id: topic.id,
  }));
  const storedNew = conflict
    ? {...makeEntry(newEntry.id, 'ielts', 'different', true), _id: newEntry.id}
    : null;
  const snapshot: ImportSnapshot = {
    topics: dbTopics,
    entries: [
      {...oldEntry, _id: oldEntry.id},
      ...(storedNew ? [storedNew] : []),
    ] as StoredEntry[],
  };
  return {catalog, currentContent, reviewed, snapshot, oldEntry, newEntry};
}

function cloneState(snapshot: ImportSnapshot): ImportSnapshot {
  return structuredClone(snapshot);
}

function harness(initial: ImportSnapshot) {
  let state = cloneState(initial);
  let writes = 0;
  let transactions = 0;
  const dependencies = {
    readSnapshot: async () => cloneState(state),
    withTransaction: async <T>(work: (session: object) => Promise<T>) => {
      transactions += 1;
      const before = cloneState(state);
      try {
        return await work({});
      } catch (error) {
        state = before;
        throw error;
      }
    },
    apply: async (_session: object, plan: ReturnType<typeof buildReviewedImportPlan>) => {
      for (const entry of plan.entriesToInsert) {
        writes += 1;
        state.entries.push({...entry, _id: entry.id});
      }
      for (const update of plan.topicsToAppend) {
        writes += 1;
        const topic = state.topics.find((item) => item._id === update.topicId)!;
        topic.entryIds = [...topic.entryIds, ...update.entryIdsToAdd];
      }
    },
    current: () => cloneState(state),
    writes: () => writes,
    transactions: () => transactions,
  };
  return dependencies;
}

test('dry-run reads and plans without opening a transaction or writing', async () => {
  const data = fixture();
  const store = harness(data.snapshot);
  const result = await runReviewedImport({
    write: false,
    readSnapshot: store.readSnapshot,
    buildPlan: (snapshot) => buildReviewedImportPlan({...data, snapshot}),
    withTransaction: store.withTransaction,
    apply: store.apply,
  });
  assert.equal(result.applied, false);
  assert.equal(result.plan.entriesToInsert.length, 1);
  assert.equal(store.writes(), 0);
  assert.equal(store.transactions(), 0);
  assert.deepEqual(store.current(), data.snapshot);
});

test('write appends after old links and a rerun adds nothing', async () => {
  const data = fixture();
  const store = harness(data.snapshot);
  const operation = () => runReviewedImport({
    write: true,
    readSnapshot: store.readSnapshot,
    buildPlan: (snapshot) => buildReviewedImportPlan({...data, snapshot}),
    withTransaction: store.withTransaction,
    apply: store.apply,
  });
  const first = await operation();
  assert.equal(first.plan.entriesToInsert.length, 1);
  assert.deepEqual(first.plan.topicsToAppend[0]?.entryIdsBefore, [data.oldEntry.id]);
  assert.deepEqual(first.plan.topicsToAppend[0]?.entryIdsAfter, [data.oldEntry.id, data.newEntry.id]);
  assert.deepEqual(store.current().topics.find((topic) => topic._id === 'ielts-056')?.entryIds, [data.oldEntry.id, data.newEntry.id]);

  const second = await operation();
  assert.equal(second.plan.entriesToInsert.length, 0);
  assert.equal(second.plan.topicsToAppend.length, 0);
  assert.equal(store.writes(), 2);
});

test('package remains importable after the reviewed pack is published locally', async () => {
  const data = fixture(false, true);
  const store = harness(data.snapshot);
  const result = await runReviewedImport({
    write: false,
    readSnapshot: store.readSnapshot,
    buildPlan: (snapshot) => buildReviewedImportPlan({...data, snapshot}),
    withTransaction: store.withTransaction,
    apply: store.apply,
  });
  assert.equal(result.plan.entriesToInsert.length, 1);
  assert.equal(result.plan.topicsToAppend.length, 1);
});

test('same ID with different Mongo content conflicts before the first write', async () => {
  const data = fixture(true);
  const store = harness(data.snapshot);
  await assert.rejects(
    runReviewedImport({
      write: true,
      readSnapshot: store.readSnapshot,
      buildPlan: (snapshot) => buildReviewedImportPlan({...data, snapshot}),
      withTransaction: store.withTransaction,
      apply: store.apply,
    }),
    /Xung đột entry cùng ID trong MongoDB/u,
  );
  assert.equal(store.writes(), 0);
});

test('preflight stops when a topic would exceed ten entries', async () => {
  const data = fixture();
  const first = data.snapshot.topics.find((topic) => topic._id === 'ielts-056')!;
  for (let index = 0; index < 9; index += 1) {
    const entry = makeEntry(`other-existing-${index}`, 'ielts', `existing-${index}`);
    first.entryIds.push(entry.id);
    data.snapshot.entries.push({...entry, _id: entry.id});
  }
  const store = harness(data.snapshot);
  await assert.rejects(
    runReviewedImport({
      write: true,
      readSnapshot: store.readSnapshot,
      buildPlan: (snapshot) => buildReviewedImportPlan({...data, snapshot}),
      withTransaction: store.withTransaction,
      apply: store.apply,
    }),
    /sẽ vượt giới hạn 10 từ/u,
  );
  assert.equal(store.writes(), 0);
});

test('a failure during writes rolls back all in-memory transaction changes', async () => {
  const data = fixture();
  const store = harness(data.snapshot);
  const before = store.current();
  await assert.rejects(
    runReviewedImport({
      write: true,
      readSnapshot: store.readSnapshot,
      buildPlan: (snapshot) => buildReviewedImportPlan({...data, snapshot}),
      withTransaction: store.withTransaction,
      apply: async (session, plan) => {
        await store.apply(session, plan);
        throw new Error('simulated topic update failure');
      },
    }),
    /simulated topic update failure/u,
  );
  assert.deepEqual(store.current(), before);
});
