import { randomUUID } from 'node:crypto';
import { gradeAnswer } from '../../../../src/domain/grading.js';
import { initialProgress } from '../../../../src/domain/scheduler.js';
import { POLICY, ServiceError } from '../../../../src/domain/types.js';
import type { ReviewEvent } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { sharedTopics } from '../library/collections.js';
import { resolveReadyEntries } from '../entries/service.js';
import { userProgress } from '../progress/collections.js';
import { skipLearnWord } from './skip-learn-word.js';
import { topicLearning, recordTopicPosition } from './topic-learning.js';
import { studyReceipts, studySessions } from './collections.js';
import type { LearnSession } from './collections.js';

type LearnAction = 'recall' | 'front' | 'pause' | 'resume' | 'draft' | 'skip';

export function sessionView(session: LearnSession) {
  const item = session.items[session.index];
  const visible = !session.paused && Boolean(item);

  return {
    id: session._id,
    mode: session.mode,
    topicId: session.topicId,
    version: session.version,
    phase: session.phase,
    index: session.index,
    total: session.items.length,
    skippedCount: session.items.filter((item) => item.skipped).length,
    paused: session.paused,
    draftAnswer: session.draftAnswer,
    createdAt: session.createdAt,
    attemptId: item?.attemptId ?? null,

    front: visible && session.phase === 'front' ? item!.entry : null,

    hint:
      visible && session.phase === 'recall'
        ? {
            meaningVi: item!.entry.meaningVi,
            partOfSpeech: item!.entry.partOfSpeech,
          }
        : null,
  };
}

async function requireSession(userId: string, sessionId: string) {
  const session = await studySessions.findOne({
    _id: sessionId,
    userId,
  });

  if (!session || session.mode !== 'learn') {
    throw new ServiceError('not-found', 'Không tìm thấy phiên học.');
  }

  return session;
}

export async function getLearnSession(userId: string, sessionId: string) {
  return sessionView(await requireSession(userId, sessionId));
}

export async function getActiveLearnSession(userId: string) {
  const session = await studySessions.findOne({
    userId,
    active: true,
    mode: 'learn',
  });

  return session?.mode === 'learn' ? sessionView(session) : null;
}

type LearningSource =
  | {
      kind: 'topic';
      topicId: string;
    }
  | {
      kind: 'personal';
      entryIds: string[];
    };

export async function createLearnSession(
  userId: string,
  topicId: string,
  limit: 5 | 10,
) {
  return createLearningFromSource(userId, { kind: 'topic', topicId }, limit);
}

export async function createPersonalLearnSession(
  userId: string,
  entryIds: string[],
  limit: 5 | 10,
) {
  return createLearningFromSource(
    userId,
    { kind: 'personal', entryIds },
    limit,
  );
}

async function createLearningFromSource(
  userId: string,
  source: LearningSource,
  limit: 5 | 10,
) {
  return client.withSession(async (mongoSession) =>
    mongoSession.withTransaction(async () => {
      const active = await studySessions.findOne(
        { userId, active: true },
        { session: mongoSession },
      );

      if (active) {
        throw new ServiceError(
          'conflict',
          'Bạn còn phiên đang dở. Hãy tiếp tục phiên đó.',
        );
      }

      let topicId: string | null = null;
      let ids: string[];

      if (source.kind === 'topic') {
        const topic = await sharedTopics.findOne(
          { _id: source.topicId },
          { session: mongoSession },
        );

        if (!topic) {
          throw new ServiceError('not-found', 'Không tìm thấy topic.');
        }

        topicId = topic.id;
        ids = topic.entryIds;
      } else {
        ids = [...new Set(source.entryIds)];
      }

      const entries = await resolveReadyEntries(userId, ids, mongoSession);

      if (
        source.kind === 'personal' &&
        (entries.length !== ids.length ||
          entries.some((entry) => entry.collectionId !== 'personal'))
      ) {
        throw new ServiceError(
          'not-found',
          'Một số từ cá nhân không tồn tại hoặc chưa đủ thông tin.',
        );
      }

      const progress = await userProgress
        .find(
          {
            userId,
            entryId: { $in: ids },
          },
          { session: mongoSession },
        )
        .toArray();

      const learnedIds = new Set(progress.map((item) => item.entryId));

      const byId = new Map(entries.map((entry) => [entry.id, entry]));

      const cursor = topicId
        ? await topicLearning.findOne(
            { _id: JSON.stringify([userId, topicId]) },
            { session: mongoSession },
          )
        : null;

      const selected = ids
        .slice(cursor?.nextIndex ?? 0)
        .filter((id) => !learnedIds.has(id))
        .flatMap((id) => {
          const entry = byId.get(id);
          return entry ? [entry] : [];
        })
        .slice(0, limit);

      if (!selected.length) {
        throw new ServiceError(
          'not-found',
          'Chủ đề không còn từ mới đủ điều kiện học.',
        );
      }

      const session: LearnSession = {
        _id: randomUUID(),
        userId,
        mode: 'learn',
        topicId,
        active: true,
        version: 1,
        index: 0,
        phase: 'front',
        paused: false,
        draftAnswer: '',
        createdAt: Date.now(),
        items: selected.map((entry) => ({
          attemptId: randomUUID(),
          entry,
        })),
      };

      await studySessions.insertOne(session, {
        session: mongoSession,
      });

      return sessionView(session);
    }),
  );
}

export async function changeLearnSession(
  userId: string,
  sessionId: string,
  version: number,
  action: LearnAction,
  answer: string,
) {
  if (action === 'skip') {
    return sessionView(await skipLearnWord(userId, sessionId, version));
  }

  const session = await requireSession(userId, sessionId);

  if (!session.active || session.version !== version) {
    throw new ServiceError('conflict', 'Phiên đã thay đổi. Hãy tải lại phiên.');
  }

  if (action === 'pause') {
    session.paused = true;
    session.draftAnswer = answer;
  } else if (action === 'resume') {
    session.paused = false;
  } else if (session.paused) {
    throw new ServiceError(
      'conflict',
      'Hãy tiếp tục phiên trước khi thao tác.',
    );
  } else if (action === 'recall' && session.phase === 'front') {
    session.phase = 'recall';
    session.draftAnswer = '';
  } else if (action === 'front' && session.phase === 'recall') {
    session.phase = 'front';
    session.draftAnswer = '';
  } else if (action === 'draft' && session.phase === 'recall') {
    session.draftAnswer = answer;
  } else {
    throw new ServiceError(
      'conflict',
      'Thao tác không phù hợp với bước học hiện tại.',
    );
  }

  session.version += 1;

  const result = await studySessions.replaceOne(
    {
      _id: sessionId,
      userId,
      version,
      active: true,
    },
    session,
  );

  if (result.matchedCount !== 1) {
    throw new ServiceError(
      'conflict',
      'Phiên vừa thay đổi ở tab khác. Hãy tải lại.',
    );
  }

  return sessionView(session);
}

export async function submitLearnAnswer(
  userId: string,
  sessionId: string,
  version: number,
  attemptId: string,
  answer: string,
) {
  return client.withSession(async (mongoSession) =>
    mongoSession.withTransaction(async () => {
      const session = await studySessions.findOne(
        { _id: sessionId, userId },
        { session: mongoSession },
      );

      if (!session || session.mode !== 'learn') {
        throw new ServiceError('not-found', 'Không tìm thấy phiên học.');
      }

      const receipt = await studyReceipts.findOne(
        {
          _id: attemptId,
          userId,
          sessionId,
        },
        { session: mongoSession },
      );

      // Lượt này đã lưu thành công: trả lại kết quả,
      // không chấm hoặc ghi tiến độ thêm lần nữa.
      if (receipt) {
        return {
          kind: 'committed' as const,
          progress: receipt.progress,
          event: receipt.event,
          session: sessionView(session),
        };
      }

      const item = session.items[session.index];

      if (
        !item ||
        !session.active ||
        session.paused ||
        session.phase !== 'recall' ||
        session.version !== version ||
        item.attemptId !== attemptId
      ) {
        throw new ServiceError(
          'conflict',
          'Lượt trả lời đã cũ. Hãy tải lại phiên.',
        );
      }

      const before = await userProgress.findOne(
        {
          userId,
          entryId: item.entry.id,
        },
        { session: mongoSession },
      );

      if (before) {
        throw new ServiceError('conflict', 'Từ này đã có tiến độ học.');
      }

      const correct = gradeAnswer(answer, item.entry.acceptedLearnAnswers);

      if (!correct) {
        return {
          kind: 'retry' as const,
          session: sessionView(session),
        };
      }

      const now = Date.now();

      const progress = initialProgress(item.entry.id, now);

      const event: ReviewEvent = {
        id: attemptId,
        sessionId,
        entryId: item.entry.id,
        mode: 'learn',
        correct: true,
        reviewedAt: now,
        beforeLevel: null,
        afterLevel: 1,
        nextReviewAt: progress.nextReviewAt,
        entryRevision: item.entry.revision,
        policy: POLICY,
      };

      await userProgress.insertOne(
        { ...progress, userId },
        { session: mongoSession },
      );

      await studyReceipts.insertOne(
        {
          _id: attemptId,
          userId,
          sessionId,
          progress,
          event,
        },
        { session: mongoSession },
      );

      await recordTopicPosition(session, item.entry.id, mongoSession);
      session.index += 1;
      session.version += 1;
      session.draftAnswer = '';

      const complete = session.index >= session.items.length;

      session.phase = complete ? 'complete' : 'front';
      session.active = !complete;

      await studySessions.replaceOne({ _id: sessionId, userId }, session, {
        session: mongoSession,
      });

      return {
        kind: 'committed' as const,
        progress,
        event,
        session: sessionView(session),
      };
    }),
  );
}
