import { useCallback, useMemo, useState } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { topicsApi } from './topics.api';
import type { TopicSummary, VocabularyCollection } from './topics.types';

function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('vi').trim();
}

export function useTopics() {
  const [collection, setCollection] = useState<VocabularyCollection>('ielts');

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const [topics, progress] = await Promise.all([
        topicsApi.list(collection, signal),
        topicsApi.progress(signal),
      ]);

      const learnedIds = new Set(progress.progress.map((item) => item.entryId));

      const knownIds = new Set(progress.knownEntryIds ?? []);

      const summaries: TopicSummary[] = topics.map((topic) => ({
        ...topic,
        total: topic.entryIds.length,
        known: topic.entryIds.filter(
          (id) => knownIds.has(id) && !learnedIds.has(id),
        ).length,
        learned: topic.entryIds.filter((id) => learnedIds.has(id)).length,
      }));

      return summaries;
    },
    [collection],
  );

  const resource = useAsyncResource(load);
  const topics = resource.data;

  const visibleTopics = useMemo(() => {
    const query = normalizeSearch(search);

    return (topics ?? []).filter((topic) =>
      normalizeSearch(`${topic.nameEn} ${topic.nameVi}`).includes(query),
    );
  }, [topics, search]);

  function chooseCollection(next: VocabularyCollection) {
    if (next === collection) return;

    setCollection(next);
    setSearch('');
    setSelectedId(null);
  }

  function toggleTopic(topicId: string) {
    setSelectedId((current) => (current === topicId ? null : topicId));
  }

  return {
    ...resource,
    collection,
    search,
    selectedId,
    visibleTopics,
    topicCount: topics?.length ?? 0,
    populatedCount: topics?.filter((topic) => topic.total > 0).length ?? 0,
    setSearch,
    chooseCollection,
    toggleTopic,
    closeTopic: () => setSelectedId(null),
  };
}
