import { db } from '../../database/mongo.js';
export const personalEntries = db.collection('personal_entries');
export async function ensurePersonalIndexes() {
    await personalEntries.createIndex({ userId: 1, 'entry.id': 1 }, { unique: true });
    await personalEntries.createIndex({
        userId: 1,
        createdAt: -1,
    });
}
