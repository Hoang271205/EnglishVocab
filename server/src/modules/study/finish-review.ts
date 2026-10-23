import { client } from '../../database/mongo.js';
import { ServiceError } from '../../../../src/domain/types.js';
import { studyReceipts, studySessions } from './collections.js';

export async function finishReview(
  userId: string,
  sessionId: string,
  version: number,
) {
  return client.withSession((mongoSession) =>
    mongoSession.withTransaction(async () => {
      const session = await studySessions.findOne(
        { _id: sessionId, userId, mode: 'review' },
        { session: mongoSession },
      );
      if (!session || session.mode !== 'review') {
        throw new ServiceError('not-found', 'Không tìm thấy phiên ôn tập.');
      }

      // Retrying a successful finish must not close a different session.
      if (!session.active && session.phase === 'complete') return session;
      if (!session.active || session.version !== version) {
        throw new ServiceError('conflict', 'Phiên đã thay đổi. Hãy tải lại.');
      }

      const reviewedCount = await studyReceipts.countDocuments(
        { userId, sessionId },
        { session: mongoSession },
      );
      const nextIndex = Math.min(
        session.items.length,
        session.index + (session.phase === 'feedback' ? 1 : 0),
      );

      session.reviewedCount = reviewedCount;
      session.remainingCount = session.items.length - nextIndex;
      session.endedEarly = true;
      session.index = nextIndex;
      session.active = false;
      session.phase = 'complete';
      session.paused = false;
      session.feedback = null;
      session.draftAnswer = '';
      session.version += 1;

      const updated = await studySessions.replaceOne(
        { _id: sessionId, userId, version, active: true },
        session,
        { session: mongoSession },
      );
      if (updated.matchedCount !== 1) {
        throw new ServiceError('conflict', 'Phiên vừa thay đổi ở tab khác.');
      }

      // Unanswered progress is untouched: those words remain due for the next batch.
      return session;
    }),
  );
}
