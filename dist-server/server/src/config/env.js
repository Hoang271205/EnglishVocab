import 'dotenv/config';
import { z } from 'zod';
const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    HOST: z.string().trim().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    MONGODB_URI: z
        .string()
        .trim()
        .min(1, 'Cần cấu hình MONGODB_URI trong .env')
        .regex(/^mongodb(?:\+srv)?:\/\//, 'MONGODB_URI phải là MongoDB connection string'),
    MONGODB_DB: z.string().trim().min(1).default('englishvocab'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET phải có ít nhất 32 ký tự'),
    APP_ORIGIN: z
        .url()
        .transform((value) => new URL(value).origin),
});
export const env = envSchema.parse(process.env);
