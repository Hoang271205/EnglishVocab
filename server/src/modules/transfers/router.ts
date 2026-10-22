import { Router } from 'express';
import { MongoServerError } from 'mongodb';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import { savedSources } from './collections.js';
import { transferSchema } from './schema.js';
import { receiveTransfer } from './service.js';
import { exportExtensionSnapshot } from './snapshot-service.js';

export const transfersRouter = Router();

transfersRouter.use(requireAuth);

transfersRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

transfersRouter.post(
  '/receive',
  requireJsonWrite,
  async (request, response, next) => {
    try {
      const transfer = transferSchema.parse(request.body);

      const result = await receiveTransfer(
        request.session.userId!,
        transfer,
      );

      response.json(result);
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === 11000
      ) {
        response.status(409).json({
          error: {
            code: 'CONCURRENT_IMPORT',
            message:
              'Có lượt nhập đồng thời. Hãy gửi lại cùng hàng đợi.',
          },
        });
        return;
      }

      next(error);
    }
  },
);

transfersRouter.get(
  '/sources/:entryId',
  async (request, response) => {
    const entryId = z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/)
      .parse(request.params.entryId);

    const sources = await savedSources
      .find(
        {
          userId: request.session.userId!,
          entryId,
        },
        {
          projection: {
            _id: 0,
            userId: 0,
          },
        },
      )
      .sort({ capturedAt: -1 })
      .toArray();

    response.json({ sources });
  },
);
transfersRouter.post(
  '/snapshot',
  requireJsonWrite,
  async (request, response) => {
    z.object({}).strict().parse(request.body);

    const result = await exportExtensionSnapshot(
      request.session.userId!,
    );

    response.json(result);
  },
);