import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
import {
  userProgress,
  reviewPreferences,
} from '../progress/collections.js';
import { savedSources, extensionEntryLinks } from '../transfers/collections.js';
import { getUserSettings } from '../settings/service.js';

export const notebookRouter = Router();
notebookRouter.use(requireAuth);
notebookRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

async function notebook(userId: string) {
  const [progress, preferences, personal, captured] = await Promise.all([
    userProgress
      .find({ userId }, { projection: { _id: 0, userId: 0 } })
      .toArray(),
    reviewPreferences
      .find({ userId }, { projection: { _id: 0, entryId: 1, reviewEnabled: 1 } })
      .toArray(),
    personalEntries
      .find({ userId }, { projection: { _id: 0, entry: 1 } })
      .sort({ createdAt: -1 })
      .toArray(),
    savedSources.distinct('entryId', { userId }),
  ]);
  const shared = await sharedEntries
    .find(
      {
        _id: {
          $in: [
            ...new Set([
              ...progress.map((item) => item.entryId),
              ...captured,
            ]),
          ],
        },
      },
      { projection: { _id: 0 } },
    )
    .toArray();
  const capturedIds = new Set(captured);
  const progressById = new Map(progress.map((item) => [item.entryId, item]));
  const enabledById = new Map(
    preferences.map((item) => [item.entryId, item.reviewEnabled]),
  );
  return [...shared, ...personal.map((item) => item.entry)].map((entry) => ({
    entry,
    saved: capturedIds.has(entry.id),
    progress: progressById.get(entry.id) ?? null,
    reviewEnabled: enabledById.get(entry.id) ?? true,
  }));
}

notebookRouter.get('/', async (request, response) => {
  response.json({ rows: await notebook(request.session.userId!) });
});

// Export only the authenticated learner's data, never credentials or sessions.
notebookRouter.get('/export', async (request, response) => {
  const userId = request.session.userId!;
  const [rows, settings, sources] = await Promise.all([
    notebook(userId),
    getUserSettings(userId),
    savedSources
      .find({ userId }, { projection: { _id: 0, userId: 0 } })
      .toArray(),
  ]);
  response.json({
    format: 'englishvocab-account-export',
    version: 1,
    exportedAt: Date.now(),
    rows,
    settings,
    sources,
  });
});

notebookRouter.get('/extension-ids/:entryId', async (request, response) => {
  const links = await extensionEntryLinks
    .find(
      {
        userId: request.session.userId!,
        entryId: request.params.entryId,
      },
      { projection: { _id: 0, sourceEntryId: 1 } },
    )
    .toArray();
  response.json({ ids: links.map((item) => item.sourceEntryId) });
});
