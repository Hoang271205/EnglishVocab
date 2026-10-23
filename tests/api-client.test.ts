import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { apiRequest } from '../src/frontend/api/client';
import { clearReadCache } from '../src/frontend/api/readCache';
import { learningApi } from '../src/frontend/features/learning/learning.api';
import { reviewApi } from '../src/frontend/features/reviewing/review.api';
import { settingsApi } from '../src/frontend/features/settings/settings.api';

function setup(t: TestContext) {
  clearReadCache();
  const requests: {
    signal: AbortSignal;
    respond: (value: unknown, status?: number) => void;
  }[] = [];
  t.mock.method(globalThis, 'fetch', (_path: string, options: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const signal = options.signal ?? new AbortController().signal;
      signal.throwIfAborted();
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      requests.push({
        signal,
        respond: (value, status = 200) =>
          resolve(new Response(JSON.stringify(value), { status })),
      });
    }),
  );
  return requests;
}

test('learning, review and settings share one simultaneous settings request', async (t) => {
  const requests = setup(t);
  const signal = new AbortController().signal;
  const results = Promise.all([
    learningApi.preferences(signal),
    reviewApi.batchSize(signal),
    settingsApi.get(signal),
  ]);
  await Promise.resolve();
  assert.equal(requests.length, 1);
  requests[0]!.respond({ revision: 1, settings: { reviewBatchSize: 10 } });
  const [learning, batchSize, settings] = await results;
  assert.equal(batchSize, 10);
  assert.deepEqual(learning, settings.settings);
});

test('cancelling one consumer keeps the shared request alive for the other', async (t) => {
  const requests = setup(t);
  const first = new AbortController();
  const second = new AbortController();
  const cancelled = apiRequest('/api/settings', { signal: first.signal });
  const rejection = assert.rejects(cancelled, { name: 'AbortError' });
  const active = apiRequest('/api/settings', { signal: second.signal });
  await Promise.resolve();
  first.abort();
  await rejection;
  assert.equal(requests.length, 1);
  assert.equal(requests[0]!.signal.aborted, false);
  requests[0]!.respond({ revision: 2 });
  assert.deepEqual(await active, { revision: 2 });
});

test('cancelling all consumers aborts fetch and allows an immediate replacement', async (t) => {
  const requests = setup(t);
  const controller = new AbortController();
  const cancelled = apiRequest('/api/settings', { signal: controller.signal });
  const rejection = assert.rejects(cancelled, { name: 'AbortError' });
  await Promise.resolve();
  controller.abort();
  const replacement = apiRequest('/api/settings');
  await rejection;
  await Promise.resolve();
  assert.equal(requests[0]!.signal.aborted, true);
  assert.equal(requests.length, 2);
  const joined = apiRequest('/api/settings');
  await Promise.resolve();
  assert.equal(requests.length, 2);
  requests[1]!.respond({ revision: 3 });
  assert.deepEqual(await Promise.all([replacement, joined]), [
    { revision: 3 }, { revision: 3 },
  ]);
});

test('completed reads are fetched again on manual refresh', async (t) => {
  const requests = setup(t);
  const first = apiRequest('/api/notebook');
  await Promise.resolve();
  requests[0]!.respond({ rows: [1] });
  await first;
  const refresh = apiRequest('/api/notebook');
  await Promise.resolve();
  assert.equal(requests.length, 2);
  requests[1]!.respond({ rows: [2] });
  assert.deepEqual(await refresh, { rows: [2] });
});

test('failed shared reads can be retried', async (t) => {
  const requests = setup(t);
  const first = apiRequest('/api/settings');
  const second = apiRequest('/api/settings');
  const failures = Promise.all([
    assert.rejects(first, { status: 500 }),
    assert.rejects(second, { status: 500 }),
  ]);
  await Promise.resolve();
  requests[0]!.respond({ error: { message: 'Unavailable' } }, 500);
  await failures;
  const retry = apiRequest('/api/settings');
  await Promise.resolve();
  assert.equal(requests.length, 2);
  requests[1]!.respond({ revision: 4 });
  await retry;
});

test('writes isolate new reads and prevent old reads from repopulating the cache', async (t) => {
  const requests = setup(t);
  const options = { cacheTtlMs: 15000 };
  const old = apiRequest('/api/settings', options);
  await Promise.resolve();
  const write = apiRequest('/api/settings', { method: 'PATCH', body: {} });
  requests[1]!.respond({ revision: 2 });
  await write;
  const fresh = apiRequest('/api/settings', options);
  await Promise.resolve();
  assert.equal(requests.length, 3);
  requests[2]!.respond({ revision: 2 });
  await fresh;
  requests[0]!.respond({ revision: 1 });
  await old;
  assert.deepEqual(await apiRequest('/api/settings', options), { revision: 2 });
  assert.equal(requests.length, 3);
});

test('writes are never merged', async (t) => {
  const requests = setup(t);
  const first = apiRequest('/api/study/learn', { method: 'POST', body: {} });
  const second = apiRequest('/api/study/learn', { method: 'POST', body: {} });
  assert.equal(requests.length, 2);
  requests[0]!.respond({ id: 'first' });
  requests[1]!.respond({ id: 'second' });
  assert.deepEqual(await Promise.all([first, second]), [
    { id: 'first' }, { id: 'second' },
  ]);
});

test('an already cancelled caller does not start a request', async (t) => {
  const requests = setup(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    apiRequest('/api/settings', { signal: controller.signal }),
    { name: 'AbortError' },
  );
  assert.equal(requests.length, 0);
});
