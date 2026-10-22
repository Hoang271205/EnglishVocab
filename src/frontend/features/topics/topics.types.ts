import type {
  Progress,
  Topic,
} from '../../../domain/types';

export type VocabularyCollection = 'ielts' | 'daily';

export interface TopicSummary extends Topic {
  total: number;
  learned: number;
}

export interface ProgressResponse {
  progress: Array<
    Progress & {
      reviewEnabled: boolean;
    }
  >;
}