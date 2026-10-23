import { Router } from 'express';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { env } from '../../config/env.js';

import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from '../auth/password.js';

import {
  publicUser,
  users,
} from '../auth/users.js';

import {
  authenticateExtension,
  ExtensionAccessError,
  issueNativeExtensionGrant,
  revokeExtensionGrant,
} from './access.js';

export const extensionAuthRouter = Router();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
    deviceId: z.uuid(),
  })
  .strict();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Đăng nhập sai quá nhiều lần. Hãy thử lại sau.',
    },
  },
});

const handle = (
  handler: RequestHandler,
): RequestHandler => {
  return async (request, response, next) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      if (error instanceof ExtensionAccessError) {
        response.status(401).json({
          error: {
            code: 'EXTENSION_UNAUTHENTICATED',
            message: 'Bạn cần đăng nhập lại trong extension.',
          },
        });
        return;
      }

      next(error);
    }
  };
};

extensionAuthRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

extensionAuthRouter.post(
  '/login',
  loginLimiter,
  handle(async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({
        error: {
          code: 'JSON_REQUIRED',
          message: 'Yêu cầu phải sử dụng JSON.',
        },
      });
      return;
    }

    const origin = request.get('origin');

    if (
      origin &&
      !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)
    ) {
      response.status(403).json({
        error: {
          code: 'INVALID_ORIGIN',
          message: 'Hãy đăng nhập từ giao diện extension.',
        },
      });
      return;
    }

    const input = loginSchema.parse(request.body);

    const user = await users.findOne({
      email: input.email,
    });

    const validPassword = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !user.active || !validPassword) {
      response.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email hoặc mật khẩu không đúng.',
        },
      });
      return;
    }

    const grant = await issueNativeExtensionGrant(
      user._id,
      input.deviceId,
    );

    response.json({
      connection: {
        ownerId: user._id,
        apiOrigin: env.APP_ORIGIN,
        ...grant,
      },

      user: publicUser(user),
    });
  }),
);

extensionAuthRouter.get(
  '/me',
  handle(async (request, response) => {
    const grant = await authenticateExtension(
      request.get('authorization'),
    );

    const user = await users.findOne({
      _id: grant.userId,
      active: true,
    });

    if (!user) {
      throw new ExtensionAccessError(
        'Tài khoản không còn khả dụng.',
      );
    }

    response.json({
      user: publicUser(user),
      expiresAt: grant.expiresAt.getTime(),
    });
  }),
);

extensionAuthRouter.post(
  '/logout',
  handle(async (request, response) => {
    await revokeExtensionGrant(
      request.get('authorization'),
    );

    response.status(204).end();
  }),
);