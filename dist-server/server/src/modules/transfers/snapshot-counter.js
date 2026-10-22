import { db } from '../../database/mongo.js';
export const snapshotCounters = db.collection('snapshot_counters');
export async function ensureSnapshotCounter() {
    await snapshotCounters.updateOne({ _id: 'extension' }, { $setOnInsert: { version: 0 } }, { upsert: true });
}
