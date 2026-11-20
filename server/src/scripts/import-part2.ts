import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ClientSession } from 'mongodb';
import { z } from 'zod';
import { topicSchema } from '../../../src/content/schema.js';
import { client, connectMongo, closeMongo } from '../database/mongo.js';
import { sharedEntries, sharedTopics } from '../modules/library/collections.js';
import { buildPart2Plan, executePart2Import } from './part2-import-plan.js';

async function main() {
  const args = process.argv.slice(2);
  let packageFile = '';
  let write = false;
  let expected = '';
  let report = '';
  let backup = '';
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--write') write = true;
    else if (arg === '--dry-run') {
      if (args.includes('--write')) throw new Error('Choose dry-run OR write.');
    } else if (
      ['--package', '--expect-sha256', '--report', '--backup'].includes(
        arg ?? '',
      )
    ) {
      const value = args[++i];
      if (!value || value.startsWith('--'))
        throw new Error(`Missing value: ${arg}`);
      if (arg === '--package') packageFile = value;
      if (arg === '--expect-sha256') expected = value;
      if (arg === '--report') report = value;
      if (arg === '--backup') backup = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!packageFile)
    throw new Error(
      'Use --package <approved-content.json>; default mode only reads the database.',
    );
  const bytes = await readFile(resolve(packageFile));
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (expected && expected !== checksum)
    throw new Error('Package checksum changed.');
  if (write && (!expected || !backup))
    throw new Error('Write requires --expect-sha256 and --backup <new-file>.');
  const pack: unknown = JSON.parse(bytes.toString('utf8'));
  const catalog = z
    .array(topicSchema)
    .parse(JSON.parse(await readFile(resolve('content/catalog.json'), 'utf8')));
  const approval = JSON.parse(
    await readFile(resolve(packageFile, '..', 'approval.json'), 'utf8'),
  ) as { sha256?: string; reviewedEntryCount?: number; status?: string };
  if (
    approval.sha256 !== checksum ||
    approval.reviewedEntryCount !== 2000 ||
    approval.status !== 'approved-authored'
  )
    throw new Error(
      'Package needs a matching, complete authored-content approval record.',
    );
  await connectMongo();
  const read = async (session?: ClientSession) => ({
    entries: await sharedEntries.find({}, session ? { session } : {}).toArray(),
    topics: await sharedTopics.find({}, session ? { session } : {}).toArray(),
  });
  // Save only the two shared content collections. No user data is exported or modified.
  if (write) {
    const snapshot = await read();
    buildPart2Plan({ package: pack, catalog, snapshot });
    await writeFile(resolve(backup), JSON.stringify(snapshot, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
  }
  const result = await executePart2Import<ClientSession>({
    write,
    read,
    plan: (snapshot) => buildPart2Plan({ package: pack, catalog, snapshot }),
    transaction: async (work) => {
      const session = client.startSession();
      try {
        const plan = await session.withTransaction(() => work(session), {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
        });
        if (!plan) throw new Error('Transaction returned no plan.');
        return plan;
      } finally {
        await session.endSession();
      }
    },
    apply: async (session, plan) => {
      if (plan.entriesToInsert.length)
        await sharedEntries.insertMany(
          plan.entriesToInsert.map((e) => ({ _id: e.id, ...e })),
          { session, ordered: true },
        );
      if (plan.topicsToInsert.length)
        await sharedTopics.insertMany(
          plan.topicsToInsert.map((t) => ({ _id: t.id, ...t })),
          { session, ordered: true },
        );
    },
  });
  const verification = buildPart2Plan({
    package: pack,
    catalog,
    snapshot: await read(),
  });
  if (
    write &&
    (verification.entriesToInsert.length || verification.topicsToInsert.length)
  )
    throw new Error(
      'Post-import verification incomplete; inspect report before retrying.',
    );
  const summary = {
    mode: result.applied ? 'write-applied' : 'dry-run-read-only',
    sha256: checksum,
    entriesToInsert: result.plan.entriesToInsert.length,
    topicsToInsert: result.plan.topicsToInsert.length,
    entriesAlreadyPresent: result.plan.existingEntries,
    topicsAlreadyPresent: result.plan.existingTopics,
    pendingAfterOperation: {
      entries: verification.entriesToInsert.length,
      topics: verification.topicsToInsert.length,
    },
    originalTopicsUpdated: 0,
    personalCollectionsUpdated: 0,
  };
  if (report)
    await writeFile(resolve(report), JSON.stringify(summary, null, 2) + '\n', {
      flag: 'wx',
    });
  console.log(JSON.stringify(summary, null, 2));
}
try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Part 2 import failed.');
  process.exitCode = 1;
} finally {
  await closeMongo();
}
