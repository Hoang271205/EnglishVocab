import { personalNotesSchema } from './personalEditor';
import { VocabDB } from '../storage/db';
import { ServiceError } from '../../../../src/domain/types';
import type { Clock, CollectionId, CefrLevel } from '../../../../src/domain/types';
import { SettingsService } from './settings';
import { readReviewDisabledIds,REVIEW_DISABLED_KEY} from './reviewPreferences';

export class QueryService {
    async setReviewEnabled(entryId: string, enabled: boolean) {
    if (typeof enabled !== 'boolean') {
      throw new ServiceError('validation', 'Lựa chọn ôn tập không hợp lệ.');
    }

    return this.db.transaction(
            'rw',
            this.db.entries,
            this.db.sessions,
            this.db.settings,
                async () => {
        const entry = await this.db.entries.get(entryId);

        if (!entry) {
          throw new ServiceError('not-found', 'Không tìm thấy từ.');
        }

        const disabledIds = await readReviewDisabledIds(this.db);
        const currentEnabled = !disabledIds.has(entryId);

        if (currentEnabled === enabled) {
          return { entryId, enabled };
        }

        const sessions = await this.db.sessions.toArray();

        const inSession = sessions.some(
          (session) =>
            session.phase !== 'complete' &&
            session.items.some((item) => item.entryId === entryId),
        );

        if (inSession) {
          throw new ServiceError(
            'conflict',
            'Hãy hoàn thành phiên học hoặc ôn đang chứa từ này trước khi thay đổi.',
          );
        }

        if (enabled) {
          disabledIds.delete(entryId);
        } else {
          disabledIds.add(entryId);
        }

        await this.db.settings.put({
          key: REVIEW_DISABLED_KEY,
          value: [...disabledIds],
        });

        return { entryId, enabled };
      },
    );
  }
  async details(entryId: string) {
    return this.db.transaction(
      'r',
      this.db.entries,
      this.db.progress,
      this.db.captures,
      this.db.topics,
      this.db.settings,
      async () => {
        const [entry, progress, captures, topics, note] = await Promise.all([
          this.db.entries.get(entryId),
          this.db.progress.get(entryId),
          this.db.captures.where('entryId').equals(entryId).toArray(),
          this.db.topics.where('entryIds').equals(entryId).toArray(),
          this.db.settings.get('personalNotes'),
        ]);

        if (!entry) {
          throw new ServiceError(
            'not-found',
            'Không tìm thấy từ trong thư viện.',
          );
        }

        return {
          entry,
          note: personalNotesSchema.parse(note?.value ?? {})[entryId] ?? '',
          progress: progress ?? null,
          captures: captures.sort(
            (first, second) => second.capturedAt - first.capturedAt,
          ),
          topics,
        };
      },
    );
  }

  constructor(
    private readonly db: VocabDB,
    private readonly clock: Clock = { now: () => Date.now() },
  ) {}

  async dailyProgress() {
    const start = new Date(this.clock.now());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);

    return this.db.transaction(
      'r',
      this.db.progress,
      this.db.settings,
      async () => {
        const [progress, settings] = await Promise.all([
          this.db.progress.toArray(),
          new SettingsService(this.db).get(),
        ]);

        const learnedToday = progress.filter(
          (item) =>
            item.learnedAt >= start.getTime() &&
            item.learnedAt < end.getTime(),
        ).length;

        return {
          learnedToday,
          target: settings.dailyNewWordTarget,
          remaining: Math.max(
            0,
            settings.dailyNewWordTarget - learnedToday,
          ),
        };
      },
    );
  }

  async overview() {
    return this.db.transaction(
      'r',
      this.db.entries,
      this.db.progress,
      this.db.topics,
      this.db.settings,
      async () => {
        const [entries, progress, topics] = await Promise.all([
          this.db.entries.toArray(),
          this.db.progress.toArray(),
          this.db.topics.toArray(),
        ]);
       const disabledIds = await readReviewDisabledIds(this.db);
       const reviewable = progress.filter(
      (item) => !disabledIds.has(item.entryId),
);
        const learned = new Set(progress.map((item) => item.entryId));
        const now = this.clock.now();
        const due = reviewable.filter(
  (item) => item.nextReviewAt <= now,
);

        return {
          learned: progress.length,
          due: due.length,
          mastered: progress.filter((item) => item.level === 5).length,
          drafts: entries.filter((entry) => entry.contentStatus === 'draft')
            .length,
          unlearned: entries.filter(
            (entry) =>
              entry.contentStatus === 'ready' && !learned.has(entry.id),
          ).length,
          nextReviewAt: reviewable.length
  ? Math.min(...reviewable.map((item) => item.nextReviewAt))
  : null,
          collections: (['ielts', 'daily'] as const).map((id) => {
            const slots = topics
              .filter((topic) => topic.collectionId === id)
              .flatMap((topic) => topic.entryIds);

            return {
              id,
              slots: slots.length,
              learnedSlots: slots.filter((entryId) => learned.has(entryId))
                .length,
              target: 1000,
            };
          }),
        };
      },
    );
  }

  async topics(collection: 'ielts' | 'daily', search = '') {
    return this.db.transaction(
      'r',
      this.db.topics,
      this.db.entries,
      this.db.progress,
      async () => {
        const disabledIds = await readReviewDisabledIds(this.db);
        const topics = await this.db.topics
          .where('collectionId')
          .equals(collection)
          .sortBy('order');

        const progress = new Map(
          (await this.db.progress.toArray()).map((item) => [
            item.entryId,
            item,
          ]),
        );

        const ready = new Set(
          (await this.db.entries.toArray())
            .filter((entry) => entry.contentStatus === 'ready')
            .map((entry) => entry.id),
        );

        const query = search.normalize('NFKC').toLowerCase().trim();

        return topics
          .filter((topic) =>
            (topic.nameEn + ' ' + topic.nameVi)
              .normalize('NFKC')
              .toLowerCase()
              .includes(query),
          )
          .map((topic) => ({
            ...topic,
            total: topic.entryIds.filter((id) => ready.has(id)).length,
            learned: topic.entryIds.filter((id) => progress.has(id)).length,
            due: topic.entryIds.filter(
                (id) =>
               !disabledIds.has(id) &&
               (progress.get(id)?.nextReviewAt ?? Infinity) <=
              this.clock.now(),
            ).length,
          }));
      },
    );
  }

  async notebook(
    filter: {
      collection?: CollectionId;
      level?: number;
      due?: boolean;
      search?: string;
      cefr?: CefrLevel;
      topicId?: string;
      minWrong?: number;
    } = {},
  ) {
    return this.db.transaction(
      'r',
      this.db.entries,
      this.db.progress,
      this.db.topics,
      this.db.settings,
      async () => {
        const disabledIds = await readReviewDisabledIds(this.db);
        const entries = await this.db.entries.toArray();
        const progress = new Map(
          (await this.db.progress.toArray()).map((item) => [
            item.entryId,
            item,
          ]),
        );

        const membership =
          filter.collection && filter.collection !== 'personal'
            ? new Set(
                (
                  await this.db.topics
                    .where('collectionId')
                    .equals(filter.collection)
                    .toArray()
                ).flatMap((topic) => topic.entryIds),
              )
            : null;

        const topic = filter.topicId
          ? await this.db.topics.get(filter.topicId)
          : null;

        const query =
          filter.search?.normalize('NFKC').toLowerCase().trim() ?? '';

        return entries
          .filter(
            (entry) =>
              (!filter.topicId || !!topic?.entryIds.includes(entry.id)) &&
              (!filter.cefr || entry.cefr.level === filter.cefr) &&
              (!filter.minWrong ||
                (progress.get(entry.id)?.wrongCount ?? 0) >=
                  filter.minWrong) &&
              (!filter.collection ||
                entry.collectionId === filter.collection ||
                !!membership?.has(entry.id)) &&
              (!filter.level ||
                progress.get(entry.id)?.level === filter.level) &&
              (!filter.due ||
                (!disabledIds.has(entry.id) &&
                 (progress.get(entry.id)?.nextReviewAt ?? Infinity) <=
                   this.clock.now())) &&
              (!query ||
                (entry.headword + ' ' + entry.meaningVi)
                  .normalize('NFKC')
                  .toLowerCase()
                  .includes(query)),
          )
          .map((entry) => {
            const itemProgress = progress.get(entry.id) ?? null;

            return {
              entry,
              progress: itemProgress,
              reviewEnabled: !disabledIds.has(entry.id),
              status:
                entry.contentStatus === 'draft'
                  ? 'draft'
                  : itemProgress
                    ? itemProgress.level === 5
                      ? 'mastered'
                      : 'reviewing'
                    : 'unlearned',
            };
          });
      },
    );
  }
}