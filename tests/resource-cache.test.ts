import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cacheResource,
  invalidateResource,
  loadResource,
  readResource,
} from '../src/frontend/api/resourceCache';
import {
  clearReadCache,
  readCacheGeneration,
} from '../src/frontend/api/readCache';

test('page data is fresh for 30 seconds, then available for background refresh', (t) => {
  clearReadCache();
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  cacheResource('notebook:alice', [], readCacheGeneration());
  assert.deepEqual(readResource('notebook:alice'), { data: [], fresh: true });
  now += 29_999;
  assert.equal(readResource('notebook:alice')?.fresh, true);
  now += 1;
  assert.deepEqual(readResource('notebook:alice'), { data: [], fresh: false });
  now = 301_000;
  assert.equal(readResource('notebook:alice'), null);
});

test('writes and authentication invalidation remove page data as well as API cache', () => {
  clearReadCache();
  cacheResource('settings', { revision: 1 }, readCacheGeneration());
  cacheResource('dashboard:alice', { learnedCount: 3 }, readCacheGeneration());
  clearReadCache();
  assert.equal(readResource('settings'), null);
  assert.equal(readResource('dashboard:alice'), null);
});

test('a late response from before a write cannot restore invalidated page data', () => {
  clearReadCache();
  const previousGeneration = readCacheGeneration();
  clearReadCache();
  cacheResource('settings', { revision: 2 }, readCacheGeneration());
  cacheResource('settings', { revision: 1 }, previousGeneration);
  assert.deepEqual(readResource('settings'), {
    data: { revision: 2 },
    fresh: true,
  });
});

test('collections and entry details are kept under separate cache keys', () => {
  clearReadCache();
  const generation = readCacheGeneration();
  cacheResource('topics:ielts', ['IELTS'], generation);
  cacheResource('topics:daily', ['Daily'], generation);
  cacheResource('entry-sources:first', ['source'], generation);
  assert.deepEqual(readResource('topics:ielts')?.data, ['IELTS']);
  assert.deepEqual(readResource('topics:daily')?.data, ['Daily']);
  assert.equal(readResource('entry-sources:second'), null);
});

test('cache memory is bounded even when many topics are opened', () => {
  clearReadCache();
  for (let index = 0; index < 25; index++) {
    cacheResource(`topic-entries:${index}`, [index], readCacheGeneration());
  }
  assert.equal(readResource('topic-entries:0'), null);
  assert.deepEqual(readResource('topic-entries:24')?.data, [24]);
});

test('updating an existing cache entry does not evict another entry', () => {
  clearReadCache();
  for (let index = 0; index < 24; index++) {
    cacheResource(`topic-entries:${index}`, [index], readCacheGeneration());
  }
  cacheResource('topic-entries:0', ['updated'], readCacheGeneration());
  assert.deepEqual(readResource('topic-entries:1')?.data, [1]);
  assert.deepEqual(readResource('topic-entries:0')?.data, ['updated']);
});

test('an unfinished page load is reused and cached even after its first caller leaves', async () => {
  clearReadCache();
  let calls = 0;
  let resolve!: (value: string[]) => void;
  const load = async () => {
    calls += 1;
    return new Promise<string[]>((finish) => {
      resolve = finish;
    });
  };
  const first = loadResource('topics:ielts', load);
  await Promise.resolve();
  const returning = loadResource('topics:ielts', load);
  assert.equal(calls, 1);
  resolve(['ready']);
  assert.deepEqual(await Promise.all([first, returning]), [
    ['ready'],
    ['ready'],
  ]);
  assert.deepEqual(readResource('topics:ielts')?.data, ['ready']);
});

test('invalidation cancels unfinished loads and starts a fresh request', async () => {
  clearReadCache();
  let oldSignal: AbortSignal | undefined;
  const old = loadResource('settings', (signal) => {
    oldSignal = signal;
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
    });
  });
  const cancelled = assert.rejects(old, { name: 'AbortError' });
  await Promise.resolve();
  clearReadCache();
  const fresh = loadResource('settings', async () => ({ revision: 2 }));
  await cancelled;
  assert.equal(oldSignal?.aborted, true);
  await fresh;
  assert.deepEqual(readResource('settings')?.data, { revision: 2 });
});

test('failed page loads are removed so a retry can fetch again', async () => {
  clearReadCache();
  await assert.rejects(
    loadResource('notebook', async () => {
      throw new Error('unavailable');
    }),
    /unavailable/,
  );
  assert.equal(readResource('notebook'), null);
  assert.deepEqual(await loadResource('notebook', async () => ['retried']), [
    'retried',
  ]);
});

test('manual refresh invalidates only its own page cache', () => {
  clearReadCache();
  const generation = readCacheGeneration();
  cacheResource('notebook:alice', ['word'], generation);
  cacheResource('topics:ielts', ['topic'], generation);
  invalidateResource('notebook:alice');
  assert.equal(readResource('notebook:alice'), null);
  assert.deepEqual(readResource('topics:ielts')?.data, ['topic']);
});
