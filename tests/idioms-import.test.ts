import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { contentSchema } from '../src/content/schema.js';
import {
  buildIdiomsPlan, executeIdiomsImport, idiomsHeadwordKey, idiomsPackageHash, validateIdiomsPackage,
  type IdiomsSnapshot,
} from '../server/src/scripts/idioms-import-plan.js';

// Synthetic contract fixtures only: these are not linguistic reviews or publication evidence.
test('Idioms: person placeholders and possessive variants use the same stable identity', () => {
  assert.equal(idiomsHeadwordKey("give someone a hand"), idiomsHeadwordKey("give somebody a hand"));
  assert.equal(idiomsHeadwordKey("keep your cool"), idiomsHeadwordKey("keep one's cool"));
  assert.notEqual(idiomsHeadwordKey('lose touch'), idiomsHeadwordKey('lose your touch'));
});

function fixture() {
  const entries = Array.from({ length: 500 }, (_, i) => {
    const headword = `test expression ${i}`;
    const id = 'idiom-sense-' + createHash('sha256').update(idiomsHeadwordKey(headword)).digest('hex').slice(0, 20);
    return {
      id, revision: 1, collectionId: 'idioms', headword, partOfSpeech: 'phrase', senseKey: `test-sense-${i}`,
      meaningVi: `Nghĩa kiểm thử ${i}`, acceptedLearnAnswers: [headword],
      cefr: { level: null, status: 'unknown', note: 'Test only.' }, pronunciation: { ipa: null, accent: null },
      examples: [{ id: `test-example-${i}`, prefix: 'We use ', targetSurface: headword, suffix: ' here.', acceptedAnswers: [headword] }],
      provenance: [
        ...(['meaning', 'example'] as const).map(field => ({ field, attribution: 'Synthetic test fixture', license: 'Test-only authored fixture', url: null, status: 'authored', checkedAt: null })),
        ...['https://example.org/test-meaning', 'https://example.org/test-usage'].map(url => ({ field: 'definition', attribution: 'Synthetic reference only', license: 'Test-only reference', url, status: 'unverified', checkedAt: null })),
      ],
      contentStatus: 'ready',
    };
  });
  const topics = Array.from({ length: 100 }, (_, i) => ({
    id: `idioms-${String(i + 1).padStart(3, '0')}`, collectionId: 'idioms', nameEn: `Test ${i + 1}`, nameVi: `Kiểm thử ${i + 1}`, order: i + 1,
    entryIds: entries.slice(i * 5, i * 5 + 5).map(e => e.id),
  }));
  const input = { schemaVersion: 1, contentVersion: 'idioms-contract-test', entries, topics };
  const bytes = Buffer.from(JSON.stringify(input));
  const quality = {
    schemaVersion: 1, packageSha256: idiomsPackageHash(bytes), status: 'reviewed', unresolvedEntryIds: [],
    entries: entries.map((e, i) => ({
      entryId: e.id, senseKey: e.senseKey, topicId: topics[Math.floor(i / 5)]!.id,
      meaningReferenceUrls: ['https://example.org/test-meaning'],
      popularityAssessment: 'dated_qualitative_signal',
      usageEvidence: [{ url: 'https://example.org/test-usage', kind: 'publisher_common_list', publishedYear: 2025, sourceExpression: e.headword, observationStart: null, observationEnd: null, frequencyPerMillion: null, assessment: 'Synthetic test evidence, not a real source.' }],
      classification: 'idiom', meaningExampleTopicReviewed: true, reviewNote: 'Synthetic test review only.',
    })),
  };
  return { input, bytes, quality, pack: validateIdiomsPackage(bytes, quality) };
}

test('Idioms: full 100 × 5 schema and bound quality report pass contract validation', () => {
  const f = fixture();
  assert.equal(f.pack.entries.length, 500);
  assert.deepEqual(buildIdiomsPlan(f.pack, { entries: [], topics: [] }).topicsToInsert.length, 100);
});

test('Idioms: review references and populated optional fields retain their source', () => {
  const f = fixture();
  const missingReference = structuredClone(f.input);
  missingReference.entries[0]!.provenance = missingReference.entries[0]!.provenance.filter(p => p.url !== 'https://example.org/test-meaning');
  const missingOptional = structuredClone(f.input);
  Object.assign(missingOptional.entries[0]!.pronunciation, { ipa: '/test/', accent: 'en-US' });
  for (const input of [missingReference, missingOptional]) {
    const bytes = Buffer.from(JSON.stringify(input));
    assert.throws(() => validateIdiomsPackage(bytes, { ...f.quality, packageSha256: idiomsPackageHash(bytes) }), /source|provenance/i);
  }
});

test('Idioms: original and Part 2 catalogues coexist with all 100 Idioms topics', () => {
  const { pack } = fixture();
  const legacy = (['ielts', 'daily'] as const).flatMap(collectionId =>
    Array.from({ length: 100 }, (_, index) => {
      const order = index + 1; const id = `${collectionId}-${String(order).padStart(3, '0')}`;
      const parent = { id, collectionId, order, nameEn: `Original ${order}`, nameVi: `Gốc ${order}`, entryIds: [] };
      return [parent, { ...parent, id: `${id}-part-2`, order: order + 100, part: 2, parentTopicId: id }];
    }).flat(),
  );
  assert.equal(contentSchema.safeParse({ ...pack, topics: [...legacy, ...pack.topics] }).success, true);
});

test('Idioms: editorial selection does not require dated popularity evidence', () => {
  const f = fixture(); const quality = structuredClone(f.quality);
  quality.entries[0]!.popularityAssessment = 'editorial_selection_only';
  quality.entries[0]!.usageEvidence = [];
  assert.equal(validateIdiomsPackage(f.bytes, quality).entries.length, 500);
});

test('Idioms: mismatched checksum, unresolved reviews, invalid popularity classification and duplicate reviews stop preflight', () => {
  const f = fixture();
  for (const change of [
    (q: typeof f.quality) => { q.packageSha256 = 'a'.repeat(64); },
    (q: typeof f.quality) => { q.unresolvedEntryIds = ['unresolved'] as never[]; },
    (q: typeof f.quality) => { q.entries[0]!.popularityAssessment = 'unknown' as never; },
    (q: typeof f.quality) => { q.entries[1] = q.entries[0]!; },
  ]) {
    const quality = structuredClone(f.quality); change(quality);
    assert.throws(() => validateIdiomsPackage(f.bytes, quality));
  }
});

test('Idioms: six entries/topic, cross-collection links and unknown whole-phrase membership fail schema', () => {
  const f = fixture();
  const oversized = structuredClone(f.input); oversized.topics[0]!.entryIds.push(oversized.entries[5]!.id);
  assert.equal(contentSchema.safeParse(oversized).success, false);
  const cross = structuredClone(f.input); cross.entries[0]!.collectionId = 'daily';
  assert.equal(contentSchema.safeParse(cross).success, false);
});

test('Idioms: draft status or unstable entry ID cannot be promoted by a quality report', () => {
  const f = fixture();
  for (const change of [
    (p: typeof f.input) => { p.entries[0]!.contentStatus = 'draft'; },
    (p: typeof f.input) => { p.entries[0]!.id = 'idiom-sense-' + 'f'.repeat(20); p.topics[0]!.entryIds[0] = p.entries[0]!.id; },
  ]) {
    const pack = structuredClone(f.input); change(pack);
    const bytes = Buffer.from(JSON.stringify(pack)); const quality = structuredClone(f.quality);
    quality.packageSha256 = idiomsPackageHash(bytes); quality.entries[0]!.entryId = pack.entries[0]!.id;
    assert.throws(() => validateIdiomsPackage(bytes, quality));
  }
});

test('Idioms: dry-run never applies writes or opens a transaction', async () => {
  const { pack } = fixture(); const snapshot: IdiomsSnapshot = { entries: [], topics: [] };
  const before = structuredClone(snapshot); let writes = 0; let transactions = 0;
  const result = await executeIdiomsImport({
    write: false, read: async () => snapshot, plan: s => buildIdiomsPlan(pack, s),
    transaction: async work => { transactions++; return work(null); },
    apply: async () => { writes++; },
  });
  assert.equal(result.applied, false); assert.equal(writes, 0); assert.equal(transactions, 0); assert.deepEqual(snapshot, before);
});

test('Idioms: rerun is idempotent and existing IELTS/Daily shared content stays intact', () => {
  const { pack } = fixture();
  const oldEntry = { ...pack.entries[0]!, id: 'old-ielts-entry', _id: 'old-ielts-entry', collectionId: 'ielts' as const };
  const oldTopic = { id: 'ielts-056', _id: 'ielts-056', collectionId: 'ielts' as const, nameEn: 'Road Safety', nameVi: 'An toàn đường bộ', order: 56, entryIds: ['old-1', 'old-2', 'old-3'] };
  const snapshot: IdiomsSnapshot = { entries: [oldEntry], topics: [oldTopic] }; const before = structuredClone(snapshot);
  const first = buildIdiomsPlan(pack, snapshot);
  assert.deepEqual(snapshot, before); assert.equal(first.entriesToInsert.length, 500);
  snapshot.entries.push(...first.entriesToInsert.map(e => ({ _id: e.id, ...e })));
  snapshot.topics.push(...first.topicsToInsert.map(t => ({ _id: t.id, ...t })));
  const second = buildIdiomsPlan(pack, snapshot);
  assert.equal(second.entriesToInsert.length, 0); assert.equal(second.topicsToInsert.length, 0);
  assert.deepEqual(snapshot.entries[0], before.entries[0]); assert.deepEqual(snapshot.topics[0], before.topics[0]);
});

test('Idioms: changed entry, changed topic and occupied topic order are conflicts', () => {
  const { pack } = fixture();
  const storedEntry = { _id: pack.entries[0]!.id, ...pack.entries[0]!, meaningVi: 'Different meaning' };
  assert.throws(() => buildIdiomsPlan(pack, { entries: [storedEntry], topics: [] }), /Entry content conflict/);
  const changed = { _id: pack.topics[0]!.id, ...pack.topics[0]!, entryIds: [...pack.topics[0]!.entryIds].reverse() };
  assert.throws(() => buildIdiomsPlan(pack, { entries: [], topics: [changed] }), /Topic content conflict/);
  assert.throws(() => buildIdiomsPlan(pack, { entries: [], topics: [{ ...changed, id: 'other-idioms', _id: 'other-idioms' }] }), /order is occupied/);
});

test('Idioms: all preflight conflicts stop before apply, even in write mode', async () => {
  const { pack } = fixture(); let writes = 0;
  await assert.rejects(executeIdiomsImport({
    write: true, read: async () => ({ entries: [{ ...pack.entries[499]!, _id: pack.entries[499]!.id, meaningVi: 'Conflict late in preflight' }], topics: [] }),
    plan: s => buildIdiomsPlan(pack, s), transaction: async work => work(null), apply: async () => { writes++; },
  }), /Entry content conflict/);
  assert.equal(writes, 0);
});

test('Idioms: write failure rolls back in a simulated transaction boundary', async () => {
  const { pack } = fixture(); let state: IdiomsSnapshot = { entries: [], topics: [] };
  await assert.rejects(executeIdiomsImport({
    write: true, read: async () => state, plan: s => buildIdiomsPlan(pack, s),
    transaction: async work => { const before = structuredClone(state); try { return await work(null); } catch (e) { state = before; throw e; } },
    apply: async (_session, plan) => { state.entries.push({ _id: plan.entriesToInsert[0]!.id, ...plan.entriesToInsert[0]! }); throw new Error('Simulated topic insert failure'); },
  }), /Simulated topic insert failure/);
  assert.deepEqual(state, { entries: [], topics: [] });
});

test('Idioms CLI: offline validation does not load Mongo configuration or connect', async () => {
  const f = fixture(); const directory = await mkdtemp(join(tmpdir(), 'idioms-contract-'));
  try {
    await writeFile(join(directory, 'content.json'), f.bytes);
    await writeFile(join(directory, 'quality-report.json'), JSON.stringify(f.quality));
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'server/src/scripts/import-idioms.ts', '--package', join(directory, 'content.json'), '--validate-only'], { encoding: 'utf8', env: { ...process.env, MONGODB_URI: 'invalid-no-connection-allowed' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).databaseConnected, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
