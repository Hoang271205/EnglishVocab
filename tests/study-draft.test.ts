import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
function installStorage(t: TestContext, storage: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
}
import {
  clearStudyDraft,
  restoreStudyDraft,
  saveStudyDraft,
} from '../src/frontend/features/studyDraft';

function setup() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
  return { entries, storage };
}
const identity = {
  ownerId: 'alice',
  sessionId: 'learn-1',
  attemptId: 'word-1',
  version: 4,
  phase: 'recall',
};

test('draft recovery isolates accounts, sessions, attempts and server versions', (t) => {
  const { storage } = setup();
  installStorage(t, storage);
  assert.equal(saveStudyDraft(identity, 'hello'), true);
  assert.equal(restoreStudyDraft({ ...identity, ownerId: 'bob' }), null);
  assert.equal(restoreStudyDraft({ ...identity, sessionId: 'other' }), null);
  assert.equal(restoreStudyDraft(identity), 'hello');
  assert.equal(restoreStudyDraft({ ...identity, version: 5 }), null);
  assert.equal(restoreStudyDraft(identity), null);
  saveStudyDraft(identity, '');
  assert.equal(restoreStudyDraft(identity), '');
  assert.equal(restoreStudyDraft({ ...identity, attemptId: 'word-2' }), null);
  saveStudyDraft(identity, 'hello');
  assert.equal(restoreStudyDraft({ ...identity, phase: 'complete' }), null);
  saveStudyDraft(identity, 'hello');
  clearStudyDraft(identity);
  assert.equal(restoreStudyDraft(identity), null);
});

test('expired, corrupt or disabled storage never blocks studying', (t) => {
  const { storage, entries } = setup();
  installStorage(t, storage);
  saveStudyDraft(identity, 'hello');
  const key = [...entries.keys()][0]!;
  const stored = JSON.parse(entries.get(key)!);
  entries.set(
    key,
    JSON.stringify({ ...stored, savedAt: Date.now() - 8 * 86400000 }),
  );
  assert.equal(restoreStudyDraft(identity), null);
  entries.set(key, '{bad');
  assert.equal(restoreStudyDraft(identity), null);
  t.mock.method(storage, 'setItem', () => {
    throw new Error('Quota');
  });
  assert.equal(saveStudyDraft(identity, 'hello'), false);
  t.mock.method(storage, 'getItem', () => {
    throw new Error('Blocked');
  });
  assert.equal(restoreStudyDraft(identity), null);
});
