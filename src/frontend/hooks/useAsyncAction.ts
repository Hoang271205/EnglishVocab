import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const current = new AbortController();
    controller.current = current;

    return () => current.abort();
  }, []);

  const run = useCallback(
    async function run<T>(
      task: (signal: AbortSignal) => Promise<T>,
    ): Promise<T | undefined> {
      const current = controller.current;

      if (
        !current ||
        current.signal.aborted ||
        locked.current
      ) {
        return undefined;
      }

      locked.current = true;
      setBusy(true);
      setError(null);

      try {
        const result = await task(current.signal);

        return current.signal.aborted
          ? undefined
          : result;
      } catch (cause) {
        if (!current.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause
              : new Error('Không thực hiện được thao tác.'),
          );
        }

        return undefined;
      } finally {
        locked.current = false;

        if (!current.signal.aborted) {
          setBusy(false);
        }
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    busy,
    error,
    run,
    clearError,
  };
}