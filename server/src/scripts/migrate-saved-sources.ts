import { isDeepStrictEqual } from 'node:util';
import { client, db, connectMongo, closeMongo } from '../database/mongo.js';
import { personalEntries } from '../modules/personal/collections.js';
import { sharedEntries } from '../modules/library/collections.js';
import { userProgress } from '../modules/progress/collections.js';
import { enrollSavedEntry } from '../modules/transfers/enroll-saved-entry.js';
import type { Entry } from '../../../src/domain/types.js';

const apply = process.argv.includes('--apply');
const drop = process.argv.includes('--drop-legacy');
const legacy = db.collection<{ _id: string; userId: string; entryId: string }>(
  'saved_sources',
);
try {
  await connectMongo();
  const exists =
    (await db.listCollections({ name: 'saved_sources' }).toArray()).length > 0;
  const sources = exists ? await legacy.find().toArray() : [];
  const links = [
    ...new Map(
      sources.map((row) => [JSON.stringify([row.userId, row.entryId]), row]),
    ).values(),
  ];
  const ready: { userId: string; entry: Entry }[] = [];
  let drafts = 0;
  let alreadyLearned = 0;
  let missing = 0;
  for (const link of links) {
    const personal = await personalEntries.findOne({
      userId: link.userId,
      'entry.id': link.entryId,
    });
    const entry =
      personal?.entry ?? (await sharedEntries.findOne({ _id: link.entryId }));
    if (!entry) {
      missing++;
      continue;
    }
    if (entry.contentStatus !== 'ready') {
      drafts++;
      continue;
    }
    if (await userProgress.findOne({ userId: link.userId, entryId: entry.id }))
      alreadyLearned++;
    ready.push({ userId: link.userId, entry });
  }
  console.log(
    JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      sourceDocuments: sources.length,
      ready: ready.length,
      alreadyLearned,
      draftsRetained: drafts,
      missingEntries: missing,
    }),
  );
  if (missing)
    throw new Error(
      'Some source records have no entry. Refusing to drop until reviewed.',
    );
  if (apply) {
    await client.withSession((session) =>
      session.withTransaction(async () => {
        for (const item of ready) {
          const personal = await personalEntries.findOne(
            { userId: item.userId, 'entry.id': item.entry.id },
            { session },
          );
          const entry =
            personal?.entry ??
            (await sharedEntries.findOne({ _id: item.entry.id }, { session }));
          if (!entry) throw new Error('Entry changed during migration.');
          await enrollSavedEntry(item.userId, entry, session);
        }
      }),
    );
    if (drop && exists) {
      const current = await legacy.find().toArray();
      const order = <T extends { _id: string }>(rows: T[]) =>
        rows.sort((a, b) => a._id.localeCompare(b._id));
      if (!isDeepStrictEqual(order(sources), order(current)))
        throw new Error('Sources changed during migration; refusing to drop.');
      await legacy.drop();
      console.log(
        'Dropped saved_sources. Entries, existing levels and review preferences are preserved.',
      );
    }
  } else if (drop) throw new Error('--drop-legacy requires --apply.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Migration failed.');
  process.exitCode = 1;
} finally {
  await closeMongo();
}
