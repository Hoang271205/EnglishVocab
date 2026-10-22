import type { Level } from '../../../domain/types';

export interface DashboardSummary {
  learnedCount: number;
  masteredCount: number;
  enabledCount: number;
  disabledCount: number;
  dueCount: number;
  nextReviewAt: number | null;
  levels: Record<Level, number>;
  serverTime: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
}