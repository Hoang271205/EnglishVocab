import { z } from 'zod';
export const appSettingsSchema = z
    .object({
    voiceURI: z.string().max(500).nullable(),
    onlineLookupEnabled: z.boolean(),
    learnBatchSize: z.union([
        z.literal(5),
        z.literal(10),
    ]),
    reviewBatchSize: z.union([
        z.literal(10),
        z.literal(20),
    ]),
    dailyNewWordTarget: z
        .number()
        .int()
        .min(1)
        .max(1000),
})
    .strict();
export const defaultSettings = {
    voiceURI: null,
    onlineLookupEnabled: true,
    learnBatchSize: 10,
    reviewBatchSize: 10,
    dailyNewWordTarget: 10,
};
export const settingsPatchSchema = appSettingsSchema
    .partial()
    .refine((changes) => Object.keys(changes).length > 0, 'Cần có ít nhất một cài đặt để cập nhật.');
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
