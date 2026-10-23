import { z } from 'zod';
import { entrySchema } from '../../../../src/content/schema.js';

const captureSchema = z
  .object({
    id: z.string().min(1).max(128),
    entryId: z.string().min(1).max(128),
    selectedText: z.string().trim().min(1).max(500),

    // Chấp nhận định dạng hàng đợi cũ nhưng không lưu nội dung này.
    originalSentence: z.string().max(20_000),

    sourceUrl: z.url().refine(
      (value) =>
        ['http:', 'https:'].includes(
          new URL(value).protocol,
        ),
    ),

    capturedAt: z.number().int().nonnegative(),
  })
  .strict();

export const transferSchema = z
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
  .strict()
  .superRefine((transfer, context) => {
    transfer.captures.forEach((item, index) => {
      if (item.capture.entryId !== item.entry.id) {
        context.addIssue({
          code: 'custom',
          path: ['captures', index, 'capture', 'entryId'],
          message: 'Capture đang tham chiếu sai ID từ.',
        });
      }
    });
  });

export type CaptureTransfer = z.infer<
  typeof transferSchema
>;