import { createHash, randomBytes } from 'node:crypto';
import type { ClientSession } from 'mongodb';
import { db } from '../../database/mongo.js';
import { users } from '../auth/users.js';
interface ExtensionGrant {
  _id: string;
  userId: string;
  sessionId: string | null;
  deviceId: string;
  tokenHash: string;
  expiresAt: Date;
  writes: number;
  authVersion?: number;
}
export const extensionGrants =
  db.collection<ExtensionGrant>('extension_grants');
const sessions = db.collection<{ _id: string; expires: Date }>('auth_sessions');
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export class ExtensionAccessError extends Error {}
export async function ensureExtensionIndexes() {
  await extensionGrants.createIndex({ tokenHash: 1 }, { unique: true });
  await extensionGrants.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await extensionGrants.createIndex({ sessionId: 1 });
}
export async function issueExtensionGrant(
  userId: string,
  sessionId: string,
  deviceId: string,
  sessionExpires: Date | undefined,
  authVersion = 0,
) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Math.min(
      sessionExpires?.getTime() ?? Infinity,
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ),
  );
  const grant: ExtensionGrant = {
    _id: digest(`${sessionId}:${deviceId}`),
    userId,
    sessionId,
    deviceId,
    tokenHash: digest(token),
    expiresAt,
    writes: 0,
    authVersion,
  };
  await extensionGrants.replaceOne({ _id: grant._id }, grant, { upsert: true });
  return { token, expiresAt: expiresAt.getTime() };
}
export async function authenticateExtension(authorization: string | undefined) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (!match?.[1])
    throw new ExtensionAccessError(
      'Hãy đăng nhập trong extension trước khi lưu.',
    );
  const grant = await extensionGrants.findOne({
    tokenHash: digest(match[1]),
    expiresAt: { $gt: new Date() },
  });
  if (!grant)
    throw new ExtensionAccessError(
      'Kết nối đã hết hạn. Hãy đăng nhập lại trong extension.',
    );
  const [user, session] = await Promise.all([
    users.findOne(
      { _id: grant.userId, active: true },
      { projection: { _id: 1, authVersion: 1 } },
    ),
    grant.sessionId === null
      ? Promise.resolve(true)
      : sessions.findOne(
          {
            _id: grant.sessionId,
            expires: { $gt: new Date() },
          },
          { projection: { _id: 1 } },
        ),
  ]);
  if (!user || !session || (grant.authVersion ?? 0) !== (user.authVersion ?? 0))
    throw new ExtensionAccessError(
      'Phiên đăng nhập đã kết thúc. Hãy đăng nhập lại trong extension.',
    );
  return grant;
}
export async function touchExtensionGrant(
  grant: ExtensionGrant,
  session: ClientSession,
) {
  // A concurrent logout/rotation invalidates this write within the transaction.
  const result = await extensionGrants.updateOne(
    {
      _id: grant._id,
      tokenHash: grant.tokenHash,
      expiresAt: { $gt: new Date() },
    },
    { $inc: { writes: 1 } },
    { session },
  );
  if (result.matchedCount !== 1)
    throw new ExtensionAccessError(
      'Kết nối đã thay đổi. Hãy kết nối lại extension.',
    );
}
export async function revokeSessionExtensions(sessionId: string) {
  await extensionGrants.deleteMany({ sessionId });
}
export async function issueNativeExtensionGrant(
  userId: string,
  deviceId: string,
  authVersion = 0,
) {
  const token = randomBytes(32).toString('base64url');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const grant: ExtensionGrant = {
    _id: digest(`native-extension:${deviceId}`),
    userId,
    sessionId: null,
    deviceId,
    tokenHash: digest(token),
    expiresAt,
    writes: 0,
    authVersion,
  };

  // Đăng nhập lại trên cùng extension sẽ thay token cũ.
  await extensionGrants.replaceOne({ _id: grant._id }, grant, { upsert: true });

  return {
    token,
    expiresAt: expiresAt.getTime(),
  };
}

export async function revokeExtensionGrant(authorization: string | undefined) {
  const grant = await authenticateExtension(authorization);

  await extensionGrants.deleteOne({
    _id: grant._id,
    tokenHash: grant.tokenHash,
  });
}
