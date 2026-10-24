import { listNotebook, notebookQuery } from './list.js';
import { notebookDetail, lookupNotebook } from './detail.js';
import { z } from 'zod';
import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { sharedEntries } from '../library/collections.js';
import { personalEntries } from '../personal/collections.js';
import { userProgress, reviewPreferences } from '../progress/collections.js';
import {
  importReceipts,
  extensionEntryLinks,
} from '../transfers/collections.js';
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
      .find(
        { userId },
        { projection: { _id: 0, entryId: 1, reviewEnabled: 1 } },
      )
      .toArray(),
    personalEntries
      .find({ userId }, { projection: { _id: 0, entry: 1 } })
      .sort({ createdAt: -1 })
      .toArray(),
    importReceipts.distinct('entryId', { userId, deleted: false }),
  ]);
  const shared = await sharedEntries
    .find(
      {
        _id: {
          $in: [
            ...new Set([...progress.map((item) => item.entryId), ...captured]),
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

// The UI receives at most 50 compact rows; exports keep the full format.
notebookRouter.get('/list', async (request, response) => {
  const parsed = notebookQuery.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Bộ lọc sổ tay không hợp lệ.',
      },
    });
    return;
  }
  response.json(await listNotebook(request.session.userId!, parsed.data));
});

notebookRouter.get('/entries/:entryId', async (request, response) => {
  const id = z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/)
    .safeParse(request.params.entryId);
  if (!id.success) {
    response
      .status(400)
      .json({ error: { code: 'INVALID_ID', message: 'ID từ không hợp lệ.' } });
    return;
  }
  const row = await notebookDetail(request.session.userId!, id.data);
  if (!row) {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy từ trong sổ tay.',
      },
    });
    return;
  }
  response.json({ row });
});

// Only the optional Reading tool needs a headword index, never full entry payloads.
notebookRouter.get('/words', async (request, response) => {
  const userId = request.session.userId!;
  const [progress, captured, personal] = await Promise.all([
    userProgress.find({ userId }, { projection: { entryId: 1 } }).toArray(),
    importReceipts.distinct('entryId', { userId, deleted: false }),
    personalEntries
      .find({ userId }, { projection: { 'entry.headword': 1 } })
      .toArray(),
  ]);
  const ids = [
    ...new Set([...progress.map((item) => item.entryId), ...captured]),
  ];
  const shared = ids.length
    ? await sharedEntries
        .find({ _id: { $in: ids } }, { projection: { headword: 1 } })
        .toArray()
    : [];
  response.json({
    words: [
      ...new Set([
        ...shared.map((item) => item.headword),
        ...personal.map((item) => item.entry.headword),
      ]),
    ],
  });
});

notebookRouter.get('/lookup', async (request, response) => {
  const word = z.string().trim().min(1).max(200).safeParse(request.query.word);
  if (!word.success) {
    response.status(400).json({
      error: { code: 'INVALID_QUERY', message: 'Từ tra không hợp lệ.' },
    });
    return;
  }
  response.json({
    entries: await lookupNotebook(request.session.userId!, word.data),
  });
});

// Export only the authenticated learner's data, never credentials or sessions.
notebookRouter.get('/export', async (request, response) => {
  const userId = request.session.userId!;
  const [rows, settings] = await Promise.all([
    notebook(userId),
    getUserSettings(userId),
  ]);
  response.json({
    format: 'englishvocab-account-export',
    version: 1,
    exportedAt: Date.now(),
    rows,
    settings,
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
