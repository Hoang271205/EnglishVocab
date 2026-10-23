import type { ImportSnapshot, ReviewedImportPlan } from './review-import-plan.js';

export async function runReviewedImport<TSession>(input: {
  write: boolean;
  readSnapshot: (session: TSession | undefined) => Promise<ImportSnapshot>;
  buildPlan: (snapshot: ImportSnapshot) => ReviewedImportPlan;
  withTransaction: <T>(work: (session: TSession) => Promise<T>) => Promise<T>;
  apply: (session: TSession, plan: ReviewedImportPlan) => Promise<void>;
}): Promise<{plan: ReviewedImportPlan; applied: boolean}> {
  if (!input.write) {
    const snapshot = await input.readSnapshot(undefined);
    return {plan: input.buildPlan(snapshot), applied: false};
  }

  const plan = await input.withTransaction(async (session) => {
    const snapshot = await input.readSnapshot(session);
    const candidate = input.buildPlan(snapshot);
    await input.apply(session, candidate);
    return candidate;
  });
  return {plan, applied: true};
}
