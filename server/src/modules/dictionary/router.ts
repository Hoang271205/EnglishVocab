import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { exampleSuggestionInput } from '../../../../src/dictionary/exampleSuggestion.js';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import {
  authenticateExtension,
  ExtensionAccessError,
} from '../extension/access.js';
import { generateExample } from './generate-example.js';

export const dictionaryRouter = Router();
const cached = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const limit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: (_request, response) => response.locals.exampleUserId as string,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { message: 'Bạn đã tra quá nhiều ví dụ. Hãy thử lại sau.' },
  },
});

dictionaryRouter.post(
  '/example',
  async (request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    const authorization = request.get('authorization');
    if (!authorization) {
      requireJsonWrite(request, response, () => {
        void Promise.resolve(
          requireAuth(request, response, () => {
            response.locals.exampleUserId = request.session.userId;
            next();
          }),
        ).catch(next);
      });
      return;
    }

    if (!request.is('application/json')) {
      response.status(415).json({ error: { message: 'Cần gửi JSON.' } });
      return;
    }
    try {
      const grant = await authenticateExtension(authorization);
      response.locals.exampleUserId = grant.userId;
      next();
    } catch (error) {
      if (!(error instanceof ExtensionAccessError)) throw error;
      response.status(401).json({
        error: { message: 'Hãy đăng nhập lại để nhận câu ví dụ.' },
      });
    }
  },
  limit,
  async (request, response) => {
    const input = exampleSuggestionInput.parse(request.body);
    if (!env.OPENAI_API_KEY) {
      response.json({ sentence: null });
      return;
    }
    const key = JSON.stringify(input);
    const found = cached.get(key);
    if (found) {
      response.json({ sentence: found });
      return;
    }

    let work = pending.get(key);
    if (!work) {
      if (pending.size >= 16) {
        response.status(503).json({
          error: { message: 'Dịch vụ câu ví dụ đang bận. Hãy thử lại sau.' },
        });
        return;
      }
      work = generateExample(input, {
        key: env.OPENAI_API_KEY,
        model: env.EXAMPLE_AI_MODEL,
      })
        .then((sentence) => {
          if (sentence) {
            if (cached.size >= 500) cached.delete(cached.keys().next().value!);
            cached.set(key, sentence);
          }
          return sentence;
        })
        .finally(() => pending.delete(key));
      pending.set(key, work);
    }

    try {
      response.json({ sentence: await work });
    } catch {
      response.status(502).json({
        error: { message: 'Chưa lấy được câu ví dụ. Hãy thử lại sau.' },
      });
    }
  },
);
