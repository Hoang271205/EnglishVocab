import type { Progress, Topic } from '../../../domain/types';

export type VocabularyCollection = 'ielts' | 'daily';

export interface TopicSummary extends Topic {
  total: number;
  learned: number;
  known: number;
}

export interface ProgressResponse {
  knownEntryIds: string[];
  progress: Array<
    Progress & {
      reviewEnabled: boolean;
    }
  >;
}
