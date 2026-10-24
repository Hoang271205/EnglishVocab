import {
  cacheRead,
  clearReadCache,
  getCachedRead,
  readCacheGeneration,
  invalidateReadScopes,
} from './readCache';
import { sharePendingRead } from './pendingReads';

export const API_UNAUTHORIZED_EVENT = 'englishvocab:api-unauthorized';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  cacheTtlMs?: number;
}

function readServerMessage(payload: unknown): string | null {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    !('error' in payload)
  ) {
    return null;
  }

  const error = payload.error;

  if (error === null || typeof error !== 'object' || !('message' in error)) {
    return null;
  }

  return typeof error.message === 'string' ? error.message : null;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không xử lý được yêu cầu.';
}

async function sendRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;

    throw new ApiError(0, 'Không kết nối được server. Hãy thử lại.');
  }

  options.signal?.throwIfAborted();

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  options.signal?.throwIfAborted();

  if (!response.ok) {
    if (response.status === 401) {
      clearReadCache();
      window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      response.status,
      readServerMessage(payload) ??
        `Không xử lý được yêu cầu (${response.status}).`,
    );
  }

  if (payload === null) {
    throw new ApiError(response.status, 'Server trả về dữ liệu không hợp lệ.');
  }

  return payload as T;
}
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const isRead = !options.method || options.method === 'GET';
  if (!isRead) return performRequest<T>(path, options);
  // A write or authentication change starts a new generation of reads.
  const key = JSON.stringify([
    readCacheGeneration(path),
    path,
    options.cacheTtlMs ?? 0,
  ]);
  return sharePendingRead(
    key,
    (signal) => performRequest<T>(path, { ...options, signal }),
    options.signal,
  );
}

async function performRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const isRead = !options.method || options.method === 'GET';
  const ttlMs = isRead ? (options.cacheTtlMs ?? 0) : 0;
  options.signal?.throwIfAborted();
  if (ttlMs > 0) {
    const cached = getCachedRead<T>(path);
    if (cached !== undefined) return cached;
  }
  // Writes invalidate before dispatch, so overlapping reads cannot refill old data.
  if (!isRead) invalidateWrite(path, options.body);
  const generation = readCacheGeneration(path);
  const timeout = isRead ? AbortSignal.timeout(20000) : null;
  const signal = timeout
    ? options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout
    : options.signal;
  try {
    const result = await sendRequest<T>(path, {
      ...options,
      ...(signal ? { signal } : {}),
    });
    if (!isRead) invalidateWrite(path, options.body);
    else if (ttlMs > 0) cacheRead(path, result, ttlMs, generation);
    return result;
  } catch (error) {
    if (!isRead) invalidateWrite(path, options.body);
    if (timeout?.aborted && !options.signal?.aborted) {
      throw new ApiError(
        504,
        'Tải dữ liệu quá lâu. Hãy kiểm tra kết nối và bấm Thử lại.',
      );
    }
    throw error;
  }
}

// Session state changes must not evict unrelated catalogue/settings data.
function invalidateWrite(path: string, body: unknown) {
  const action =
    body && typeof body === 'object' && 'action' in body ? body.action : null;
  if (path === '/api/transfers/snapshot' || path === '/api/extension/connect')
    return;
  if (path.startsWith('/api/study/')) {
    const scopes = ['study'];
    if (path.endsWith('/answer')) {
      scopes.push('dashboard', 'notebook', 'progress');
      if (!path.includes('/review/')) scopes.push('topics');
    }
    // Creating/skipping a learning session may advance the topic cursor.
    if (
      !path.includes('/review') &&
      action !== 'draft' &&
      action !== 'pause' &&
      action !== 'resume'
    )
      scopes.push('topics');
    invalidateReadScopes(scopes);
  } else if (path.startsWith('/api/settings')) {
    invalidateReadScopes(['settings']);
  } else if (path.startsWith('/api/progress/')) {
    invalidateReadScopes(['dashboard', 'notebook', 'progress']);
  } else if (
    path.startsWith('/api/personal') ||
    path.startsWith('/api/transfers')
  ) {
    invalidateReadScopes(['notebook', 'dashboard', 'topics', 'progress']);
  } else {
    // Authentication changes and unknown mutations use conservative invalidation.
    clearReadCache();
  }
}
