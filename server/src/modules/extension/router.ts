import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { MongoServerError } from 'mongodb';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import { transferSchema } from '../transfers/schema.js';
import { receiveTransfer } from '../transfers/service.js';
import { importReceipts } from '../transfers/collections.js';
import { personalEntries } from '../personal/collections.js';
import { sharedEntries } from '../library/collections.js';

import { extensionAuthRouter } from './auth-router.js';
import {
  authenticateExtension,
  ExtensionAccessError,
  issueExtensionGrant,
  touchExtensionGrant,
} from './access.js';

export const extensionRouter = Router();
extensionRouter.use('/auth', extensionAuthRouter);
extensionRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});
const handle =
  (handler: RequestHandler): RequestHandler =>
  async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      if (error instanceof ExtensionAccessError) {
        response.status(401).json({
          error: {
            code: 'EXTENSION_UNAUTHENTICATED',
            message: error.message,
          },
        });
        return;
      }
      if (error instanceof MongoServerError && error.code === 11000) {
        response.status(409).json({
          error: {
            code: 'RETRY_CAPTURE',
            message: 'Có lượt lưu đồng thời. Hãy thử lại cùng lượt lưu.',
          },
        });
        return;
      }
      next(error);
    }
  };
const limiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Lưu quá nhanh. Hãy chờ một chút rồi thử lại.',
    },
  },
});
extensionRouter.post(
  '/connect',
  requireAuth,
  requireJsonWrite,
  limiter,
  handle(async (request, response) => {
    const { deviceId } = z
      .object({ deviceId: z.uuid() })
      .strict()
      .parse(request.body);
    const ownerId = request.session.userId!;
    const grant = await issueExtensionGrant(
      ownerId,
      request.sessionID,
      deviceId,
      request.session.cookie.expires ?? undefined,
      request.session.authVersion ?? 0,
    );
    response.json({ ownerId, apiOrigin: env.APP_ORIGIN, ...grant });
  }),
);
extensionRouter.get(
  '/me',
  limiter,
  handle(async (request, response) => {
    const grant = await authenticateExtension(request.get('authorization'));
    response.json({
      ownerId: grant.userId,
      expiresAt: grant.expiresAt.getTime(),
    });
  }),
);
extensionRouter.post(
  '/captures',
  limiter,
  handle(async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ error: { message: 'Cần gửi JSON.' } });
      return;
    }
    const grant = await authenticateExtension(request.get('authorization'));
    const body = z
      .object({ item: transferSchema.shape.captures.element })
      .strict()
      .parse(request.body);
    const transfer = transferSchema.parse({
      protocol: 1,
      type: 'capture-transfer',
      transferId: body.item.capture.id,
      captures: [body.item],
    });
    const ack = await receiveTransfer(grant.userId, transfer, (session) =>
      touchExtensionGrant(grant, session),
    );
    const receipt = await importReceipts.findOne({
      userId: grant.userId,
      captureId: body.item.capture.id,
    });
    if (!receipt || receipt.deleted) {
      response.status(409).json({
        error: {
          code: 'CAPTURE_DELETED',
          message:
            'Lượt lưu này đã bị xoá. Hãy đóng popup và tra lại để tạo lượt mới.',
        },
      });
      return;
    }
    const personal = await personalEntries.findOne({
      userId: grant.userId,
      'entry.id': receipt.entryId,
    });
    const entry =
      personal?.entry ??
      (await sharedEntries.findOne(
        { id: receipt.entryId },
        { projection: { _id: 0 } },
      ));
    if (!entry) {
      response
        .status(409)
        .json({ error: { message: 'Từ vừa bị xoá. Hãy tra lại.' } });
      return;
    }
    response.status(ack.summary.duplicateCaptures ? 200 : 201).json({
      saved: true,
      duplicate: ack.summary.duplicateCaptures > 0,
      ownerId: grant.userId,
      entry,
    });
  }),
);
