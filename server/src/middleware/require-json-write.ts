import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const requireJsonWrite: RequestHandler = (
  request,
  response,
  next,
) => {
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
};