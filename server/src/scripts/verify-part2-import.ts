import { readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { connectMongo, closeMongo } from '../database/mongo.js';
import { sharedEntries, sharedTopics } from '../modules/library/collections.js';
import type { Part2Snapshot } from './part2-import-plan.js';
import { buildPart2Plan } from './part2-import-plan.js';
import type { Topic } from '../../../src/domain/types.js';

// Explicitly read-only on MongoDB. Only the local verification report is written.
const root = 'content/crawl/part2-release-2026-11-20';
try {
  const before: Part2Snapshot = JSON.parse(await readFile(`${root}/db-shared-before-import.json`, 'utf8'));
  const pack: unknown = JSON.parse(await readFile(`${root}/content.json`, 'utf8'));
  const catalog: Topic[] = JSON.parse(await readFile('content/catalog.json', 'utf8'));
  await connectMongo();
  const snapshot: Part2Snapshot = {
    entries: await sharedEntries.find({}).toArray(),
    topics: await sharedTopics.find({}).toArray(),
  };
  const entries = new Map(snapshot.entries.map(e => [e._id, e]));
  const topics = new Map(snapshot.topics.map(t => [t._id, t]));
  const changedOriginalEntries = before.entries.filter(e => !isDeepStrictEqual(e, entries.get(e._id))).map(e => e.id);
  const changedOriginalTopics = before.topics.filter(t => !isDeepStrictEqual(t, topics.get(t._id))).map(t => t.id);
  const plan = buildPart2Plan({ package: pack, catalog, snapshot });
  const extensions = snapshot.topics.filter(t => t.part === 2);
  const summary = {
    originalEntryCount: before.entries.length,
    originalTopicCount: before.topics.length,
    originalEntriesUnchanged: changedOriginalEntries.length === 0,
    originalTopicsUnchanged: changedOriginalTopics.length === 0,
    changedOriginalEntries,
    changedOriginalTopics,
    totalSharedEntries: snapshot.entries.length,
    totalSharedTopics: snapshot.topics.length,
    part2Topics: extensions.length,
    part2TopicsAtTen: extensions.filter(t => t.entryIds.length === 10).length,
    part2ByCollection: {
      ielts: extensions.filter(t => t.collectionId === 'ielts').length,
      daily: extensions.filter(t => t.collectionId === 'daily').length,
    },
    incomingEntriesPresentAndIdentical: plan.existingEntries,
    incomingTopicsPresentAndIdentical: plan.existingTopics,
    pendingEntries: plan.entriesToInsert.length,
    pendingTopics: plan.topicsToInsert.length,
    databaseWrites: 0,
  };
  await writeFile(`${root}/db-verification.json`, JSON.stringify(summary, null, 2) + '\n', {flag:'wx'});
  console.log(JSON.stringify(summary, null, 2));
  if (changedOriginalEntries.length || changedOriginalTopics.length || plan.entriesToInsert.length || plan.topicsToInsert.length || extensions.length !== 200 || extensions.some(t => t.entryIds.length !== 10)) throw new Error('Post-import verification failed; inspect db-verification.json.');
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Verification failed.');
  process.exitCode = 1;
} finally {
  await closeMongo();
}
