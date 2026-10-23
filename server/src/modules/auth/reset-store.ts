import { db } from '../../database/mongo.js';

export const passwordResets = db.collection<{
  _id: string;
  tokenHash: string;
  requestedAt: Date;
  expiresAt: Date;
}>('password_resets');

export async function ensurePasswordResetIndexes() {
  await passwordResets.createIndex({ tokenHash: 1 }, { unique: true });
  await passwordResets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
