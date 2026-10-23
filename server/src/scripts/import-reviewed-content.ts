import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ClientSession } from 'mongodb';
import { z } from 'zod';
import { contentSchema, topicSchema } from '../../../src/content/schema.js';
import type { Topic } from '../../../src/domain/types.js';
import {
  client,
  closeMongo,
  connectMongo,
} from '../database/mongo.js';
import { sharedEntries, sharedTopics } from '../modules/library/collections.js';
import { loadSharedContent } from './load-shared-content.js';
import { loadReviewedPackage, validateReviewedPackageAgainstCatalog } from './load-reviewed-package.js';
import {
  buildReviewedImportPlan,
  type ImportSnapshot,
  type ReviewedPackage,
  type StoredEntry,
  type StoredTopic,
} from './review-import-plan.js';
import { runReviewedImport } from './review-import-executor.js';

const defaultPackage = 'content/crawl/review-2026-10-24-mongodb-ready';

function parseArgs(args: string[]) {
  let packageDirectory = defaultPackage;
  let write = false;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--package') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--package cần đường dẫn thư mục.');
      packageDirectory = value;
      index += 1;
    } else if (arg === '--write') {
      write = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Dùng: npm run library:import-reviewed -- [--package <thư-mục>] [--dry-run | --write]');
      process.exit(0);
    } else {
      throw new Error(`Tham số không nhận diện: ${arg}`);
    }
  }
  if (write && dryRun) throw new Error('Chọn --dry-run hoặc --write, không dùng đồng thời.');
  return {packageDirectory, write};
}

async function loadCatalog(): Promise<Topic[]> {
  return z.array(topicSchema).parse(
    JSON.parse(await readFile(resolve('content/catalog.json'), 'utf8')),
  );
}

async function readSnapshot(
  reviewed: ReviewedPackage,
  session?: ClientSession,
): Promise<ImportSnapshot> {
  const topicIds = reviewed.topicRows.map((topic) => topic.topicId);
  const topicOptions = session ? {session} : {};
  const topics = await sharedTopics
    .find({_id: {$in: topicIds}}, topicOptions)
    .toArray() as StoredTopic[];
  const incomingIds = reviewed.topicRows.flatMap((topic) => topic.proposedAdditions.map((entry) => entry.entryId));
  const allRelevantEntryIds = [...new Set([
    ...incomingIds,
    ...topics.flatMap((topic) => topic.entryIds),
  ])];
  const entries = await sharedEntries
    .find({_id: {$in: allRelevantEntryIds}}, topicOptions)
    .toArray() as StoredEntry[];
  return {entries, topics};
}

async function main() {
  const {packageDirectory, write} = parseArgs(process.argv.slice(2));
  const catalog = await loadCatalog();
  const currentContent = contentSchema.parse(await loadSharedContent());
  const reviewed = await loadReviewedPackage(packageDirectory);
  validateReviewedPackageAgainstCatalog(reviewed, catalog);

  await connectMongo();
  const operation = await runReviewedImport<ClientSession>({
    write,
    readSnapshot: (session) => readSnapshot(reviewed, session),
    buildPlan: (snapshot) => buildReviewedImportPlan({catalog, currentContent, reviewed, snapshot}),
    withTransaction: async (work) => {
      const session = client.startSession();
      try {
        const result = await session.withTransaction(
          () => work(session),
          {
            readConcern: {level: 'snapshot'},
            writeConcern: {w: 'majority'},
            readPreference: 'primary',
          },
        );
        if (result === undefined) throw new Error('Transaction không trả về kế hoạch nhập.');
        return result;
      } finally {
        await session.endSession();
      }
    },
    apply: async (session, plan) => {
      // Preflight finishes before the first write. Inserts are new-only; topic arrays only append.
      if (plan.entriesToInsert.length) {
        await sharedEntries.insertMany(
          plan.entriesToInsert.map((entry) => ({_id: entry.id, ...entry})),
          {session, ordered: true},
        );
      }
      for (const update of plan.topicsToAppend) {
        const result = await sharedTopics.updateOne(
          {_id: update.topicId, entryIds: update.entryIdsBefore},
          {$push: {entryIds: {$each: update.entryIdsToAdd}}},
          {session},
        );
        if (result.matchedCount !== 1) {
          throw new Error(`Topic ${update.topicId} đổi đồng thời; transaction sẽ rollback.`);
        }
      }
    },
  });
  const plan = operation.plan;

  console.log(JSON.stringify({
    mode: operation.applied ? 'write-applied' : 'dry-run-read-only',
    packageDirectory: resolve(packageDirectory),
    scope: 'IELTS 56–100 and Daily 11–100',
    topicCount: plan.topicCount,
    additionReferences: plan.additionReferences,
    uniqueAdditionEntryIds: plan.uniqueAdditionEntryIds,
    entriesToInsert: plan.entriesToInsert.length,
    entriesAlreadyPresent: plan.entriesAlreadyPresent.length,
    topicsToAppend: plan.topicsToAppend.length,
    topicLinksToAppend: plan.topicsToAppend.reduce((sum, topic) => sum + topic.entryIdsToAdd.length, 0),
    unchangedTopics: plan.unchangedTopics,
    resultingTopicLinks: plan.resultingTopicLinks,
    maxTopicSize: plan.maximumTopicSize,
    note: operation.applied ? 'Import đã hoàn tất trong transaction.' : 'Chỉ đọc; chưa ghi database. Chạy lại với --write chỉ sau khi duyệt kế hoạch.',
  }, null, 2));
}

try {
  await main();
} catch (cause: unknown) {
  console.error(cause instanceof Error ? cause.message : 'Không thể tạo kế hoạch nhập.');
  process.exitCode = 1;
} finally {
  await closeMongo();
}
