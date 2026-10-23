import { client } from '../../database/mongo.js';
import { ServiceError } from '../../../../src/domain/types.js';
import { knownWords, userProgress } from '../progress/collections.js';
import { studySessions } from './collections.js';

export async function skipKnownWord(
  userId: string,
  sessionId: string,
  version: number,
) {
  return client.withSession((mongoSession) =>
    mongoSession.withTransaction(async () => {
      const session = await studySessions.findOne(
        { _id: sessionId, userId, mode: 'learn' },
        { session: mongoSession },
      );
      if (!session || session.mode !== 'learn') {
        throw new ServiceError('not-found', 'Không tìm thấy phiên học.');
      }

      const item = session.items[session.index];
      if (
        !item ||
        !session.active ||
        session.paused ||
        session.version !== version ||
        session.phase === 'complete'
      ) {
        throw new ServiceError('conflict', 'Phiên đã thay đổi. Hãy tải lại.');
      }

      const progress = await userProgress.findOne(
        { userId, entryId: item.entry.id },
        { session: mongoSession },
      );
      if (progress) {
        throw new ServiceError(
          'conflict',
          'Từ này đã có tiến độ học. Hãy tải lại.',
        );
      }

      await knownWords.updateOne(
        { _id: JSON.stringify([userId, item.entry.id]) },
        {
          $setOnInsert: {
            userId,
            entryId: item.entry.id,
            markedAt: Date.now(),
          },
        },
        { upsert: true, session: mongoSession },
      );

      item.known = true;
      session.index += 1;
      session.version += 1;
      session.draftAnswer = '';
      session.active = session.index < session.items.length;
      session.phase = session.active ? 'front' : 'complete';

      const updated = await studySessions.replaceOne(
        { _id: sessionId, userId, version, active: true },
        session,
        { session: mongoSession },
      );
      if (updated.matchedCount !== 1) {
        throw new ServiceError('conflict', 'Phiên vừa thay đổi ở tab khác.');
      }

      // Marking a word as known never invents a level or a review event.
      return session;
    }),
  );
}
