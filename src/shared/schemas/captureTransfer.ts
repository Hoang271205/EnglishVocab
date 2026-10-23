import { z } from 'zod';
import { entrySchema } from '../../content/schema';

const captureSchema = z
  .object({
    id: z.string().min(1).max(128),
    entryId: z.string().min(1).max(128),
    selectedText: z.string().trim().min(1).max(500),
    originalSentence: z.string().max(20_000),
    sourceUrl: z
      .url()
      .refine((url) => ['https:', 'http:'].includes(new URL(url).protocol)),
    capturedAt: z.number().int().nonnegative(),
  })
  .strict();

export const captureTransferSchema = z
  .object({
    protocol: z.literal(1),
    type: z.literal('capture-transfer'),
    transferId: z.string().min(1).max(128),
    captures: z
      .array(
        z
          .object({
            capture: captureSchema,
            entry: entrySchema,
          })
          .strict(),
      )
      .max(500),
  })
  .strict();

