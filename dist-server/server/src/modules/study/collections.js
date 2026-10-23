import { db } from '../../database/mongo.js';
export const studySessions = db.collection('study_sessions');
export const studyReceipts = db.collection('study_receipts');
export async function ensureStudyIndexes() {
    await studySessions.createIndex({ userId: 1 }, {
        unique: true,
        partialFilterExpression: { active: true },
    });
    await studySessions.createIndex({
        userId: 1,
        createdAt: -1,
    });
    await studyReceipts.createIndex({
        userId: 1,
        sessionId: 1,
    });
}
