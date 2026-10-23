import { isDeepStrictEqual } from 'node:util';
import { client, db, connectMongo, closeMongo } from '../database/mongo.js';
import { sharedTopics } from '../modules/library/collections.js';
import { userProgress } from '../modules/progress/collections.js';
import { studySessions } from '../modules/study/collections.js';
import { topicLearning } from '../modules/study/topic-learning.js';

const apply = process.argv.includes('--apply');
const dropLegacy = process.argv.includes('--drop-legacy');
const legacy = db.collection<{ _id: string; userId: string; entryId: string }>(
  'known_words',
);

try {
  await connectMongo();
  const legacyExists =
    (await db.listCollections({ name: 'known_words' }).toArray()).length > 0;
  const oldRows = legacyExists ? await legacy.find().toArray() : [];
  const topics = await sharedTopics.find().toArray();
  const progresses = await userProgress
    .find({}, { projection: { userId: 1, entryId: 1 } })
    .toArray();
  const processed = new Map<string, Set<string>>();
  for (const row of [...oldRows, ...progresses]) {
    const ids = processed.get(row.userId) ?? new Set<string>();
    ids.add(row.entryId);
    processed.set(row.userId, ids);
  }
  const plan: { userId: string; topicId: string; nextIndex: number }[] = [];
  for (const [userId, ids] of processed) {
    for (const topic of topics) {
      // A cursor can only cover a consecutive prefix: never skip an unseen word.
      let nextIndex = 0;
      while (
        nextIndex < topic.entryIds.length &&
        ids.has(topic.entryIds[nextIndex]!)
      )
        nextIndex++;
      if (nextIndex) plan.push({ userId, topicId: topic.id, nextIndex });
    }
  }
  const partialLegacy = oldRows.filter((row) =>
    topics.some((topic) => {
      const index = topic.entryIds.indexOf(row.entryId);
      const prefix =
        plan.find((p) => p.userId === row.userId && p.topicId === topic.id)
          ?.nextIndex ?? 0;
      return index >= prefix && index >= 0;
    }),
  ).length;
  console.log(
    JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      legacyRecords: oldRows.length,
      topicCursors: plan.length,
      nonConsecutiveLegacyRecords: partialLegacy,
      note: 'Non-consecutive skipped words may appear again until their topic is completed.',
    }),
  );
  if (apply) {
    await topicLearning.createIndex(
      { userId: 1, topicId: 1 },
      { unique: true },
    );
    await client.withSession((mongoSession) =>
      mongoSession.withTransaction(async () => {
        for (const cursor of plan) {
          await topicLearning.updateOne(
            { _id: JSON.stringify([cursor.userId, cursor.topicId]) },
            {
              $set: {
                userId: cursor.userId,
                topicId: cursor.topicId,
                updatedAt: Date.now(),
              },
              $max: { nextIndex: cursor.nextIndex },
            },
            { upsert: true, session: mongoSession },
          );
        }
        // Rename only session flags; do not create word progress or review events.
        const sessions = await studySessions
          .find({ mode: 'learn' }, { session: mongoSession })
          .toArray();
        for (const study of sessions) {
          if (study.mode !== 'learn') continue;
          let changed = false;
          for (const item of study.items) {
            const legacyItem = item as typeof item & { known?: boolean };
            if ('known' in legacyItem) {
              if (legacyItem.known) item.skipped = true;
              delete legacyItem.known;
              changed = true;
            }
          }
          if (changed) {
            study.version++;
            await studySessions.replaceOne({ _id: study._id }, study, {
              session: mongoSession,
            });
          }
        }
      }),
    );
    if (dropLegacy && legacyExists) {
      const currentRows = await legacy.find().toArray();
      const order = <T extends { _id: string }>(rows: T[]) =>
        rows.sort((a, b) => a._id.localeCompare(b._id));
      if (!isDeepStrictEqual(order(oldRows), order(currentRows)))
        throw new Error(
          'Legacy data changed during migration; refusing to drop. Stop old server and retry.',
        );
      await legacy.drop();
      console.log('Dropped known_words after migrating topic cursors.');
    }
  } else if (dropLegacy) {
    throw new Error('--drop-legacy requires --apply.');
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Topic migration failed.',
  );
  process.exitCode = 1;
} finally {
  await closeMongo();
}
