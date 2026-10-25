import { POLICY, ServiceError } from './types.js';
import type { Level, Progress } from './types.js';
export { POLICY };
export const HOUR = 3_600_000;
// How long a word waits at its current level before the next successful review.
const WAIT_HOURS: Record<Level, number> = { 1: 2, 2: 8, 3: 24, 4: 48, 5: 120 };
function checkTime(now: number) {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    now > Number.MAX_SAFE_INTEGER - 120 * HOUR
  )
    throw new ServiceError('validation', 'Invalid timestamp');
}
export function initialProgress(entryId: string, now: number): Progress {
  checkTime(now);
  return {
    entryId,
    level: 1,
    learnedAt: now,
    lastReviewedAt: null,
    nextReviewAt: now + WAIT_HOURS[1] * HOUR,
    correctCount: 0,
    wrongCount: 0,
    version: 1,
  };
}
export function reviewProgress(
  before: Progress,
  correct: boolean,
  now: number,
): Progress {
  checkTime(now);
  if (![1, 2, 3, 4, 5].includes(before.level))
    throw new ServiceError('validation', 'Invalid level');
  const level = (
    correct
      ? Math.min(5, before.level + 1)
      : before.level >= 4
        ? before.level - 1
        : 1
  ) as Level;
  // A correct answer reaches the next level, then starts that level's wait.
  // Incorrect answers use the existing short retry interval after demotion.
  const hours = correct ? WAIT_HOURS[level] : WAIT_HOURS[1];
  return {
    ...before,
    level,
    lastReviewedAt: now,
    nextReviewAt: now + hours * HOUR,
    correctCount: before.correctCount + Number(correct),
    wrongCount: before.wrongCount + Number(!correct),
    version: before.version + 1,
  };
}
export function isDue(progress: Progress, now: number): boolean {
  checkTime(now);
  return progress.nextReviewAt <= now;
}
