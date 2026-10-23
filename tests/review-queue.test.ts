import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { HOUR, initialProgress, isDue } from '../src/domain/scheduler';
import type { Entry, Progress } from '../src/domain/types';
import { sample } from './fixtures';

// The service runs against mocked collection methods, never a live database.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/review_queue_test';
process.env.MONGODB_DB = 'review_queue_test';
process.env.SESSION_SECRET = 'review-queue-test-secret-at-least-32-characters';
process.env.APP_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const { client } = await import('../server/src/database/mongo');
const { sharedEntries } =
  await import('../server/src/modules/library/collections');
const { personalEntries } =
  await import('../server/src/modules/personal/collections');
const { userProgress, reviewPreferences } =
  await import('../server/src/modules/progress/collections');
const { studySessions } =
  await import('../server/src/modules/study/collections');
const { createReviewSession } =
  await import('../server/src/modules/study/review-service');
type ReviewSession =
  import('../server/src/modules/study/collections').ReviewSession;

function fixture(t: TestContext, disabled: string[] = []) {
  const now = 11 * HOUR;
  t.mock.method(Date, 'now', () => now);
  const entries: Entry[] = [];
  const progress: (Progress & { userId: string })[] = [];
  for (const [topic, learnedHour] of [
    ['topic-a', 8],
    ['topic-b', 9],
    ['topic-c', 10],
  ] as const) {
    for (let index = 0; index < 10; index++) {
      const id = `${topic}-${index.toString().padStart(2, '0')}`;
      entries.push({ ...sample(), id });
      progress.push({
        ...initialProgress(id, learnedHour * HOUR),
        userId: 'learner',
      });
    }
  }
  const inserted: ReviewSession[] = [];
  t.mock.method(
    client,
    'withSession',
    async (work: (session: unknown) => Promise<unknown>) =>
      work({
        withTransaction: (callback: () => Promise<unknown>) => callback(),
      }),
  );
  t.mock.method(studySessions, 'findOne', async () => null);
  t.mock.method(studySessions, 'insertOne', async (session: ReviewSession) => {
    inserted.push(session);
    return { acknowledged: true, insertedId: session._id };
  });
  t.mock.method(reviewPreferences, 'find', () => ({
    toArray: async () =>
      disabled.map((entryId) => ({ entryId, reviewEnabled: false })),
  }));
  t.mock.method(
    userProgress,
    'find',
    (filter: { userId: string; nextReviewAt: { $lte: number } }) => {
      // There must be no topic, learning-session or collection filter on progress.
      assert.deepEqual(filter, {
        userId: 'learner',
        nextReviewAt: { $lte: now },
      });
      return {
        sort: (order: unknown) => {
          assert.deepEqual(order, { nextReviewAt: 1, entryId: 1 });
          return {
            toArray: async () =>
              progress
                .filter(
                  (item) =>
                    item.userId === filter.userId &&
                    item.nextReviewAt <= filter.nextReviewAt.$lte,
                )
                .sort(
                  (a, b) =>
                    a.nextReviewAt - b.nextReviewAt ||
                    a.entryId.localeCompare(b.entryId),
                ),
          };
        },
      };
    },
  );
  t.mock.method(
    sharedEntries,
    'find',
    (filter: { _id: { $in: string[] } }) => ({
      toArray: async () =>
        entries.filter((entry) => filter._id.$in.includes(entry.id)),
    }),
  );
  t.mock.method(personalEntries, 'find', () => ({ toArray: async () => [] }));
  return { entries, progress, inserted };
}

test('at 11:00 a 20-word review combines the unreviewed 08:00 and 09:00 topics', async (t) => {
  const { inserted } = fixture(t);
  const view = await createReviewSession('learner', 20);
  assert.equal(view.total, 20);
  assert.equal(inserted[0]!.topicId, null);
  assert.deepEqual(
    inserted[0]!.items.map((item) => item.entry.id),
    [
      ...Array.from(
        { length: 10 },
        (_, index) => `topic-a-${index.toString().padStart(2, '0')}`,
      ),
      ...Array.from(
        { length: 10 },
        (_, index) => `topic-b-${index.toString().padStart(2, '0')}`,
      ),
    ],
  );
});

test('the 10-word limit selects the oldest due words without rescheduling the rest', async (t) => {
  const { inserted, progress } = fixture(t);
  const before = structuredClone(progress);
  const view = await createReviewSession('learner', 10);
  assert.equal(view.total, 10);
  assert.ok(
    inserted[0]!.items.every((item) => item.entry.id.startsWith('topic-a-')),
  );
  assert.deepEqual(progress, before);
  assert.equal(progress.filter((item) => isDue(item, 11 * HOUR)).length, 20);
});

test('collection selection is optional; all combines collections as well as topics', async (t) => {
  const { entries, inserted } = fixture(t);
  for (const entry of entries) {
    if (entry.id.startsWith('topic-a-')) entry.collectionId = 'ielts';
  }
  const all = await createReviewSession('learner', 20);
  assert.equal(all.total, 20);
  assert.deepEqual(
    new Set(inserted[0]!.items.map((item) => item.entry.collectionId)),
    new Set(['ielts', 'daily']),
  );
  const daily = await createReviewSession('learner', 20, 'daily');
  assert.equal(daily.total, 10);
  assert.ok(
    inserted[1]!.items.every((item) => item.entry.id.startsWith('topic-b-')),
  );
});

test('disabled and not-yet-due words are excluded across all topics', async (t) => {
  const { inserted } = fixture(t, ['topic-a-00', 'topic-b-00']);
  const view = await createReviewSession('learner', 50);
  assert.equal(view.total, 18);
  assert.ok(
    inserted[0]!.items.every(
      (item) =>
        !item.entry.id.startsWith('topic-c-') && !item.entry.id.endsWith('-00'),
    ),
  );
});

test('the two-hour timer begins at each successful answer rather than topic start', () => {
  const answered = 9 * HOUR + 5 * 60_000;
  const progress = initialProgress('topic-b-word', answered);
  assert.equal(isDue(progress, 11 * HOUR), false);
  assert.equal(isDue(progress, 11 * HOUR + 5 * 60_000), true);
});
