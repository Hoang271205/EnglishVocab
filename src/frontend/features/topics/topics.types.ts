import type { Progress, Topic, SharedCollectionId } from '../../../domain/types';

export type VocabularyCollection = SharedCollectionId;

export interface TopicSummary extends Topic {
  total: number;
  learned: number;
  processed: number;
}

export interface ProgressResponse {
  progress: Array<
    Progress & {
      reviewEnabled: boolean;
    }
  >;
}
