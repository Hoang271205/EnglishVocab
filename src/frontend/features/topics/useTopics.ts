import { useCallback, useMemo, useState } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { topicsApi } from './topics.api';
import type { VocabularyCollection } from './topics.types';
import { compareTopics } from '../../../domain/topic-order';

function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('vi').trim();
}

export function useTopics() {
  const [collection, setCollection] = useState<VocabularyCollection>('ielts');

  const [search, setSearch] = useState('');
  const [partFilter, setPartFilter] = useState<'all' | '1' | '2'>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'new' | 'started' | 'finished'
  >('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    (signal: AbortSignal) => topicsApi.summaries(collection, signal),
    [collection],
  );

  const resource = useAsyncResource(load, { cacheKey: `topics:${collection}` });
  const topics = useMemo(
    () => (resource.data ? [...resource.data].sort(compareTopics) : undefined),
    [resource.data],
  );
  const displayNumbers = useMemo(
    () => new Map((topics ?? []).map((topic, index) => [topic.id, index + 1])),
    [topics],
  );

  const visibleTopics = useMemo(() => {
    const query = normalizeSearch(search);

    return (topics ?? []).filter(
      (topic) =>
        (statusFilter === 'all' ||
          (topic.total > 0 &&
            (statusFilter === 'new'
              ? topic.processed === 0
              : statusFilter === 'started'
                ? topic.processed > 0 && topic.processed < topic.total
                : topic.processed >= topic.total))) &&
        (partFilter === 'all' ||
          (partFilter === '2' ? topic.part === 2 : topic.part !== 2)) &&
        normalizeSearch(`${topic.nameEn} ${topic.nameVi}`).includes(query),
    );
  }, [topics, search, partFilter, statusFilter]);

  function resetFilters() {
    setSearch('');
    setPartFilter('all');
    setStatusFilter('all');
    setSelectedId(null);
  }

  function chooseCollection(next: VocabularyCollection) {
    if (next === collection) return;

    setCollection(next);
    resetFilters();
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
    displayNumbers,
    partFilter,
    statusFilter,
    setStatusFilter,
    resetFilters,
    setPartFilter,
    originalTopicCount: topics?.filter((topic) => topic.part !== 2).length ?? 0,
    extensionCount: topics?.filter((topic) => topic.part === 2).length ?? 0,
    topicCount: topics?.length ?? 0,
    populatedCount: topics?.filter((topic) => topic.total > 0).length ?? 0,
    setSearch,
    chooseCollection,
    toggleTopic,
    closeTopic: () => setSelectedId(null),
  };
}
