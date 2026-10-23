interface CachedRead {
  value: unknown;
  expiresAt: number;
}
const reads = new Map<string, CachedRead>();
let generation = 0;
export function readCacheGeneration() {
  return generation;
}
export function clearReadCache() {
  reads.clear();
  generation += 1;
}
export function getCachedRead<T>(key: string): T | undefined {
  const cached = reads.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    reads.delete(key);
    return undefined;
  }
  return cached.value as T;
}
export function cacheRead(
  key: string,
  value: unknown,
  ttlMs: number,
  expectedGeneration: number,
) {
  if (generation !== expectedGeneration) return;
  // Expired data and unused collections cannot accumulate indefinitely.
  for (const [path, cached] of reads)
    if (cached.expiresAt <= Date.now()) reads.delete(path);
  if (reads.size >= 8) reads.delete(reads.keys().next().value!);
  reads.set(key, { value, expiresAt: Date.now() + Math.min(ttlMs, 15000) });
}
