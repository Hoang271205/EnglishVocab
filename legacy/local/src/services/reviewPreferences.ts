import { z } from 'zod';
import { VocabDB } from '../storage/db';

export const REVIEW_DISABLED_KEY = 'reviewDisabledIds';

const disabledIdsSchema = z.array(
  z.string().min(1).max(128),
).max(20_000);

export async function readReviewDisabledIds(db: VocabDB) {
  const stored = await db.settings.get(REVIEW_DISABLED_KEY);

  return new Set(
    disabledIdsSchema.parse(stored?.value ?? []),
  );
}