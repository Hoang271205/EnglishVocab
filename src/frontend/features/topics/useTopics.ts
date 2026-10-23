import { useCallback, useMemo, useState } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { clearReadCache } from '../../api/readCache';
import { topicsApi } from './topics.api';
import type { VocabularyCollection } from './topics.types';

function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('vi').trim();
}

export function useTopics() {
  const [collection, setCollection] = useState<VocabularyCollection>('ielts');

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    (signal: AbortSignal) => topicsApi.summaries(collection, signal),
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
    reload: () => {
      clearReadCache();
      resource.reload();
    },
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
