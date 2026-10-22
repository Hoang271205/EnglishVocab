import { randomUUID } from 'node:crypto';
import {
  createMask,
  validateClozeAnswer,
} from '../../../../src/domain/cloze.js';
import { gradeAnswer } from '../../../../src/domain/grading.js';
import { reviewProgress } from '../../../../src/domain/scheduler.js';
import {
  POLICY,
  ServiceError,
} from '../../../../src/domain/types.js';
import type {
  Progress,
  ReviewEvent,
} from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { resolveReadyEntries } from '../entries/service.js';
import {
  reviewPreferences,
  userProgress,
} from '../progress/collections.js';
import {
  studyReceipts,
  studySessions,
} from './collections.js';
import type { ReviewSession } from './collections.js';

type ReviewAction = 'next' | 'pause' | 'resume' | 'draft';

function reviewView(session: ReviewSession) {
  const item = session.items[session.index];

  return {
    id: session._id,
    mode: session.mode,
    version: session.version,
    phase: session.phase,
    index: session.index,
    total: session.items.length,
    paused: session.paused,
    draftAnswer: session.draftAnswer,
    createdAt: session.createdAt,

    question:
      !session.paused &&
      session.phase === 'question' &&
      item
        ? {
            attemptId: item.attemptId,
            meaningVi: item.entry.meaningVi,
            partOfSpeech: item.entry.partOfSpeech,
            prefix: item.example.prefix,
            suffix: item.example.suffix,
            cells: item.cells,
          }
        : null,

    feedback:
      !session.paused &&
      session.phase === 'feedback' &&
      item &&
      session.feedback
        ? {
            ...session.feedback,
            entry: item.entry,
            example: item.example,
          }
        : null,
  };
}

async function requireReviewSession(
  userId: string,
  sessionId: string,
) {
  const session = await studySessions.findOne({
    _id: sessionId,
    userId,
    mode: 'review',
  });

  if (!session || session.mode !== 'review') {
    throw new ServiceError(
      'not-found',
      'Không tìm thấy phiên ôn tập.',
    );
  }

  return session;
}

export async function getReviewSession(
  userId: string,
  sessionId: string,
) {
  return reviewView(
    await requireReviewSession(userId, sessionId),
  );
}

export async function getActiveReviewSession(userId: string) {
  const session = await studySessions.findOne({
    userId,
    active: true,
    mode: 'review',
  });

  return session?.mode === 'review'
    ? reviewView(session)
    : null;
}

export async function createReviewSession(
  userId: string,
  limit: 10 | 20,
  collection?: 'ielts' | 'daily' | 'personal',
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

      const now = Date.now();

      const disabled = await reviewPreferences
        .find(
          { userId, reviewEnabled: false },
          { session: mongoSession },
        )
        .toArray();

      const disabledIds = new Set(
        disabled.map((item) => item.entryId),
      );

      const due = await userProgress
        .find(
          {
            userId,
            nextReviewAt: { $lte: now },
          },
          { session: mongoSession },
        )
        .sort({ nextReviewAt: 1, entryId: 1 })
        .toArray();

      const eligible = due.filter(
        (item) => !disabledIds.has(item.entryId),
      );

      const resolved = await resolveReadyEntries(
        userId,
        eligible.map((item) => item.entryId),
        mongoSession,
      );

      const entries = collection
        ? resolved.filter(
            (entry) => entry.collectionId === collection,
          )
        : resolved;

      const byId = new Map(
        entries.map((entry) => [entry.id, entry]),
      );

      const items: ReviewSession['items'] = [];

      for (const progress of eligible) {
        const entry = byId.get(progress.entryId);
        const example = entry?.examples[0];

        if (!entry || !example) continue;

        items.push({
          attemptId: randomUUID(),
          entry,
          expectedVersion: progress.version,
          example,
          cells: createMask(example.targetSurface),
        });

        if (items.length >= limit) break;
      }

      if (!items.length) {
        throw new ServiceError(
          'not-found',
          'Không có từ đến hạn phù hợp để ôn tập.',
        );
      }

      const session: ReviewSession = {
        _id: randomUUID(),
        userId,
        mode: 'review',
        topicId: null,
        active: true,
        version: 1,
        index: 0,
        phase: 'question',
        paused: false,
        draftAnswer: '',
        createdAt: now,
        items,
        feedback: null,
      };

      await studySessions.insertOne(session, {
        session: mongoSession,
      });

      return reviewView(session);
    }),
  );
}

export async function changeReviewSession(
  userId: string,
  sessionId: string,
  version: number,
  action: ReviewAction,
  answer: string,
) {
  const session = await requireReviewSession(
    userId,
    sessionId,
  );

  if (!session.active || session.version !== version) {
    throw new ServiceError(
      'conflict',
      'Phiên đã thay đổi. Hãy tải lại.',
    );
  }

  if (action === 'pause') {
    session.paused = true;
    session.draftAnswer =
      session.phase === 'question' ? answer : '';
  } else if (action === 'resume') {
    session.paused = false;
  } else if (session.paused) {
    throw new ServiceError(
      'conflict',
      'Hãy tiếp tục phiên trước khi thao tác.',
    );
  } else if (
    action === 'draft' &&
    session.phase === 'question'
  ) {
    session.draftAnswer = answer;
  } else if (action === 'next') {
    // Nếu người dùng vừa bỏ tick từ đang được hỏi,
    // cho phép bỏ qua mà không chấm hoặc đổi lịch ôn.
    if (session.phase === 'question') {
      const item = session.items[session.index];

      const disabled = item
        ? await reviewPreferences.findOne({
            userId,
            entryId: item.entry.id,
            reviewEnabled: false,
          })
        : null;

      if (!disabled) {
        throw new ServiceError(
          'conflict',
          'Hãy trả lời câu hiện tại trước.',
        );
      }
    } else if (session.phase !== 'feedback') {
      throw new ServiceError(
        'conflict',
        'Chưa thể chuyển câu.',
      );
    }

    session.index += 1;
    session.draftAnswer = '';
    session.feedback = null;
    session.active =
      session.index < session.items.length;
    session.phase = session.active
      ? 'question'
      : 'complete';
  } else {
    throw new ServiceError(
      'conflict',
      'Thao tác không phù hợp.',
    );
  }

  session.version += 1;

  const result = await studySessions.replaceOne(
    {
      _id: sessionId,
      userId,
      mode: 'review',
      active: true,
      version,
    },
    session,
  );

  if (result.matchedCount !== 1) {
    throw new ServiceError(
      'conflict',
      'Phiên vừa thay đổi ở tab khác. Hãy tải lại.',
    );
  }

  return reviewView(session);
}

export async function submitReviewAnswer(
  userId: string,
  sessionId: string,
  version: number,
  attemptId: string,
  answer: string,
  forgotten: boolean,
) {
  return client.withSession(async (mongoSession) =>
    mongoSession.withTransaction(async () => {
      const session = await studySessions.findOne(
        {
          _id: sessionId,
          userId,
          mode: 'review',
        },
        { session: mongoSession },
      );

      if (!session || session.mode !== 'review') {
        throw new ServiceError(
          'not-found',
          'Không tìm thấy phiên ôn tập.',
        );
      }

      const receipt = await studyReceipts.findOne(
        {
          _id: attemptId,
          userId,
          sessionId,
        },
        { session: mongoSession },
      );

      if (receipt) {
        return {
          kind: 'committed' as const,
          progress: receipt.progress,
          event: receipt.event,
          session: reviewView(session),
        };
      }

      const item = session.items[session.index];

      if (
        !item ||
        !session.active ||
        session.paused ||
        session.phase !== 'question' ||
        session.version !== version ||
        item.attemptId !== attemptId
      ) {
        throw new ServiceError(
          'conflict',
          'Lượt trả lời đã cũ. Hãy tải lại phiên.',
        );
      }

      const disabled = await reviewPreferences.findOne(
        {
          userId,
          entryId: item.entry.id,
          reviewEnabled: false,
        },
        { session: mongoSession },
      );

      if (disabled) {
        throw new ServiceError(
          'conflict',
          'Từ này đã tắt ôn tập. Bấm Tiếp tục để bỏ qua.',
        );
      }

      const before = await userProgress.findOne<Progress>(
        {
          userId,
          entryId: item.entry.id,
        },
        {
          session: mongoSession,
          projection: { _id: 0, userId: 0 },
        },
      );

      const now = Date.now();

      if (
        !before ||
        before.version !== item.expectedVersion ||
        before.nextReviewAt > now
      ) {
        throw new ServiceError(
          'conflict',
          'Tiến độ từ đã thay đổi hoặc chưa đến hạn.',
        );
      }

      if (!forgotten) {
        validateClozeAnswer(answer, item.cells);
      }

      const correct = forgotten
        ? false
        : gradeAnswer(
            answer,
            item.example.acceptedAnswers,
          );

      const progress = reviewProgress(
        before,
        correct,
        now,
      );

      const event: ReviewEvent = {
        id: attemptId,
        sessionId,
        entryId: item.entry.id,
        mode: 'review',
        correct,
        reviewedAt: now,
        beforeLevel: before.level,
        afterLevel: progress.level,
        nextReviewAt: progress.nextReviewAt,
        entryRevision: item.entry.revision,
        policy: POLICY,
      };

      const updated = await userProgress.updateOne(
        {
          userId,
          entryId: item.entry.id,
          version: before.version,
        },
        { $set: progress },
        { session: mongoSession },
      );

      if (updated.matchedCount !== 1) {
        throw new ServiceError(
          'conflict',
          'Tiến độ vừa thay đổi. Hãy tải lại.',
        );
      }

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

      session.phase = 'feedback';
      session.version += 1;
      session.draftAnswer = '';
      session.feedback = { progress, event };

      await studySessions.replaceOne(
        { _id: sessionId, userId },
        session,
        { session: mongoSession },
      );

      return {
        kind: 'committed' as const,
        progress,
        event,
        session: reviewView(session),
      };
    }),
  );
}