import { z } from 'zod';
import { APP_ORIGIN } from './config';
import {
  clearAccountSession,
  connectionSchema,
  connectionState,
  extensionUserSchema,
  rememberConnection,
} from './cloud';
import type { ExtensionUser } from './cloud';
export type { ExtensionUser } from './cloud';

export interface ExtensionCredentials {
  email: string;
  password: string;
}

class AccountApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function accountRequest(
  path: '/login' | '/me' | '/logout',
  body?: unknown,
  token?: string,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${APP_ORIGIN}/api/extension/auth${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',

      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },

      ...(body === undefined ? {} : { body: JSON.stringify(body) }),

      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error(`Không kết nối được server ${APP_ORIGIN}.`);
  }

  if (response.status === 204) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = z
      .object({
        error: z.object({
          message: z.string(),
        }),
      })
      .safeParse(payload);

    throw new AccountApiError(
      response.status,
      parsed.success
        ? parsed.data.error.message
        : 'Không xử lý được yêu cầu tài khoản.',
    );
  }

  return payload;
}

async function getDeviceId() {
  const stored = await chrome.storage.local.get('extensionDeviceId');

  const parsed = z.uuid().safeParse(stored.extensionDeviceId);

  if (parsed.success) {
    return parsed.data;
  }

  const deviceId = crypto.randomUUID();

  await chrome.storage.local.set({
    extensionDeviceId: deviceId,
  });

  return deviceId;
}

export async function loginExtension(
  credentials: ExtensionCredentials,
): Promise<ExtensionUser> {
  const deviceId = await getDeviceId();

  const payload = await accountRequest('/login', {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
    deviceId,
  });

  const result = z
    .object({
      connection: connectionSchema,
      user: extensionUserSchema,
    })
    .parse(payload);

  await rememberConnection(result.connection, result.user);

  return result.user;
}

export async function currentExtensionUser(): Promise<ExtensionUser | null> {
  const connection = await connectionState();

  if (!connection) {
    return null;
  }

  if (connection.user?.id === connection.ownerId) return connection.user;

  try {
    const payload = await accountRequest('/me', undefined, connection.token);

    const result = z
      .object({
        user: extensionUserSchema,
      })
      .parse(payload);

    // Upgrade an existing connection that was stored before we cached the profile.
    await rememberConnection(connection, result.user);
    return result.user;
  } catch (error) {
    if (error instanceof AccountApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function logoutExtension() {
  const connection = await connectionState();
  let warning: string | null = null;

  try {
    if (connection) {
      await accountRequest('/logout', {}, connection.token);
    }
  } catch (error) {
    if (!(error instanceof AccountApiError && error.status === 401)) {
      warning =
        'Đã đăng xuất trên thiết bị. Chưa liên hệ được ' +
        'server để thu hồi token; token sẽ tự hết hạn.';
    }
  } finally {
    await clearAccountSession();
  }

  return { warning };
}
