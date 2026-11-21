import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { ClientSession } from 'mongodb';
import { z } from 'zod';
import { buildIdiomsPlan, executeIdiomsImport, idiomsPackageHash, validateIdiomsPackage } from './idioms-import-plan.js';

async function main() {
  let packageFile = '';
  let expectedHash = '';
  let approvalFile = '';
  let backupFile = '';
  let write = false;
  let dryRun = false;
  let validateOnly = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--write') write = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--validate-only') validateOnly = true;
    else if (arg === '--help') {
      console.log('library:import-idioms --package <content.json> [--validate-only | --dry-run | --write --expect-sha256 <sha> --approval <approval.json> --backup <new-file>]');
      return;
    } else if (['--package', '--expect-sha256', '--approval', '--backup'].includes(arg ?? '')) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (arg === '--package') packageFile = value;
      if (arg === '--expect-sha256') expectedHash = value;
      if (arg === '--approval') approvalFile = value;
      if (arg === '--backup') backupFile = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!packageFile) throw new Error('Specify --package <content.json>. There is no default package.');
  if ((write && (dryRun || validateOnly)) || (dryRun && validateOnly)) throw new Error('Choose a single operation mode.');
  if (write && (!expectedHash || !approvalFile || !backupFile)) throw new Error('Write requires checksum, explicit approval and a new backup file.');
  const bytes = await readFile(resolve(packageFile));
  const sha256 = idiomsPackageHash(bytes);
  if (expectedHash && expectedHash !== sha256) throw new Error('Package checksum changed.');
  const quality = JSON.parse(await readFile(resolve(dirname(packageFile), 'quality-report.json'), 'utf8'));
  const pack = validateIdiomsPackage(bytes, quality);
  if (write) {
    const approval = z.object({
      status: z.literal('approved-for-import'),
      packageSha256: z.literal(sha256),
      entryCount: z.literal(500),
      topicCount: z.literal(100),
      approvedBy: z.string().trim().min(1),
      approvedAt: z.iso.datetime(),
    }).strict();
    approval.parse(JSON.parse(await readFile(resolve(approvalFile), 'utf8')));
  }
  if (validateOnly) {
    console.log(JSON.stringify({ mode: 'offline-validation-only', sha256, entries: 500, topics: 100, databaseConnected: false }, null, 2));
    return;
  }
  // Loading Mongo configuration and connecting happens only after local preflight.
  const { client, connectMongo, closeMongo } = await import('../database/mongo.js');
  const { sharedEntries, sharedTopics } = await import('../modules/library/collections.js');
  try {
    await connectMongo();
    const read = async (session?: ClientSession) => ({
      entries: await sharedEntries.find({}, session ? { session } : {}).toArray(),
      topics: await sharedTopics.find({}, session ? { session } : {}).toArray(),
    });
    if (write) {
      const snapshot = await read();
      buildIdiomsPlan(pack, snapshot);
      await writeFile(resolve(backupFile), JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    }
    const result = await executeIdiomsImport<ClientSession>({
      write,
      read,
      plan: snapshot => buildIdiomsPlan(pack, snapshot),
      transaction: async work => {
        const session = client.startSession();
        try {
          const plan = await session.withTransaction(() => work(session), {
            readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary',
          });
          if (!plan) throw new Error('Transaction returned no import plan.');
          return plan;
        } finally { await session.endSession(); }
      },
      apply: async (session, plan) => {
        if (plan.entriesToInsert.length) await sharedEntries.insertMany(plan.entriesToInsert.map(e => ({ _id: e.id, ...e })), { session, ordered: true });
        if (plan.topicsToInsert.length) await sharedTopics.insertMany(plan.topicsToInsert.map(t => ({ _id: t.id, ...t })), { session, ordered: true });
      },
    });
    const pending = result.applied ? buildIdiomsPlan(pack, await read()) : result.plan;
    if (result.applied && (pending.entriesToInsert.length || pending.topicsToInsert.length)) throw new Error('Post-import reconciliation failed. Inspect before retrying.');
    console.log(JSON.stringify({
      mode: result.applied ? 'write-applied' : 'dry-run-read-only', sha256,
      entriesToInsert: result.plan.entriesToInsert.length, topicsToInsert: result.plan.topicsToInsert.length,
      existingEntries: result.plan.existingEntries, existingTopics: result.plan.existingTopics,
      pendingEntries: pending.entriesToInsert.length, pendingTopics: pending.topicsToInsert.length,
      oldTopicsUpdated: 0, personalDataUpdated: 0,
    }, null, 2));
  } finally { await closeMongo(); }
}

try { await main(); }
catch (error) { console.error(error instanceof Error ? error.message : 'Idioms preflight failed.'); process.exitCode = 1; }
