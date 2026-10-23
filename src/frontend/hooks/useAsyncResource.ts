import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../api/client';
import {
  invalidateResource,
  loadResource,
  readResource,
} from '../api/resourceCache';

interface ResourceOptions {
  cacheKey?: string;
  keepStaleData?: boolean;
}

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  load: (signal: AbortSignal) => Promise<T>;
  cacheKey: string | undefined;
}

function initialState<T>(
  load: (signal: AbortSignal) => Promise<T>,
  cacheKey: string | undefined,
  keepStaleData: boolean,
): ResourceState<T> {
  const cached = cacheKey ? readResource<T>(cacheKey) : null;
  const available = cached && (cached.fresh || keepStaleData);
  return {
    data: available ? cached.data : null,
    loading: !available,
    refreshing: Boolean(available && !cached.fresh),
    error: null,
    load,
    cacheKey,
  };
}

export function useAsyncResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  { cacheKey, keepStaleData = true }: ResourceOptions = {},
) {
  const [state, setState] = useState(() =>
    initialState(load, cacheKey, keepStaleData),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const forceReload = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const forced = forceReload.current;
    forceReload.current = false;
    if (cacheKey && forced) invalidateResource(cacheKey);
    const cached = cacheKey ? readResource<T>(cacheKey) : null;

    if (cached?.fresh && !forced) {
      setState({
        data: cached.data,
        loading: false,
        refreshing: false,
        error: null,
        load,
        cacheKey,
      });
      return;
    }

    setState((current) => {
      const previous =
        current.load === load && current.cacheKey === cacheKey
          ? current.data
          : (cached?.data ?? null);
      const data = cacheKey && keepStaleData ? previous : null;
      return {
        data,
        loading: data === null,
        refreshing: data !== null,
        error: null,
        load,
        cacheKey,
      };
    });

    async function run() {
      try {
        const data = await (cacheKey
          ? loadResource(cacheKey, load)
          : load(controller.signal));

        if (!controller.signal.aborted) {
          setState({
            data,
            loading: false,
            refreshing: false,
            error: null,
            load,
            cacheKey,
          });
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setState((current) => ({
            ...current,
            loading: false,
            refreshing: false,
            error: getErrorMessage(cause),
          }));
        }
      }
    }

    void run();

    return () => controller.abort();
  }, [load, reloadKey, cacheKey, keepStaleData]);

  const reload = useCallback(() => {
    forceReload.current = true;
    setReloadKey((value) => value + 1);
  }, []);

  // A collection or entry change must never display another resource's data.
  const visible =
    state.load === load && state.cacheKey === cacheKey
      ? state
      : initialState(load, cacheKey, keepStaleData);

  return {
    data: visible.data,
    loading: visible.loading,
    refreshing: visible.refreshing,
    error: visible.error,
    reload,
  };
}
