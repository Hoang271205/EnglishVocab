import { z } from 'zod';
import { entrySchema } from '../../content/schema';

export const snapshotSchema = z
  .object({
    protocol: z.literal(1),
    version: z.number().int().nonnegative(),
    entries: z.array(entrySchema).max(20_000),
  })
  .strict();
