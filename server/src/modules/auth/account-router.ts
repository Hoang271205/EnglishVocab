import { runInBackground } from '../../runtime/background.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { MongoServerError } from 'mongodb';
import { z } from 'zod';
import { client } from '../../database/mongo.js';
import { extensionGrants } from '../extension/access.js';
import { hashPassword } from './password.js';
import { users, publicUser } from './users.js';
import type { User } from './users.js';
import { signIn } from './sign-in.js';
import { passwordResets } from './reset-store.js';
import { mailConfigured, sendResetMail } from './reset-mail.js';

export const accountRouter = Router();
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự.').max(128);
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Bạn đã yêu cầu quá nhiều lần. Hãy thử lại sau.',
      },
    },
  });

accountRouter.post('/register', limiter(5), async (request, response) => {
  const input = z
    .object({ name: z.string().trim().min(1).max(80), email, password })
    .strict()
    .parse(request.body);
  const user: User = {
    _id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'learner',
    active: true,
    createdAt: new Date(),
    authVersion: 0,
  };
  try {
    await users.insertOne(user);
  } catch (error) {
    if (!(error instanceof MongoServerError && error.code === 11000))
      throw error;
    response.status(409).json({
      error: {
        code: 'EMAIL_EXISTS',
        message: 'Email đã được sử dụng. Hãy đăng nhập hoặc đặt lại mật khẩu.',
      },
    });
    return;
  }
  await signIn(request, user);
  response.status(201).json({ user: publicUser(user) });
});

accountRouter.post(
  '/forgot-password',
  limiter(5),
  async (request, response) => {
    const input = z.object({ email }).strict().parse(request.body);
    if (!mailConfigured()) {
      response.status(503).json({
        error: {
          code: 'MAIL_UNAVAILABLE',
          message:
            'Chưa cấu hình email khôi phục. Vui lòng liên hệ người quản lý.',
        },
      });
      return;
    }
    const user = await users.findOne({ email: input.email, active: true });
    if (user) {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = digest(token);
      const now = new Date();
      let prepared = false;
      try {
        await passwordResets.updateOne(
          {
            _id: user._id,
            requestedAt: { $lte: new Date(now.getTime() - 60000) },
          },
          {
            $set: {
              tokenHash,
              requestedAt: now,
              expiresAt: new Date(now.getTime() + 15 * 60000),
            },
          },
          { upsert: true },
        );
        prepared = true;
      } catch (error) {
        if (!(error instanceof MongoServerError && error.code === 11000))
          throw error;
      }
      // Do not expose account existence or SMTP timing to the requester.
      if (prepared)
        runInBackground(
          sendResetMail(user.email, token).catch(async () => {
            console.error(
              'Không gửi được email khôi phục. Kiểm tra cấu hình SMTP.',
            );
            await passwordResets
              .deleteOne({ _id: user._id, tokenHash })
              .catch(() => {});
          }),
        );
    }
    response.json({
      message:
        'Nếu email có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.',
    });
  },
);

class InvalidResetToken extends Error {}
accountRouter.post(
  '/reset-password',
  limiter(10),
  async (request, response) => {
    const input = z
      .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password })
      .strict()
      .parse(request.body);
    const passwordHash = await hashPassword(input.password);
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const reset = await passwordResets.findOneAndDelete(
          { tokenHash: digest(input.token), expiresAt: { $gt: new Date() } },
          { session },
        );
        if (!reset) throw new InvalidResetToken();
        const result = await users.updateOne(
          { _id: reset._id, active: true },
          {
            $set: { passwordHash, passwordChangedAt: new Date() },
            $inc: { authVersion: 1 },
          },
          { session },
        );
        if (!result.matchedCount) throw new InvalidResetToken();
        await extensionGrants.deleteMany({ userId: reset._id }, { session });
      });
      response.json({
        message: 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',
      });
    } catch (error) {
      if (!(error instanceof InvalidResetToken)) throw error;
      response.status(400).json({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message:
            'Liên kết không hợp lệ, đã dùng hoặc hết hạn. Hãy yêu cầu liên kết mới.',
        },
      });
    } finally {
      await session.endSession();
    }
  },
);
