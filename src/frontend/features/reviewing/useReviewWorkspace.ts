import { useCallback, useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { reviewApi } from './review.api';
import type {
  ReviewBatchSize,
  ReviewCollection,
} from './review.types';

export function useReviewWorkspace(
  hasPendingLearning: boolean,
) {
  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const action = useAsyncAction();

  const load = useCallback(async (signal: AbortSignal) => {
    const [pending, batchSize] = await Promise.all([
      reviewApi.active(signal),
      reviewApi.batchSize(signal),
    ]);

    return { pending, batchSize };
  }, []);

  const resource = useAsyncResource(load);
  const pending = resource.data?.pending ?? null;

  async function start(
    collection: ReviewCollection,
    limit: ReviewBatchSize,
  ) {
    if (
      resource.loading ||
      !resource.data ||
      resource.error ||
      pending ||
      hasPendingLearning
    ) {
      return;
    }

    const session = await action.run((signal) =>
      reviewApi.create(collection, limit, signal),
    );

    if (session) {
      setSessionId(session.id);
    } else {
      resource.reload();
    }
  }

  function reload() {
    action.clearError();
    resource.reload();
  }

  function close() {
    setSessionId(null);
    reload();
  }

  function resume() {
    if (pending) setSessionId(pending.id);
  }

  return {
    sessionId,
    pending,
    batchSize: resource.data?.batchSize ?? 10,
    loading: resource.loading,
    working: action.busy,
    error: action.error?.message ?? resource.error,
    start,
    resume,
    close,
    reload,
  };
}