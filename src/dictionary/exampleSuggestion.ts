import { z } from 'zod';
import { queryKey } from './freeDictionary.js';

const word = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => {
    try {
      queryKey(value);
      return true;
    } catch {
      return false;
    }
  })
  .transform(queryKey);

export const exampleSuggestionInput = z
  .object({
    word,
    partOfSpeech: z.string().trim().min(1).max(100),
    definition: z.string().trim().min(1).max(2_000),
    forms: z.array(word).max(30),
  })
  .strict();

export const exampleSuggestionOutput = z.object({
  sentence: z.string().trim().min(1).max(240).nullable(),
});

export type ExampleSuggestionInput = z.infer<typeof exampleSuggestionInput>;
export type LoadExampleSuggestion = (
  input: ExampleSuggestionInput,
  signal: AbortSignal,
) => Promise<string | null>;
