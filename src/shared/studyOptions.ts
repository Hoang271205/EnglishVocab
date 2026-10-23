export const REVIEW_BATCH_SIZES = [10, 20, 50, 100] as const;

export type ReviewBatchSize = (typeof REVIEW_BATCH_SIZES)[number];
