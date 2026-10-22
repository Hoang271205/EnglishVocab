import { db } from '../../database/mongo.js';
export const userProgress = db.collection('user_progress');
export const reviewPreferences = db.collection('review_preferences');
export async function ensureProgressIndexes() {
    await userProgress.createIndex({ userId: 1, entryId: 1 }, { unique: true });
    await userProgress.createIndex({
        userId: 1,
        nextReviewAt: 1,
    });
    await reviewPreferences.createIndex({ userId: 1, entryId: 1 }, { unique: true });
}
