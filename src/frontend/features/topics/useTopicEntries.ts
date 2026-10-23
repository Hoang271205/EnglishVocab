import { useCallback } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { topicsApi } from './topics.api';

export function useTopicEntries(topicId: string) {
  const load = useCallback(
    (signal: AbortSignal) =>
      topicsApi.entries(topicId, signal),
    [topicId],
  );

  return useAsyncResource(load);
}