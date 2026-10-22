import type { RequestHandler } from 'express';
import { users } from '../modules/auth/users.js';

export const requireAuth: RequestHandler = async (
  request,
  response,
  next,
) => {
  const userId = request.session.userId;

  const user = userId
    ? await users.findOne(
        { _id: userId, active: true },
        { projection: { _id: 1 } },
      )
    : null;

  if (!user) {
    response.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Bạn cần đăng nhập.',
      },
    });
    return;
  }

  next();
};