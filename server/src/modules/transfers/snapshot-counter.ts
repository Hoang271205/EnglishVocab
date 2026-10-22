import { db } from '../../database/mongo.js';

interface SnapshotCounter {
  _id: string;
  version: number;
}

export const snapshotCounters =
  db.collection<SnapshotCounter>('snapshot_counters');

export async function ensureSnapshotCounter() {
  await snapshotCounters.updateOne(
    { _id: 'extension' },
    { $setOnInsert: { version: 0 } },
    { upsert: true },
  );
}