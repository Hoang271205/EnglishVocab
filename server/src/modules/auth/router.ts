import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '../../middleware/session.js';
import { DUMMY_PASSWORD_HASH, verifyPassword } from './password.js';
import { publicUser, users } from './users.js';
import { revokeSessionExtensions } from '../extension/access.js';

export const authRouter = Router();

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
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

authRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

// Các thao tác thay đổi session phải gửi JSON từ origin được phép.
authRouter.use((request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    next();
    return;
  }

  const origin = request.get('origin');

  if (origin && origin !== env.APP_ORIGIN) {
    response.status(403).json({
      error: {
        code: 'INVALID_ORIGIN',
        message: 'Nguồn yêu cầu không được phép.',
      },
    });
    return;
  }

  if (!request.is('application/json')) {
    response.status(415).json({
      error: {
        code: 'JSON_REQUIRED',
        message: 'Yêu cầu phải sử dụng application/json.',
      },
    });
    return;
  }

  next();
});

authRouter.post('/login', loginLimiter, async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Email hoặc mật khẩu không hợp lệ.',
      },
    });
    return;
  }

  const user = await users.findOne({ email: parsed.data.email });

  const validPassword = await verifyPassword(
    parsed.data.password,
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

  await revokeSessionExtensions(request.sessionID);

  // Tạo session ID mới sau khi đăng nhập.
  await new Promise<void>((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  request.session.userId = user._id;

  await new Promise<void>((resolve, reject) => {
    request.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  response.json({ user: publicUser(user) });
});

authRouter.get('/me', async (request, response) => {
  const userId = request.session.userId;
  const user = userId ? await users.findOne({ _id: userId }) : null;

  if (!user || !user.active) {
    response.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập.',
      },
    });
    return;
  }

  response.json({ user: publicUser(user) });
});

authRouter.post('/logout', async (request, response) => {
  await revokeSessionExtensions(request.sessionID);
  await new Promise<void>((resolve, reject) => {
    request.session.destroy((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
  response.status(204).end();
});
