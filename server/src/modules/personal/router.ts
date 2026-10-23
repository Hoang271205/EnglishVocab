import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireJsonWrite } from '../../middleware/require-json-write.js';
import {
  createPersonalEntry,
  deletePersonalEntry,
  getPersonalEntry,
  listPersonalEntries,
  updatePersonalEntry,
} from './service.js';

export const personalRouter = Router();

personalRouter.use(requireAuth);

personalRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

const entryIdSchema = z
  .string()
  .regex(/^personal-[0-9a-f-]{36}$/);

const entryInput = z.record(z.string(), z.unknown());

const createSchema = z
  .object({
    entry: entryInput,
  })
  .strict();

const updateSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    entry: entryInput,
  })
  .strict();

const deleteSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
  })
  .strict();

personalRouter.get('/', async (request, response) => {
  const entries = await listPersonalEntries(
    request.session.userId!,
  );

  response.json({ entries });
});

personalRouter.get('/:entryId', async (request, response) => {
  const entryId = entryIdSchema.parse(
    request.params.entryId,
  );

  const entry = await getPersonalEntry(
    request.session.userId!,
    entryId,
  );

  response.json({ entry });
});

personalRouter.post(
  '/',
  requireJsonWrite,
  async (request, response) => {
    const input = createSchema.parse(request.body);

    const entry = await createPersonalEntry(
      request.session.userId!,
      input.entry,
    );

    response.status(201).json({ entry });
  },
);

personalRouter.put(
  '/:entryId',
  requireJsonWrite,
  async (request, response) => {
    const entryId = entryIdSchema.parse(
      request.params.entryId,
    );

    const input = updateSchema.parse(request.body);

    const result = await updatePersonalEntry(
      request.session.userId!,
      entryId,
      input.expectedRevision,
      input.entry,
    );

    response.json(result);
  },
);

personalRouter.delete(
  '/:entryId',
  requireJsonWrite,
  async (request, response) => {
    const entryId = entryIdSchema.parse(
      request.params.entryId,
    );

    const input = deleteSchema.parse(request.body);

    await deletePersonalEntry(
      request.session.userId!,
      entryId,
      input.expectedRevision,
    );

    response.status(204).end();
  },
);