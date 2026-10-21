import { normalizeAnswer } from '../domain/grading';
import { ServiceError } from '../domain/types';
import { VocabDB } from '../storage/db';
import { personalNotesSchema } from './personalEditor';

export async function deletePersonalEntry(
  db: VocabDB,
  entryId: string,
  revision: number,
  preview = false,
) {
  return db.transaction(
    'rw',
    [
      db.entries,
      db.progress,
      db.events,
      db.sessions,
      db.captures,
      db.settings,
      db.lookupCache,
      db.topics,
    ],
    async () => {
      const entry = await db.entries.get(entryId);

      if (!entry || entry.collectionId !== 'personal') {
        throw new ServiceError(
          'not-found',
          'Không tìm thấy từ cá nhân cần xóa.',
        );
      }

      if (entry.revision !== revision) {
        throw new ServiceError(
          'conflict',
          'Từ đã được chỉnh sửa. Hãy làm mới Sổ tay trước khi xóa.',
        );
      }

      const sessions = await db.sessions.toArray();

      const relatedSessions = sessions.filter((session) =>
        session.items.some((item) => item.entryId === entryId),
      );

      if (
        relatedSessions.some((session) => session.phase !== 'complete')
      ) {
        throw new ServiceError(
          'conflict',
          'Từ đang nằm trong phiên học hoặc ôn chưa hoàn tất. Hãy hoàn thành phiên trước khi xóa.',
        );
      }

      if (preview) {
        return { entryId, headword: entry.headword };
      }

      await db.captures.where('entryId').equals(entryId).delete();
      await db.events.where('entryId').equals(entryId).delete();
      await db.progress.delete(entryId);

      // Giữ lại các từ khác trong cùng phiên đã hoàn thành.
      for (const session of relatedSessions) {
        const items = session.items.filter(
          (item) => item.entryId !== entryId,
        );

        if (items.length === 0) {
          await db.sessions.delete(session.id);
        } else {
          await db.sessions.put({
            ...session,
            items,
            index: items.length,
            version: session.version + 1,
          });
        }
      }

      const storedNotes = await db.settings.get('personalNotes');

      if (storedNotes) {
        const notes = personalNotesSchema.parse(storedNotes.value);

        delete notes[entryId];

        await db.settings.put({
          key: 'personalNotes',
          value: notes,
        });
      }

      const topics = await db.topics
        .where('entryIds')
        .equals(entryId)
        .toArray();

      for (const topic of topics) {
        await db.topics.put({
          ...topic,
          entryIds: topic.entryIds.filter((id) => id !== entryId),
        });
      }

      const key = normalizeAnswer(entry.headword);

      const cacheKeys = (await db.lookupCache.toArray())
        .filter((record) => normalizeAnswer(record.key) === key)
        .map((record) => record.key);

      await db.lookupCache.bulkDelete(cacheKeys);
      await db.entries.delete(entryId);

      return { entryId, headword: entry.headword };
    },
  );
}