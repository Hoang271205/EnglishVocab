import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { resolve } from 'node:path';
import { z } from 'zod';
import { db } from './database/mongo.js';
import { createSessionMiddleware } from './middleware/session.js';
import { authRouter } from './modules/auth/router.js';
import { libraryRouter } from './modules/library/router.js';
import { progressRouter } from './modules/progress/router.js';
import { studyRouter } from './modules/study/router.js';
import { ServiceError } from '../../src/domain/types.js';
import { personalRouter } from './modules/personal/router.js';
import { settingsRouter } from './modules/settings/router.js';
import { transfersRouter } from './modules/transfers/router.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use('/api/transfers', express.json({ limit: '2mb' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_request, response) => {
    try {
      await db.command({ ping: 1 });

      response.status(200).json({
        status: 'ok',
        service: 'EnglishVocab API',
        database: 'connected',
      });
    } catch {
      response.status(503).json({
        status: 'unavailable',
        service: 'EnglishVocab API',
        database: 'disconnected',
      });
    }
  });

  app.use(createSessionMiddleware());
  app.use('/api/auth', authRouter);
  app.use('/api/personal', personalRouter);
  app.use('/api/library', libraryRouter);
  app.use('/api/progress', progressRouter);
  app.use('/api/study', studyRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/transfers', transfersRouter);

  app.use('/api', (_request, response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'API không tồn tại.',
      },
    });
  });

  app.use(
    express.static(resolve('dist'), {
      dotfiles: 'deny',
    }),
  );

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'API không tồn tại.',
      },
    });
  });

  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _request,
    response,
    _next,
  ) => {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Thông tin gửi lên không hợp lệ.',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
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

    const invalidJson =
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.parse.failed';

    const payloadTooLarge =
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.too.large';

    if (payloadTooLarge) {
      response.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Dữ liệu gửi lên vượt giới hạn cho phép.',
        },
      });
      return;
    }

    response.status(invalidJson ? 400 : 500).json({
      error: {
        code: invalidJson ? 'INVALID_JSON' : 'SERVER_ERROR',
        message: invalidJson
          ? 'Nội dung JSON không hợp lệ.'
          : 'Không xử lý được yêu cầu. Hãy thử lại.',
      },
    });
  };

  app.use(errorHandler);

  return app;
}