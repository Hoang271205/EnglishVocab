import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import { updateSettingsSchema } from './schema.js';
import {
  getUserSettings,
  updateUserSettings,
} from './service.js';
import type { AppSettings } from './schema.js';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

settingsRouter.get('/', async (request, response) => {
  const result = await getUserSettings(
    request.session.userId!,
  );

  response.json(result);
});

settingsRouter.patch(
  '/',
  requireJsonWrite,
  async (request, response) => {
    const input = updateSettingsSchema.parse(
      request.body,
    );

    const changes = Object.fromEntries(
      Object.entries(input.changes).filter(
        ([, value]) => value !== undefined,
      ),
    ) as Partial<AppSettings>;

    const result = await updateUserSettings(
      request.session.userId!,
      input.expectedRevision,
      changes,
    );

    response.json(result);
  },
);