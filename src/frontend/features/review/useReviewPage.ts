import { errorMessage } from '../../components/format';
import { useEffect, useRef, useState } from 'react';
import { backend, initializeBackend } from '../../backend';
import type { LevelCounts } from './LevelDistribution';
import type { ReviewFilter, ReviewData, ReviewPageProps } from './types';

export function useReviewPage({ onOpenSession }: ReviewPageProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [batchSize, setBatchSize] = useState<10 | 20>(10);
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const actionLock = useRef(false);
  const preferencesLoaded = useRef(false);
  useEffect(() => {
    let alive = true;
    let requestNumber = 0;
    setData(null);
    setError(null);
    setActionError(null);
    async function loadData() {
      const request = ++requestNumber;
      try {
        await initializeBackend();
        const query =
          filter === 'all' ? { due: true } : { due: true, collection: filter };
        const [overview, dueRows, pending, settings, collectionRows] =
          await Promise.all([
            backend.queries.overview(),
            backend.queries.notebook(query),
            backend.study.active(),
            backend.settings.get(),
            backend.queries.notebook(
              filter === 'all' ? {} : { collection: filter },
            ),
          ]);
        const levelCounts: LevelCounts = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };
        for (const row of collectionRows) {
          if (row.progress) {
            levelCounts[row.progress.level]++;
          }
        }
        if (!alive || request !== requestNumber) {
          return;
        }
        if (!preferencesLoaded.current) {
          setBatchSize(settings.reviewBatchSize);
          preferencesLoaded.current = true;
        }
        setData({
          filter,
          overview,
          dueIds: dueRows.map((row) => row.entry.id),
          pending,
          levelCounts,
        });
        setError(null);
      } catch (cause: unknown) {
        if (alive && request === requestNumber) {
          setError(errorMessage(cause));
        }
      }
    }
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') {
        void loadData();
      }
    }
    void loadData();
    const timer = window.setInterval(() => {
      void loadData();
    }, 30000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [filter, reloadKey]);
  const content = data?.filter === filter ? data : null;
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
      setActionError(errorMessage(cause));
    } finally {
      actionLock.current = false;
      setWorking(false);
    }
  }
  function startReview() {
    const selected = content;
    if (!selected || selected.dueIds.length === 0) {
      return;
    }
    void runAction(async () => {
      const pending = await backend.study.active();
      if (pending) {
        setActionError(
          'Bạn có một phiên đang dở. Hãy tiếp tục phiên đó trước.',
        );
        setReloadKey((value) => value + 1);
        return;
      }
      const session = await backend.study.create(
        'review',
        batchSize,
        selected.dueIds,
      );
      onOpenSession(session);
    });
  }
  function resumeSession() {
    const pending = content?.pending;
    if (!pending) {
      return;
    }
    void runAction(async () => {
      const latest = await backend.study.session(pending.id);
      if (latest.phase === 'complete') {
        setReloadKey((value) => value + 1);
        return;
      }
      const session = latest.paused
        ? await backend.study.transition(latest.id, latest.version, 'resume')
        : latest;
      onOpenSession(session);
    });
  }
  return {
    filter,
    working,
    setFilter,
    error,
    setReloadKey,
    actionError,
    content,
    resumeSession,
    batchSize,
    setBatchSize,
    startReview,
  };
}
