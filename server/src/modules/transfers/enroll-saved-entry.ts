import type { ClientSession } from 'mongodb';
import { entrySchema } from '../../../../src/content/schema.js';
import { initialProgress } from '../../../../src/domain/scheduler.js';
import type { Entry } from '../../../../src/domain/types.js';
import { ServiceError } from '../../../../src/domain/types.js';
import { userProgress } from '../progress/collections.js';

export function requireSavedEntryReady(entry: Entry) {
  if (
    entry.contentStatus !== 'ready' ||
    !entrySchema.safeParse(entry).success
  ) {
    throw new ServiceError(
      'validation',
      'Hãy bổ sung nghĩa tiếng Việt, từ loại và câu ví dụ hợp lệ trước khi lưu.',
    );
  }
}

// Re-saving never resets an existing level, due date, or review preference.
export async function enrollSavedEntry(
  userId: string,
  entry: Entry,
  session: ClientSession,
) {
  requireSavedEntryReady(entry);
  await userProgress.updateOne(
    { userId, entryId: entry.id },
    { $setOnInsert: { ...initialProgress(entry.id, Date.now()), userId } },
    { upsert: true, session },
  );
}
