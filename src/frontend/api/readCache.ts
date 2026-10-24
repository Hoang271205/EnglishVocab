import { cacheScope } from './cacheScope';
interface CachedRead {
  value: unknown;
  expiresAt: number;
}
const reads = new Map<string, CachedRead>();
const revisions = new Map<string, number>();
let sequence = 0;
let generation = 0;
export function readCacheGeneration(key?: string) {
  return key
    ? Math.max(generation, revisions.get(cacheScope(key)) ?? 0)
    : generation;
}
export function clearReadCache() {
  reads.clear();
  revisions.clear();
  generation = ++sequence;
}
export function invalidateReadScopes(scopes: string[]) {
  for (const scope of scopes) revisions.set(scope, ++sequence);
  for (const key of reads.keys())
    if (scopes.includes(cacheScope(key))) reads.delete(key);
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
  if (readCacheGeneration(key) !== expectedGeneration) return;
  for (const [path, cached] of reads)
    if (cached.expiresAt <= Date.now()) reads.delete(path);
  if (reads.size >= 8) reads.delete(reads.keys().next().value!);
  reads.set(key, { value, expiresAt: Date.now() + Math.min(ttlMs, 15000) });
}
