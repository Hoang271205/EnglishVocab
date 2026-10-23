import {
  cacheRead,
  clearReadCache,
  getCachedRead,
  readCacheGeneration,
} from './readCache';

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
  const ttlMs = isRead ? (options.cacheTtlMs ?? 0) : 0;
  options.signal?.throwIfAborted();
  if (ttlMs > 0) {
    const cached = getCachedRead<T>(path);
    if (cached !== undefined) return cached;
  }
  // Writes invalidate before dispatch, so overlapping reads cannot refill old data.
  if (!isRead) clearReadCache();
  const generation = readCacheGeneration();
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
    if (!isRead) clearReadCache();
    else if (ttlMs > 0) cacheRead(path, result, ttlMs, generation);
    return result;
  } catch (error) {
    if (!isRead) clearReadCache();
    if (timeout?.aborted && !options.signal?.aborted) {
      throw new ApiError(
        504,
        'Tải dữ liệu quá lâu. Hãy kiểm tra kết nối và bấm Thử lại.',
      );
    }
    throw error;
  }
}
