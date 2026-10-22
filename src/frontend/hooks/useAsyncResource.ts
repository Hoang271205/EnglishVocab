import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { getErrorMessage } from '../api/client';

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsyncResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setState({
      data: null,
      loading: true,
      error: null,
    });

    async function run() {
      try {
        const data = await load(controller.signal);

        if (!controller.signal.aborted) {
          setState({
            data,
            loading: false,
            error: null,
          });
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setState({
            data: null,
            loading: false,
            error: getErrorMessage(cause),
          });
        }
      }
    }

    void run();

    return () => controller.abort();
  }, [load, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  return {
    ...state,
    reload,
  };
}