import { userProgress, reviewPreferences } from './collections.js';

export async function progressSummary(userId: string, now: number) {
  const [levels, disabled, upcoming] = await Promise.all([
    // Return at most five rows instead of materialising every progress record in Node.
    userProgress
      .aggregate<{ _id: number; count: number; due: number }>([
        { $match: { userId } },
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 },
            due: { $sum: { $cond: [{ $lte: ['$nextReviewAt', now] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    // Join only disabled preferences, rather than looking up a preference for every word.
    reviewPreferences
      .aggregate<{ count: number; due: number }>([
        { $match: { userId, reviewEnabled: false } },
        {
          $lookup: {
            from: userProgress.collectionName,
            localField: 'entryId',
            foreignField: 'entryId',
            pipeline: [
              { $match: { userId } },
              { $project: { nextReviewAt: 1 } },
            ],
            as: 'progress',
          },
        },
        { $unwind: '$progress' },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            due: {
              $sum: {
                $cond: [{ $lte: ['$progress.nextReviewAt', now] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    // Walk the date index until the first future, enabled word. No full queue is returned.
    userProgress
      .aggregate<{ nextReviewAt: number }>([
        { $match: { userId, nextReviewAt: { $gt: now } } },
        { $sort: { nextReviewAt: 1, entryId: 1 } },
        {
          $lookup: {
            from: reviewPreferences.collectionName,
            localField: 'entryId',
            foreignField: 'entryId',
            pipeline: [
              { $match: { userId, reviewEnabled: false } },
              { $project: { _id: 1 } },
            ],
            as: 'disabled',
          },
        },
        { $match: { 'disabled.0': { $exists: false } } },
        { $limit: 1 },
        { $project: { _id: 0, nextReviewAt: 1 } },
      ])
      .toArray(),
  ]);
  const learnedCount = levels.reduce((sum, row) => sum + row.count, 0);
  const disabledCount = Math.min(learnedCount, disabled[0]?.count ?? 0);
  return {
    learnedCount,
    masteredCount: levels.find((row) => row._id === 5)?.count ?? 0,
    enabledCount: learnedCount - disabledCount,
    disabledCount,
    // Independent read queries may overlap a deletion in another tab.
    dueCount: Math.max(
      0,
      Math.min(
        learnedCount - disabledCount,
        levels.reduce((sum, row) => sum + row.due, 0) - (disabled[0]?.due ?? 0),
      ),
    ),
    nextReviewAt: upcoming[0]?.nextReviewAt ?? null,
    levels: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      ...Object.fromEntries(levels.map((row) => [row._id, row.count])),
    },
    serverTime: now,
  };
}
