import type {
  Entry,
  Progress,
  ReviewEvent,
} from '../../../domain/types';

export interface LearningSession {
  id: string;
  mode: 'learn';
  topicId: string | null;
  version: number;
  phase: 'front' | 'recall' | 'complete';
  index: number;
  total: number;
  paused: boolean;
  draftAnswer: string;
  createdAt: number;
  attemptId: string | null;
  front: Entry | null;
  hint: {
    meaningVi: string;
    partOfSpeech: string;
  } | null;
}

export interface LearningPreferences {
  learnBatchSize: 5 | 10;
  voiceURI: string | null;
}

export type LearningAction =
  | 'recall'
  | 'front'
  | 'pause'
  | 'resume'
  | 'draft';

export type LearningResult =
  | {
      kind: 'retry';
      session: LearningSession;
    }
  | {
      kind: 'committed';
      session: LearningSession;
      progress: Progress;
      event: ReviewEvent;
    };