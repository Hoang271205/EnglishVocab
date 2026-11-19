import { z } from 'zod';
import { APP_ORIGIN } from './config';
import { entrySchema } from '../src/content/schema';
import { exampleSuggestionOutput } from '../src/dictionary/exampleSuggestion';
import type { ExampleSuggestionInput } from '../src/dictionary/exampleSuggestion';
export const connectionSchema = z
  .object({
    ownerId: z.string().min(1).max(128),
    apiOrigin: z.string().url(),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type CloudConnection = z.infer<typeof connectionSchema>;
export const extensionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type ExtensionUser = z.infer<typeof extensionUserSchema>;
const storedConnectionSchema = connectionSchema.extend({
  user: extensionUserSchema.optional(),
});

export class CloudRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
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
  const result = storedConnectionSchema.safeParse(stored.cloudConnection);
  return result.success &&
    result.data.apiOrigin === APP_ORIGIN &&
    result.data.expiresAt > Date.now()
    ? result.data
    : null;
}

export async function suggestExampleFromCloud(input: ExampleSuggestionInput) {
  const connection = await connectionState();
  if (!connection) return { sentence: null };
  const response = await fetch(`${APP_ORIGIN}/api/dictionary/example`, {
    method: 'POST',
    credentials: 'omit',
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${connection.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return { sentence: null };
  return exampleSuggestionOutput.parse(await response.json());
}
async function callCloud(connection: CloudConnection, item: unknown) {
  let response: Response;
  try {
    response = await fetch(`${APP_ORIGIN}/api/extension/captures`, {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${connection.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ item }),
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
    throw new CloudRequestError(
      response.status,
      error.success
        ? error.data.error.message
        : 'Server chưa xác nhận lưu từ. Hãy thử lại.',
    );
  }
  return body;
}
export async function rememberConnection(
  connection: CloudConnection,
  user: ExtensionUser,
) {
  if (connection.apiOrigin !== APP_ORIGIN)
    throw new Error(
      `Extension đang được build cho ${APP_ORIGIN}. Hãy build lại theo domain web đang dùng.`,
    );
  if (user.id !== connection.ownerId)
    throw new Error('Tài khoản kết nối không khớp.');
  if (connection.expiresAt <= Date.now())
    throw new Error('Phiên đăng nhập extension đã hết hạn.');
  await chrome.storage.local.set({ cloudConnection: { ...connection, user } });
}

export async function clearAccountSession() {
  await chrome.storage.local.set({
    cloudConnection: null,
    accountOwner: null,
    snapshot: null,
    lookupCache: [],
  });
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
  const result = savedSchema.parse(await callCloud(connection, item));
  if (result.ownerId !== connection.ownerId)
    throw new Error('Phản hồi lưu không khớp tài khoản.');
  return result;
}
