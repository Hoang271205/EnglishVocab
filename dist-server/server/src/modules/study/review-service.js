import { randomUUID } from 'node:crypto';
import { finishReview } from './finish-review.js';
import { createMask, validateClozeAnswer, } from '../../../../src/domain/cloze.js';
import { gradeAnswer } from '../../../../src/domain/grading.js';
import { reviewProgress } from '../../../../src/domain/scheduler.js';
import { POLICY, ServiceError } from '../../../../src/domain/types.js';
import { client } from '../../database/mongo.js';
import { resolveReadyEntries } from '../entries/service.js';
import { reviewPreferences, userProgress } from '../progress/collections.js';
import { studyReceipts, studySessions } from './collections.js';
async function reviewView(session, mongoSession) {
    const item = session.items[session.index];
    // Count committed receipts so retries, reloads and ungraded skips stay accurate.
    const totals = session.phase === 'complete'
        ? ((await studyReceipts
            .aggregate([
            {
                $match: {
                    userId: session.userId,
                    sessionId: session._id,
                    'event.mode': 'review',
                },
            },
            {
                $group: {
                    _id: null,
                    answered: { $sum: 1 },
                    correct: { $sum: { $cond: ['$event.correct', 1, 0] } },
                },
            },
        ], mongoSession ? { session: mongoSession } : {})
            .toArray())[0] ?? { answered: 0, correct: 0 })
        : null;
    const preference = item && session.phase === 'question' && !session.paused
        ? await reviewPreferences.findOne({ userId: session.userId, entryId: item.entry.id }, {
            projection: { reviewEnabled: 1 },
            ...(mongoSession ? { session: mongoSession } : {}),
        })
        : null;
    return {
        reviewDisabled: preference?.reviewEnabled === false,
        id: session._id,
        mode: session.mode,
        version: session.version,
        phase: session.phase,
        index: session.index,
        total: session.items.length,
        endedEarly: session.endedEarly ?? false,
        reviewedCount: totals?.answered ?? session.reviewedCount ?? null,
        correctCount: totals?.correct ?? null,
        incorrectCount: totals ? totals.answered - totals.correct : null,
        ungradedCount: totals ? session.items.length - totals.answered : null,
        remainingCount: session.remainingCount ?? null,
        paused: session.paused,
        draftAnswer: session.draftAnswer,
        createdAt: session.createdAt,
        question: !session.paused && session.phase === 'question' && item
            ? {
                attemptId: item.attemptId,
                meaningVi: item.entry.meaningVi,
                partOfSpeech: item.entry.partOfSpeech,
                prefix: item.example.prefix,
                suffix: item.example.suffix,
                cells: item.cells,
            }
            : null,
        feedback: !session.paused &&
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
async function requireReviewSession(userId, sessionId) {
    const session = await studySessions.findOne({
        _id: sessionId,
        userId,
        mode: 'review',
    });
    if (!session || session.mode !== 'review') {
        throw new ServiceError('not-found', 'Không tìm thấy phiên ôn tập.');
    }
    return session;
}
export async function getReviewSession(userId, sessionId) {
    const session = await requireReviewSession(userId, sessionId);
    return reviewView(session);
}
export async function getActiveReviewSession(userId) {
    const session = await studySessions.findOne({
        userId,
        active: true,
        mode: 'review',
    });
    return session?.mode === 'review' ? reviewView(session) : null;
}
export async function createReviewSession(userId, limit, collection) {
    return client.withSession(async (mongoSession) => mongoSession.withTransaction(async () => {
        const active = await studySessions.findOne({ userId, active: true }, { session: mongoSession });
        if (active) {
            throw new ServiceError('conflict', 'Bạn còn phiên đang dở. Hãy tiếp tục phiên đó.');
        }
        const now = Date.now();
        const items = [];
        const batchSize = Math.max(50, limit * 2);
        let after;
        // Keyset batches bound document hydration even for a large overdue queue.
        while (items.length < limit) {
            const due = await userProgress
                .find({
                userId,
                nextReviewAt: { $lte: now },
                ...(after
                    ? {
                        $or: [
                            { nextReviewAt: { $gt: after.nextReviewAt } },
                            {
                                nextReviewAt: after.nextReviewAt,
                                entryId: { $gt: after.entryId },
                            },
                        ],
                    }
                    : {}),
            }, {
                session: mongoSession,
                projection: { entryId: 1, version: 1, nextReviewAt: 1 },
            })
                .sort({ nextReviewAt: 1, entryId: 1 })
                .limit(batchSize)
                .toArray();
            if (!due.length)
                break;
            const disabled = await reviewPreferences
                .find({
                userId,
                reviewEnabled: false,
                entryId: { $in: due.map((item) => item.entryId) },
            }, { session: mongoSession, projection: { entryId: 1 } })
                .toArray();
            const disabledIds = new Set(disabled.map((item) => item.entryId));
            const eligible = due.filter((item) => !disabledIds.has(item.entryId));
            // Resolve without locking every candidate. Only selected personal entries
            // are locked below to preserve concurrent edit/delete protection.
            const entries = await resolveReadyEntries(userId, eligible.map((item) => item.entryId), mongoSession, false);
            const byId = new Map(entries
                .filter((entry) => !collection || entry.collectionId === collection)
                .map((entry) => [entry.id, entry]));
            for (const progress of eligible) {
                const entry = byId.get(progress.entryId);
                const example = entry?.examples[0];
                if (!entry || !example)
                    continue;
                items.push({
                    attemptId: randomUUID(),
                    entry,
                    expectedVersion: progress.version,
                    example,
                    cells: createMask(example.targetSurface),
                });
                if (items.length >= limit)
                    break;
            }
            const last = due[due.length - 1];
            after = { nextReviewAt: last.nextReviewAt, entryId: last.entryId };
            if (due.length < batchSize)
                break;
        }
        const personalIds = items
            .filter((item) => item.entry.collectionId === 'personal')
            .map((item) => item.entry.id);
        if (personalIds.length)
            await resolveReadyEntries(userId, personalIds, mongoSession);
        if (!items.length) {
            throw new ServiceError('not-found', 'Không có từ đến hạn phù hợp để ôn tập.');
        }
        const session = {
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
    }));
}
export async function changeReviewSession(userId, sessionId, version, action, answer) {
    if (action === 'finish') {
        return reviewView(await finishReview(userId, sessionId, version));
    }
    const session = await requireReviewSession(userId, sessionId);
    if (!session.active || session.version !== version) {
        throw new ServiceError('conflict', 'Phiên đã thay đổi. Hãy tải lại.');
    }
    if (action === 'pause') {
        session.paused = true;
        session.draftAnswer = session.phase === 'question' ? answer : '';
    }
    else if (action === 'resume') {
        session.paused = false;
    }
    else if (session.paused) {
        throw new ServiceError('conflict', 'Hãy tiếp tục phiên trước khi thao tác.');
    }
    else if (action === 'draft' && session.phase === 'question') {
        session.draftAnswer = answer;
    }
    else if (action === 'next') {
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
                throw new ServiceError('conflict', 'Hãy trả lời câu hiện tại trước.');
            }
        }
        else if (session.phase !== 'feedback') {
            throw new ServiceError('conflict', 'Chưa thể chuyển câu.');
        }
        session.index += 1;
        session.draftAnswer = '';
        session.feedback = null;
        session.active = session.index < session.items.length;
        session.phase = session.active ? 'question' : 'complete';
    }
    else {
        throw new ServiceError('conflict', 'Thao tác không phù hợp.');
    }
    session.version += 1;
    const result = await studySessions.replaceOne({
        _id: sessionId,
        userId,
        mode: 'review',
        active: true,
        version,
    }, session);
    if (result.matchedCount !== 1) {
        throw new ServiceError('conflict', 'Phiên vừa thay đổi ở tab khác. Hãy tải lại.');
    }
    return reviewView(session);
}
export async function submitReviewAnswer(userId, sessionId, version, attemptId, answer, forgotten) {
    return client.withSession(async (mongoSession) => mongoSession.withTransaction(async () => {
        const session = await studySessions.findOne({
            _id: sessionId,
            userId,
            mode: 'review',
        }, { session: mongoSession });
        if (!session || session.mode !== 'review') {
            throw new ServiceError('not-found', 'Không tìm thấy phiên ôn tập.');
        }
        const receipt = await studyReceipts.findOne({
            _id: attemptId,
            userId,
            sessionId,
        }, { session: mongoSession });
        if (receipt) {
            return {
                kind: 'committed',
                progress: receipt.progress,
                event: receipt.event,
                session: await reviewView(session, mongoSession),
            };
        }
        const item = session.items[session.index];
        if (!item ||
            !session.active ||
            session.paused ||
            session.phase !== 'question' ||
            session.version !== version ||
            item.attemptId !== attemptId) {
            throw new ServiceError('conflict', 'Lượt trả lời đã cũ. Hãy tải lại phiên.');
        }
        const disabled = await reviewPreferences.findOne({
            userId,
            entryId: item.entry.id,
            reviewEnabled: false,
        }, { session: mongoSession });
        if (disabled) {
            throw new ServiceError('conflict', 'Từ này đã tắt ôn tập. Bấm Tiếp tục để bỏ qua.');
        }
        const before = await userProgress.findOne({
            userId,
            entryId: item.entry.id,
        }, {
            session: mongoSession,
            projection: { _id: 0, userId: 0 },
        });
        const now = Date.now();
        if (!before ||
            before.version !== item.expectedVersion ||
            before.nextReviewAt > now) {
            throw new ServiceError('conflict', 'Tiến độ từ đã thay đổi hoặc chưa đến hạn.');
        }
        if (!forgotten) {
            validateClozeAnswer(answer, item.cells, true);
        }
        const correct = forgotten
            ? false
            : gradeAnswer(answer, item.example.acceptedAnswers);
        const progress = reviewProgress(before, correct, now);
        const event = {
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
        const updated = await userProgress.updateOne({
            userId,
            entryId: item.entry.id,
            version: before.version,
        }, { $set: progress }, { session: mongoSession });
        if (updated.matchedCount !== 1) {
            throw new ServiceError('conflict', 'Tiến độ vừa thay đổi. Hãy tải lại.');
        }
        await studyReceipts.insertOne({
            _id: attemptId,
            userId,
            sessionId,
            progress,
            event,
        }, { session: mongoSession });
        session.phase = 'feedback';
        session.version += 1;
        session.draftAnswer = '';
        session.feedback = { progress, event };
        await studySessions.replaceOne({ _id: sessionId, userId }, session, {
            session: mongoSession,
        });
        return {
            kind: 'committed',
            progress,
            event,
            session: await reviewView(session, mongoSession),
        };
    }));
}
