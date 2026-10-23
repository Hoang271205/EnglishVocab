import { waitUntil } from '@vercel/functions';

// Callers must handle task failures before scheduling to avoid unhandled rejections.
export function runInBackground(task: Promise<unknown>): void {
  if (process.env.VERCEL === '1') {
    waitUntil(task);
    return;
  }
  void task;
}
