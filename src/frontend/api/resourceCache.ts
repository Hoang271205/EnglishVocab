import { readCacheGeneration } from './readCache';

interface CachedResource {
  generation: number;
  data: unknown;
  freshUntil: number;
  retainUntil: number;
}

interface PendingResource {
  generation: number;
  controller: AbortController;
  promise: Promise<unknown>;
}

const resources = new Map<string, CachedResource>();
const pendingResources = new Map<string, PendingResource>();
const freshnessMs = 30_000;
const retentionMs = 5 * 60_000;
const maxResources = 24;

function prune() {
  for (const [key, pending] of pendingResources) {
    if (pending.generation !== readCacheGeneration(key)) {
      pending.controller.abort();
      pendingResources.delete(key);
    }
  }
  for (const [key, resource] of resources) {
    if (
      resource.retainUntil <= Date.now() ||
      resource.generation !== readCacheGeneration(key)
    )
      resources.delete(key);
  }
}

// A visited page can finish loading after unmount, so returning can reuse it.
export function loadResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  prune();
  const pending = pendingResources.get(key);
  if (pending) return pending.promise as Promise<T>;
  if (pendingResources.size >= maxResources) {
    const oldestKey = pendingResources.keys().next().value!;
    pendingResources.get(oldestKey)!.controller.abort();
    pendingResources.delete(oldestKey);
  }
  const expectedGeneration = readCacheGeneration(key);
  const controller = new AbortController();
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(30_000),
  ]);
  const request: PendingResource = {
    generation: expectedGeneration,
    controller,
    promise: Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return load(signal);
      })
      .then((data) => {
        signal.throwIfAborted();
        cacheResource(key, data, expectedGeneration);
        signal.throwIfAborted();
        return data;
      })
      .finally(() => {
        if (pendingResources.get(key) === request) pendingResources.delete(key);
      }),
  };
  pendingResources.set(key, request);
  return request.promise as Promise<T>;
}

export function invalidateResource(key: string) {
  prune();
  resources.delete(key);
  pendingResources.get(key)?.controller.abort();
  pendingResources.delete(key);
}

export function readResource<T>(key: string) {
  prune();
  const resource = resources.get(key);
  if (!resource) return null;
  return {
    data: resource.data as T,
    fresh: resource.freshUntil > Date.now(),
  };
}

export function cacheResource<T>(
  key: string,
  data: T,
  expectedGeneration: number,
) {
  prune();
  if (expectedGeneration !== readCacheGeneration(key)) return;
  resources.delete(key);
  if (resources.size >= maxResources) {
    resources.delete(resources.keys().next().value!);
  }
  resources.set(key, {
    generation: expectedGeneration,
    data,
    freshUntil: Date.now() + freshnessMs,
    retainUntil: Date.now() + retentionMs,
  });
}
