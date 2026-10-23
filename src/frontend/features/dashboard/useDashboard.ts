import { useCallback } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { dashboardApi } from './dashboard.api';

export function useDashboard(userId: string) {
  const load = useCallback(
    (signal: AbortSignal) => dashboardApi.summary(signal),
    [],
  );
  const resource = useAsyncResource(load, { cacheKey: `dashboard:${userId}` });

  return {
    summary: resource.data,
    error: resource.error,
    loading: resource.loading,
    reload: resource.reload,
  };
}
