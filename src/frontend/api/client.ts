export const API_UNAUTHORIZED_EVENT =
  'englishvocab:api-unauthorized';

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

  if (
    error === null ||
    typeof error !== 'object' ||
    !('message' in error)
  ) {
    return null;
  }

  return typeof error.message === 'string'
    ? error.message
    : null;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Không xử lý được yêu cầu.';
}

export async function apiRequest<T>(
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
      ...(options.signal
        ? { signal: options.signal }
        : {}),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;

    throw new ApiError(
      0,
      'Không kết nối được server. Hãy thử lại.',
    );
  }

  options.signal?.throwIfAborted();

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response
    .json()
    .catch(() => null);

  options.signal?.throwIfAborted();

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(
        new Event(API_UNAUTHORIZED_EVENT),
      );
    }

    throw new ApiError(
      response.status,
      readServerMessage(payload) ??
        `Không xử lý được yêu cầu (${response.status}).`,
    );
  }

  if (payload === null) {
    throw new ApiError(
      response.status,
      'Server trả về dữ liệu không hợp lệ.',
    );
  }

  return payload as T;
}