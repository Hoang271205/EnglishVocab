import { z } from 'zod';
import { APP_ORIGIN } from './config';
import { entrySchema } from '../src/content/schema';
export const connectionSchema = z
  .object({
    ownerId: z.string().min(1).max(128),
    apiOrigin: z.string().url(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type CloudConnection = z.infer<typeof connectionSchema>;
const savedSchema = z.object({
  saved: z.literal(true),
  duplicate: z.boolean(),
  ownerId: z.string(),
  entry: entrySchema,
});
let privateStorageInitialization: Promise<void> | undefined;

// Initialize inside a message event, after Chrome has activated this worker.
// Share concurrent calls, but allow a later message to retry a failed setup.
export function initializePrivateStorage(): Promise<void> {
  privateStorageInitialization ??= chrome.storage.local
    .setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
    .catch((cause: unknown) => {
      privateStorageInitialization = undefined;
      throw cause;
    });
  return privateStorageInitialization;
}
export async function connectionState() {
  const stored = await chrome.storage.local.get('cloudConnection');
  const result = connectionSchema.safeParse(stored.cloudConnection);
  return result.success &&
    result.data.apiOrigin === APP_ORIGIN &&
    result.data.expiresAt > Date.now()
    ? result.data
    : null;
}
async function callCloud(
  connection: CloudConnection,
  path: '/api/extension/me' | '/api/extension/captures',
  item?: unknown,
) {
  let response: Response;
  try {
    response = await fetch(`${APP_ORIGIN}${path}`, {
      method: item === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${connection.token}`,
        Accept: 'application/json',
        ...(item === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(item === undefined ? {} : { body: JSON.stringify({ item }) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      `Chưa xác nhận lưu được từ. Kiểm tra mạng/server ${APP_ORIGIN}, rồi bấm Thử lưu lại. Không có hàng đợi offline.`,
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(body);
    throw new Error(
      error.success
        ? error.data.error.message
        : 'Server chưa xác nhận lưu từ. Hãy thử lại.',
    );
  }
  return body;
}
export async function installConnection(input: unknown) {
  const connection = connectionSchema.parse(input);
  if (connection.apiOrigin !== APP_ORIGIN)
    throw new Error(
      `Extension đang được build cho ${APP_ORIGIN}. Hãy build lại theo domain web đang dùng.`,
    );
  const verified = z
    .object({ ownerId: z.string(), expiresAt: z.number() })
    .parse(await callCloud(connection, '/api/extension/me'));
  if (verified.ownerId !== connection.ownerId)
    throw new Error('Tài khoản kết nối không khớp.');
  await chrome.storage.local.set({ cloudConnection: connection });
  return connection;
}
export async function saveToCloud(
  item: unknown,
  expectedOwner: string | null | undefined,
) {
  const connection = await connectionState();
  if (!connection)
    throw new Error(
      'Hãy bấm icon EnglishVocab trên Chrome và đăng nhập trước khi lưu từ.',
    );
  if (expectedOwner !== undefined && expectedOwner !== connection.ownerId)
    throw new Error(
      'Tài khoản đã thay đổi. Hãy đóng popup và tra lại trước khi lưu.',
    );
  const result = savedSchema.parse(
    await callCloud(connection, '/api/extension/captures', item),
  );
  if (result.ownerId !== connection.ownerId)
    throw new Error('Phản hồi lưu không khớp tài khoản.');
  return result;
}
