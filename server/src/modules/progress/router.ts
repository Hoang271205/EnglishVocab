import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import { sharedEntries } from '../library/collections.js';
import {
  reviewPreferences,
  userProgress,
} from './collections.js';

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

const entryIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/);

const reviewPreferenceSchema = z
  .object({
    reviewEnabled: z.boolean(),
  })
  .strict();

// Tiến độ của tài khoản đang đăng nhập.
progressRouter.get('/', async (request, response) => {
  const userId = request.session.userId!;

  const [progress, preferences] = await Promise.all([
    userProgress
      .find({ userId }, { projection: { _id: 0, userId: 0 } })
      .sort({ learnedAt: -1, entryId: 1 })
      .toArray(),

    reviewPreferences
      .find(
        { userId },
        { projection: { _id: 0, userId: 0 } },
      )
      .toArray(),
  ]);

  const preferenceByEntryId = new Map(
    preferences.map((item) => [
      item.entryId,
      item.reviewEnabled,
    ]),
  );

  response.json({
    progress: progress.map((item) => ({
      ...item,
      reviewEnabled:
        preferenceByEntryId.get(item.entryId) ?? true,
    })),
  });
});

// Thống kê cho trang Ôn tập.
progressRouter.get('/summary', async (request, response) => {
  const userId = request.session.userId!;
  const now = Date.now();

  const [progress, disabledPreferences] = await Promise.all([
    userProgress.find({ userId }).toArray(),

    reviewPreferences
      .find({
        userId,
        reviewEnabled: false,
      })
      .toArray(),
  ]);

  const disabledIds = new Set(
    disabledPreferences.map((item) => item.entryId),
  );

  const levels: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let dueCount = 0;
  let enabledCount = 0;
  let masteredCount = 0;
  let nextReviewAt: number | null = null;

  for (const item of progress) {
    levels[item.level] += 1;

    if (item.level === 5) {
      masteredCount += 1;
    }

    if (disabledIds.has(item.entryId)) {
      continue;
    }

    enabledCount += 1;

    if (item.nextReviewAt <= now) {
      dueCount += 1;
    } else if (
      nextReviewAt === null ||
      item.nextReviewAt < nextReviewAt
    ) {
      nextReviewAt = item.nextReviewAt;
    }
  }

  response.json({
    summary: {
      learnedCount: progress.length,
      masteredCount,
      enabledCount,
      disabledCount: progress.length - enabledCount,
      dueCount,
      nextReviewAt,
      levels,
      serverTime: now,
    },
  });
});

// Bật/tắt ôn tập, không thay đổi level hoặc lịch ôn.
progressRouter.patch(
  '/:entryId/review-preference',
  requireJsonWrite,
  async (request, response) => {
    const parsedId = entryIdSchema.safeParse(
      request.params.entryId,
    );

    const parsedBody = reviewPreferenceSchema.safeParse(
      request.body,
    );

    if (!parsedId.success || !parsedBody.success) {
      response.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Thông tin bật/tắt ôn tập không hợp lệ.',
        },
      });
      return;
    }

    const entry = await sharedEntries.findOne(
      {
        _id: parsedId.data,
        contentStatus: 'ready',
      },
      { projection: { _id: 1 } },
    );

    if (!entry) {
      response.status(404).json({
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Không tìm thấy từ trong thư viện.',
        },
      });
      return;
    }

    const preference = {
      userId: request.session.userId!,
      entryId: parsedId.data,
      reviewEnabled: parsedBody.data.reviewEnabled,
      updatedAt: Date.now(),
    };

    // ID cố định giúp các yêu cầu đồng thời cùng ghi một document.
    const preferenceId = JSON.stringify([
      preference.userId,
      preference.entryId,
    ]);

    await reviewPreferences.updateOne(
      { _id: preferenceId },
      { $set: preference },
      { upsert: true },
    );

    response.json({
      preference: {
        entryId: preference.entryId,
        reviewEnabled: preference.reviewEnabled,
        updatedAt: preference.updatedAt,
      },
    });
  },
);