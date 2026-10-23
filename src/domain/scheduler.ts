import { POLICY, ServiceError } from './types.js';
import type { Level, Progress } from './types.js';
export { POLICY };
export const HOUR = 3_600_000;
function checkTime(now: number) {
 if (!Number.isSafeInteger(now) || now < 0 || now > Number.MAX_SAFE_INTEGER - 120 * HOUR) throw new ServiceError('validation', 'Invalid timestamp');
}
export function initialProgress(entryId: string, now: number): Progress {
 checkTime(now);
 return { entryId, level: 1, learnedAt: now, lastReviewedAt: null, nextReviewAt: now + 2 * HOUR, correctCount: 0, wrongCount: 0, version: 1 };
}
export function reviewProgress(before: Progress, correct: boolean, now: number): Progress {
 checkTime(now);
 if (![1,2,3,4,5].includes(before.level)) throw new ServiceError('validation','Invalid level');
 const level = (correct ? Math.min(5, before.level + 1) : 1) as Level;
 const hours = correct ? ({1:8,2:24,3:48,4:120,5:120}[before.level]) : 2;
 return {...before, level, lastReviewedAt: now, nextReviewAt: now + hours * HOUR,
  correctCount: before.correctCount + Number(correct), wrongCount: before.wrongCount + Number(!correct), version: before.version + 1};
}
export function isDue(progress: Progress, now: number): boolean { checkTime(now); return progress.nextReviewAt <= now; }
