import type { Entry } from '../../../../src/domain/types.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
import { userProgress, reviewPreferences } from '../progress/collections.js';
import { importReceipts } from '../transfers/collections.js';

export async function notebookDetail(userId: string, entryId: string) {
  const [progress, preference, personal, captured] = await Promise.all([
    userProgress.findOne(
      { userId, entryId },
      { projection: { _id: 0, userId: 0 } },
    ),
    reviewPreferences.findOne(
      { userId, entryId },
      { projection: { reviewEnabled: 1 } },
    ),
    personalEntries.findOne(
      { userId, 'entry.id': entryId },
      { projection: { entry: 1 } },
    ),
    importReceipts.findOne(
      { userId, entryId, deleted: false },
      { projection: { _id: 1 } },
    ),
  ]);
  if (!personal && !progress && !captured) return null;
  const entry: Entry | null =
    personal?.entry ??
    (await sharedEntries.findOne({ _id: entryId }, { projection: { _id: 0 } }));
  return entry
    ? {
        entry,
        progress,
        reviewEnabled: preference?.reviewEnabled ?? true,
        saved: Boolean(captured),
      }
    : null;
}

export async function lookupNotebook(
  userId: string,
  word: string,
): Promise<Entry[]> {
  const collation = { locale: 'en', strength: 2 };
  const [personal, shared] = await Promise.all([
    personalEntries
      .find(
        { userId, 'entry.headword': word },
        { collation, projection: { entry: 1 } },
      )
      .limit(20)
      .toArray(),
    sharedEntries
      .find({ headword: word }, { collation, projection: { _id: 0 } })
      .limit(20)
      .toArray(),
  ]);
  const ids = shared.map((entry) => entry.id);
  if (!ids.length) return personal.map((item) => item.entry);
  const [progress, captures] = await Promise.all([
    userProgress
      .find({ userId, entryId: { $in: ids } }, { projection: { entryId: 1 } })
      .toArray(),
    importReceipts.distinct('entryId', {
      userId,
      entryId: { $in: ids },
      deleted: false,
    }),
  ]);
  const allowed = new Set([
    ...progress.map((item) => item.entryId),
    ...captures,
  ]);
  return [
    ...personal.map((item) => item.entry),
    ...shared.filter((entry) => allowed.has(entry.id)),
  ];
}
