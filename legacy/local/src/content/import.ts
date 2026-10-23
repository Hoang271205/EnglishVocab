import { contentSchema } from '../../../../src/content/schema';
import { VocabDB } from '../storage/db';
import { ServiceError } from '../../../../src/domain/types';

type ContentPack = ReturnType<typeof contentSchema.parse>;

export class ContentService {
  constructor(private readonly db: VocabDB) {}

  inspect(input: unknown) {
    const parsed = contentSchema.safeParse(input);

    if (!parsed.success) {
      throw new ServiceError('validation', parsed.error.message);
    }

    return parsed.data;
  }

  private async analyze(pack: ContentPack) {
    const [entries, topics, progress, sessions] = await Promise.all([
      this.db.entries.toArray(),
      this.db.topics.toArray(),
      this.db.progress.toArray(),
      this.db.sessions.toArray(),
    ]);

    const existing = new Map(entries.map((entry) => [entry.id, entry]));
    const learned = new Set(progress.map((item) => item.entryId));

    const activeEntries = new Set(
      sessions
        .filter((session) => session.phase !== 'complete')
        .flatMap((session) =>
          session.items
            .slice(
              session.index +
                (session.phase === 'feedback' ? 1 : 0),
            )
            .map((item) => item.entryId),
        ),
    );

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const entry of pack.entries) {
      const old = existing.get(entry.id);

      if (!old) {
        added++;
        continue;
      }

      if (
        old.headword !== entry.headword ||
        old.partOfSpeech !== entry.partOfSpeech ||
        old.senseKey !== entry.senseKey ||
        old.collectionId !== entry.collectionId
      ) {
        throw new ServiceError(
          'conflict',
          `${entry.headword}: mục khác cần một ID mới.`,
        );
      }

      if (
        old.meaningVi.trim() &&
        old.meaningVi !== entry.meaningVi
      ) {
        throw new ServiceError(
          'conflict',
          `${entry.headword}: đổi nghĩa đã có cần tạo mục mới.`,
        );
      }

      if (entry.revision < old.revision) {
        throw new ServiceError(
          'conflict',
          `${entry.headword}: revision trong file đã cũ.`,
        );
      }

      const changed = JSON.stringify(old) !== JSON.stringify(entry);

      if (!changed) {
        unchanged++;
        continue;
      }

      if (entry.revision === old.revision) {
        throw new ServiceError(
          'conflict',
          `${entry.headword}: sửa nội dung cần tăng revision.`,
        );
      }

      if (activeEntries.has(entry.id)) {
        throw new ServiceError(
          'conflict',
          `${entry.headword}: đang nằm trong phiên học/ôn chưa hoàn tất.`,
        );
      }

      if (learned.has(entry.id) && entry.contentStatus !== 'ready') {
        throw new ServiceError(
          'conflict',
          `${entry.headword}: từ đã học không thể chuyển thành bản nháp.`,
        );
      }

      updated++;
    }

    // Kiểm tra cả các topic đã có sau khi ghép dữ liệu.
    const mergedEntries = new Map(existing);
    const mergedTopics = new Map(
      topics.map((topic) => [topic.id, topic]),
    );

    for (const entry of pack.entries) {
      mergedEntries.set(entry.id, entry);
    }

    for (const topic of pack.topics) {
      const old = mergedTopics.get(topic.id);

      if (topic.entryIds.length || !old?.entryIds.length) {
        mergedTopics.set(topic.id, topic);
      }
    }

    this.inspect({
      schemaVersion: 1,
      contentVersion: pack.contentVersion,
      entries: [...mergedEntries.values()],
      topics: [...mergedTopics.values()],
    });

    return {
      added,
      updated,
      unchanged,
      topics: pack.topics.length,
    };
  }

  async preview(input: unknown) {
    const pack = this.inspect(input);

    return this.db.transaction(
      'r',
      this.db.entries,
      this.db.topics,
      this.db.progress,
      this.db.sessions,
      () => this.analyze(pack),
    );
  }

  async import(input: unknown) {
    const pack = this.inspect(input);

    return this.db.transaction(
      'rw',
      this.db.entries,
      this.db.topics,
      this.db.settings,
      this.db.progress,
      this.db.sessions,
      async () => {
        // Kiểm tra lại trong transaction lúc nhập.
        const summary = await this.analyze(pack);

        await this.db.entries.bulkPut(pack.entries);

        for (const topic of pack.topics) {
          const old = await this.db.topics.get(topic.id);

          if (topic.entryIds.length || !old?.entryIds.length) {
            await this.db.topics.put(topic);
          }
        }

        await this.db.settings.put({
          key: 'contentVersion',
          value: pack.contentVersion,
        });

        return {
          entries: pack.entries.length,
          ...summary,
        };
      },
    );
  }

  async seed(input: unknown) {
    const pack = this.inspect(input);

    return this.db.transaction(
      'rw',
      this.db.entries,
      this.db.topics,
      this.db.settings,
      async () => {
        const existing = new Set(
          (await this.db.entries.toArray()).map((entry) => entry.id),
        );

        const missing = pack.entries.filter(
          (entry) => !existing.has(entry.id),
        );

        await this.db.entries.bulkAdd(missing);

        for (const topic of pack.topics) {
          const old = await this.db.topics.get(topic.id);

          if (!old || (!old.entryIds.length && topic.entryIds.length)) {
            await this.db.topics.put(topic);
          }
        }

        if (!(await this.db.settings.get('contentVersion'))) {
          await this.db.settings.put({
            key: 'contentVersion',
            value: pack.contentVersion,
          });
        }

        return {
          entries: missing.length,
          topics: pack.topics.length,
        };
      },
    );
  }
}