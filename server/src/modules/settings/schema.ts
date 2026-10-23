import { z } from 'zod';
import { REVIEW_BATCH_SIZES } from '../../../../src/shared/studyOptions.js';

export const appSettingsSchema = z
  .object({
    voiceURI: z.string().max(500).nullable(),
    onlineLookupEnabled: z.boolean(),

    learnBatchSize: z.union([z.literal(5), z.literal(10)]),

    reviewBatchSize: z.literal(REVIEW_BATCH_SIZES),

    dailyNewWordTarget: z.number().int().min(1).max(1000),
  })
  .strict();

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const defaultSettings: AppSettings = {
  voiceURI: null,
  onlineLookupEnabled: true,
  learnBatchSize: 10,
  reviewBatchSize: 10,
  dailyNewWordTarget: 10,
};

export const settingsPatchSchema = appSettingsSchema
  .partial()
  .refine(
    (changes) => Object.keys(changes).length > 0,
    'Cần có ít nhất một cài đặt để cập nhật.',
  );

export const updateSettingsSchema = z
  .object({
    expectedRevision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),

    changes: settingsPatchSchema,
  })
  .strict();
