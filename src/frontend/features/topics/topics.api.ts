import { apiRequest } from '../../api/client';
import type { Entry, Topic } from '../../../domain/types';
import type {
  TopicSummary,
  ProgressResponse,
  VocabularyCollection,
} from './topics.types';

export const topicsApi = {
  async summaries(collection: VocabularyCollection, signal: AbortSignal) {
    const query = new URLSearchParams({ collection });
    const result = await apiRequest<{ topics: TopicSummary[] }>(
      `/api/library/topic-summaries?${query}`,
      { signal },
    );
    return result.topics;
  },
  async list(collection: VocabularyCollection, signal: AbortSignal) {
    const query = new URLSearchParams({ collection });

    const result = await apiRequest<{
      topics: Topic[];
    }>(`/api/library/topics?${query}`, { signal });

    return result.topics;
  },

  async progress(signal: AbortSignal) {
    const result = await apiRequest<ProgressResponse>('/api/progress', {
      signal,
    });

    return result;
  },

  async entries(topicId: string, signal: AbortSignal) {
    const result = await apiRequest<{
      entries: Entry[];
    }>(`/api/library/topics/${encodeURIComponent(topicId)}/entries`, {
      signal,
    });

    return result.entries;
  },
};
