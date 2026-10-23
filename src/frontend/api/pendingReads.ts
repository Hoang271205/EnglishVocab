interface PendingRead {
  controller: AbortController;
  promise: Promise<unknown>;
  consumers: number;
}

const pendingReads = new Map<string, PendingRead>();

// Share only requests still in flight; completed results are never retained here.
export function sharePendingRead<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  let pending = pendingReads.get(key);
  if (!pending) {
    const controller = new AbortController();
    const request: PendingRead = {
      controller,
      consumers: 0,
      promise: Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return load(controller.signal);
      }),
    };
    request.promise = request.promise.finally(() => {
      if (pendingReads.get(key) === request) pendingReads.delete(key);
    });
    pendingReads.set(key, request);
    pending = request;
  }

  const request = pending;
  request.consumers += 1;
  return new Promise<T>((resolve, reject) => {
    let finished = false;
    function release() {
      if (finished) return false;
      finished = true;
      signal?.removeEventListener('abort', abort);
      request.consumers -= 1;
      if (request.consumers === 0) {
        if (pendingReads.get(key) === request) pendingReads.delete(key);
        request.controller.abort();
      }
      return true;
    }
    function abort() {
      if (release()) reject(signal!.reason);
    }
    signal?.addEventListener('abort', abort, { once: true });
    request.promise.then(
      (value) => {
        if (release()) resolve(value as T);
      },
      (error: unknown) => {
        if (release()) reject(error);
      },
    );
  });
}
