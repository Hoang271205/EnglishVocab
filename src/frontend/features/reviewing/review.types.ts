import type {
  CollectionId,
  Entry,
  Example,
  Progress,
  Question,
  ReviewEvent,
} from '../../../domain/types';

export type ReviewCollection = 'all' | CollectionId;
export type { ReviewBatchSize } from '../../../shared/studyOptions';

export interface OnlineReviewSession {
  id: string;
  mode: 'review';
  reviewDisabled?: boolean;
  version: number;
  phase: 'question' | 'feedback' | 'complete';
  index: number;
  total: number;
  endedEarly?: boolean;
  reviewedCount?: number | null;
  correctCount?: number | null;
  incorrectCount?: number | null;
  ungradedCount?: number | null;
  remainingCount?: number | null;
  paused: boolean;
  draftAnswer: string;
  createdAt: number;
  question: Question | null;
  feedback: {
    entry: Entry;
    example: Example;
    progress: Progress;
    event: ReviewEvent;
  } | null;
}

export type ReviewAction = 'next' | 'pause' | 'resume' | 'draft' | 'finish';

export interface ReviewResult {
  kind: 'committed';
  progress: Progress;
  event: ReviewEvent;
  session: OnlineReviewSession;
}
