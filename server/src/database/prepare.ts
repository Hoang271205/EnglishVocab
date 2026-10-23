import { db, connectMongo } from './mongo.js';
import { ensureUserIndexes } from '../modules/auth/users.js';
import { ensurePasswordResetIndexes } from '../modules/auth/reset-store.js';
import { ensureExtensionIndexes } from '../modules/extension/access.js';
import { ensurePersonalIndexes } from '../modules/personal/collections.js';
import { ensureLibraryIndexes } from '../modules/library/collections.js';
import { ensureProgressIndexes } from '../modules/progress/collections.js';
import { ensureStudyIndexes } from '../modules/study/collections.js';
import { ensureTransferIndexes } from '../modules/transfers/collections.js';
import { ensureSnapshotCounter } from '../modules/transfers/snapshot-counter.js';

export async function prepareDatabase() {
  await connectMongo();
  // The session store does not run schema changes during Vercel cold starts.
  await db
    .collection('auth_sessions')
    .createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
  await ensureUserIndexes();
  await ensurePasswordResetIndexes();
  await ensureExtensionIndexes();
  await ensurePersonalIndexes();
  await ensureLibraryIndexes();
  await ensureProgressIndexes();
  await ensureStudyIndexes();
  await ensureTransferIndexes();
  await ensureSnapshotCounter();
}
