import type { Progress } from '../../../../src/domain/types.js';
import { db } from '../../database/mongo.js';

export interface UserProgress extends Progress {
  userId: string;
}

export interface ReviewPreference {
  _id: string;
  userId: string;
  entryId: string;
  reviewEnabled: boolean;
  updatedAt: number;
}

export const userProgress = db.collection<UserProgress>('user_progress');

export const reviewPreferences =
  db.collection<ReviewPreference>('review_preferences');

export async function ensureProgressIndexes() {
  await userProgress.createIndex({ userId: 1, entryId: 1 }, { unique: true });

  await userProgress.createIndex({
    userId: 1,
    nextReviewAt: 1,
  });

  await reviewPreferences.createIndex(
    { userId: 1, entryId: 1 },
    { unique: true },
  );
}
