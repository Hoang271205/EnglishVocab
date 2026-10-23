import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import { dashboardApi } from './dashboard.api';
import type { DashboardSummary } from './dashboard.types';

export function useDashboard(userId: string) {
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setSummary(null);
    setError(null);
    setLoading(true);

    async function load() {
      try {
        const result = await dashboardApi.summary(
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setSummary(result);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(cause));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [userId, reloadKey]);

  function reload() {
    setReloadKey((value) => value + 1);
  }

  return {
    summary,
    error,
    loading,
    reload,
  };
}