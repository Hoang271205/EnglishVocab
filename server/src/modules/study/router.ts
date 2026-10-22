import { Router } from 'express';
import type { RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import { z } from 'zod';
import { ServiceError } from '../../../../src/domain/types.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import {
  changeLearnSession,
  createLearnSession,
  createPersonalLearnSession,
  getActiveLearnSession,
  getLearnSession,
  submitLearnAnswer,
} from './learn-service.js';
import {
  changeReviewSession,
  createReviewSession,
  getActiveReviewSession,
  getReviewSession,
  submitReviewAnswer,
} from './review-service.js';

export const studyRouter = Router();

studyRouter.use(requireAuth);

studyRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

const sessionIdSchema = z.uuid();

const versionSchema = z
  .number()
  .int()
  .min(1)
  .max(Number.MAX_SAFE_INTEGER);

const createSchema = z
  .object({
    topicId: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/),
    limit: z.union([z.literal(5), z.literal(10)]).default(10),
  })
  .strict();

const actionSchema = z
  .object({
    version: versionSchema,
    action: z.enum([
      'recall',
      'front',
      'pause',
      'resume',
      'draft',
    ]),
    answer: z.string().max(1000).default(''),
  })
  .strict();

const answerSchema = z
  .object({
    version: versionSchema,
    attemptId: z.uuid(),
    answer: z.string().trim().min(1).max(1000),
  })
  .strict();

function handle(handler: RequestHandler): RequestHandler {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Thông tin phiên học không hợp lệ.',
          },
        });
        return;
      }

      if (error instanceof ServiceError) {
        const status =
          error.code === 'not-found'
            ? 404
            : error.code === 'conflict'
              ? 409
              : error.code === 'validation'
                ? 400
                : 500;

        response.status(status).json({
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        response.status(409).json({
          error: {
            code: 'CONFLICT',
            message:
              'Dữ liệu vừa thay đổi. Hãy tải lại phiên đang dở.',
          },
        });
        return;
      }

      next(error);
    }
  };
}

// Phải đặt /active trước /:sessionId.
studyRouter.get(
  '/learn/active',
  handle(async (request, response) => {
    const session = await getActiveLearnSession(
      request.session.userId!,
    );

    response.json({ session });
  }),
);

studyRouter.post(
  '/learn',
  requireJsonWrite,
  handle(async (request, response) => {
    const input = createSchema.parse(request.body);

    const session = await createLearnSession(
      request.session.userId!,
      input.topicId,
      input.limit,
    );

    response.status(201).json({ session });
  }),
);

studyRouter.get(
  '/learn/:sessionId',
  handle(async (request, response) => {
    const sessionId = sessionIdSchema.parse(
      request.params.sessionId,
    );

    const session = await getLearnSession(
      request.session.userId!,
      sessionId,
    );

    response.json({ session });
  }),
);

studyRouter.post(
  '/learn/:sessionId/action',
  requireJsonWrite,
  handle(async (request, response) => {
    const sessionId = sessionIdSchema.parse(
      request.params.sessionId,
    );

    const input = actionSchema.parse(request.body);

    const session = await changeLearnSession(
      request.session.userId!,
      sessionId,
      input.version,
      input.action,
      input.answer,
    );

    response.json({ session });
  }),
);

studyRouter.post(
  '/learn/:sessionId/answer',
  requireJsonWrite,
  handle(async (request, response) => {
    const sessionId = sessionIdSchema.parse(
      request.params.sessionId,
    );

    const input = answerSchema.parse(request.body);

    const result = await submitLearnAnswer(
      request.session.userId!,
      sessionId,
      input.version,
      input.attemptId,
      input.answer,
    );

    response.json(result);
  }),
);

const createReviewSchema = z
  .object({
    limit: z
      .union([z.literal(10), z.literal(20)])
      .default(10),
    collection: z
  .enum(['ielts', 'daily', 'personal'])
  .optional(),
  })
  .strict();

const reviewActionSchema = z
  .object({
    version: versionSchema,
    action: z.enum(['next', 'pause', 'resume', 'draft']),
    answer: z.string().max(1000).default(''),
  })
  .strict();

const reviewAnswerSchema = z
  .object({
    version: versionSchema,
    attemptId: z.uuid(),
    answer: z.string().max(1000).default(''),
    forgotten: z.boolean().default(false),
  })
  .strict()
  .refine(
    (input) =>
      input.forgotten || input.answer.trim().length > 0,
    {
      message: 'Hãy nhập đáp án hoặc chọn Không nhớ.',
      path: ['answer'],
    },
  );

studyRouter.get(
  '/review/active',
  handle(async (request, response) => {
    const session = await getActiveReviewSession(
      request.session.userId!,
    );

    response.json({ session });
  }),
);

studyRouter.post(
  '/review',
  requireJsonWrite,
  handle(async (request, response) => {
    const input = createReviewSchema.parse(request.body);

    const session = await createReviewSession(
      request.session.userId!,
      input.limit,
      input.collection,
    );

    response.status(201).json({ session });
  }),
);

studyRouter.get(
  '/review/:sessionId',
  handle(async (request, response) => {
    const sessionId = sessionIdSchema.parse(
      request.params.sessionId,
    );

    const session = await getReviewSession(
      request.session.userId!,
      sessionId,
    );

    response.json({ session });
  }),
);

studyRouter.post(
  '/review/:sessionId/action',
  requireJsonWrite,
  handle(async (request, response) => {
    const sessionId = sessionIdSchema.parse(
      request.params.sessionId,
    );

    const input = reviewActionSchema.parse(request.body);

    const session = await changeReviewSession(
      request.session.userId!,
      sessionId,
      input.version,
      input.action,
      input.answer,
    );

    response.json({ session });
  }),
);

studyRouter.post(
  '/review/:sessionId/answer',
  requireJsonWrite,
  handle(async (request, response) => {
    const sessionId = sessionIdSchema.parse(
      request.params.sessionId,
    );

    const input = reviewAnswerSchema.parse(request.body);

    const result = await submitReviewAnswer(
      request.session.userId!,
      sessionId,
      input.version,
      input.attemptId,
      input.answer,
      input.forgotten,
    );

    response.json(result);
  }),
);

const personalLearnSchema = z
  .object({
    entryIds: z
      .array(z.string().regex(/^personal-[0-9a-f-]{36}$/))
      .min(1)
      .max(100),
    limit: z.union([z.literal(5), z.literal(10)]).default(10),
  })
  .strict();

studyRouter.post(
  '/personal/learn',
  requireJsonWrite,
  handle(async (request, response) => {
    const input = personalLearnSchema.parse(request.body);

    const session = await createPersonalLearnSession(
      request.session.userId!,
      input.entryIds,
      input.limit,
    );

    response.status(201).json({ session });
  }),
);