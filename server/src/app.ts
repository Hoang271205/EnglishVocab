import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { db } from './database/mongo.js';
import { createSessionMiddleware } from './middleware/session.js';
import { authRouter } from './modules/auth/router.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
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
    const invalidJson =
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.parse.failed';

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