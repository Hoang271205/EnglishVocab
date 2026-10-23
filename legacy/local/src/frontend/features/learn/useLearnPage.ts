import { useEffect, useRef, useState } from 'react';
import type { SessionView } from '../../../../../../src/domain/types';
import { backend, initializeBackend } from '../../backend';
import type {
  LearningCollection,
  TopicSummary,
  TopicGroups,
  LearnPageProps,
} from './types';

export function useLearnPage({ onNotebook, onOpenSession }: LearnPageProps) {
  const [collection, setCollection] = useState<LearningCollection>('ielts');
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<TopicGroups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<SessionView | null>(
    null,
  );
  const [batchSize, setBatchSize] = useState<5 | 10>(10);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionLock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function loadTopics() {
      setError(null);
      setActionError(null);
      setGroups(null);
      try {
        await initializeBackend();
        const [ielts, daily, pending, settings] = await Promise.all([
          backend.queries.topics('ielts'),
          backend.queries.topics('daily'),
          backend.study.active(),
          backend.settings.get(),
        ]);
        if (!cancelled) {
          setGroups({ ielts, daily });
          setPendingSession(pending);
          setBatchSize(settings.learnBatchSize);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không tải được danh sách chủ đề.',
          );
        }
      }
    }
    void loadTopics();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);
  const allTopics = groups?.[collection] ?? [];
  const normalizedSearch = search.normalize('NFKC').toLowerCase().trim();
  const visibleTopics = allTopics.filter((topic) =>
    `${topic.nameEn} ${topic.nameVi}`
      .normalize('NFKC')
      .toLowerCase()
      .includes(normalizedSearch),
  );
  const populatedCount = allTopics.filter((topic) => topic.total > 0).length;
  const selectedTopic =
    allTopics.find((topic) => topic.id === selectedTopicId) ?? null;
  function chooseCollection(nextCollection: LearningCollection) {
    setCollection(nextCollection);
    setSearch('');
    setSelectedTopicId(null);
    setActionError(null);
  }
  function chooseTopic(topic: TopicSummary) {
    if (topic.total === 0) {
      return;
    }
    if (topic.learned >= topic.total) {
      onNotebook();
      return;
    }
    setSelectedTopicId(topic.id);
    setActionError(null);
  }
  async function runAction(action: () => Promise<void>) {
    if (actionLock.current) {
      return;
    }
    actionLock.current = true;
    setWorking(true);
    setActionError(null);
    try {
      await action();
    } catch (cause: unknown) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : 'Không thực hiện được thao tác.',
      );
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }
  function startSelectedTopic() {
    const topic = selectedTopic;
    if (!topic) {
      return;
    }
    void runAction(async () => {
      const pending = await backend.study.active();
      if (pending) {
        setPendingSession(pending);
        setActionError(
          'Bạn có một phiên đang dở. Hãy tiếp tục phiên đó trước.',
        );
        return;
      }
      const session = await backend.study.create(
        'learn',
        batchSize,
        topic.entryIds,
      );
      onOpenSession(session);
    });
  }
  function resumePendingSession() {
    const pending = pendingSession;
    if (!pending) {
      return;
    }
    void runAction(async () => {
      const current = await backend.study.session(pending.id);
      if (current.phase === 'complete') {
        setPendingSession(null);
        setRetryKey((value) => value + 1);
        return;
      }
      const session = current.paused
        ? await backend.study.transition(current.id, current.version, 'resume')
        : current;
      onOpenSession(session);
    });
  }
  return {
    collection,
    chooseCollection,
    groups,
    error,
    setRetryKey,
    pendingSession,
    working,
    resumePendingSession,
    actionError,
    allTopics,
    populatedCount,
    search,
    setSearch,
    setSelectedTopicId,
    visibleTopics,
    selectedTopicId,
    chooseTopic,
    batchSize,
    startSelectedTopic,
  };
}
