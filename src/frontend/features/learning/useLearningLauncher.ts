import { useCallback, useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { learningApi } from './learning.api';

export function useLearningLauncher() {
  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const action = useAsyncAction();

  const load = useCallback(async (signal: AbortSignal) => {
    const [pending, preferences] = await Promise.all([
      learningApi.active(signal),
      learningApi.preferences(signal),
    ]);

    return { pending, preferences };
  }, []);

  const resource = useAsyncResource(load);

  const pending = resource.data?.pending ?? null;
  const batchSize =
    resource.data?.preferences.learnBatchSize ?? 10;
  const voiceURI =
    resource.data?.preferences.voiceURI ?? null;

  async function start(topicId: string) {
    if (
      resource.loading ||
      resource.error ||
      !resource.data ||
      pending
    ) {
      return;
    }

    const session = await action.run((signal) =>
      learningApi.create(topicId, batchSize, signal),
    );

    if (session) {
      setSessionId(session.id);
    } else {
      // Nếu server đã tạo phiên nhưng phản hồi bị mất,
      // tải lại để người dùng có thể tiếp tục phiên đó.
      resource.reload();
    }
  }

  function openPending() {
    if (pending) {
      setSessionId(pending.id);
    }
  }

  function reload() {
    action.clearError();
    resource.reload();
  }

  function closeSession() {
    setSessionId(null);
    reload();
  }

  return {
    sessionId,
    pending,
    batchSize,
    voiceURI,
    loading: resource.loading,
    working: action.busy,
    error: action.error?.message ?? resource.error,
    start,
    openPending,
    closeSession,
    reload,
  };
}