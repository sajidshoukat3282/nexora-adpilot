import { useEffect, useRef, useState, useCallback } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Wraps a repository call with loading/error/reload state. Every feature
 * screen uses this instead of calling repositories inline, so swapping a
 * Demo repository for a real API-backed one later needs zero UI changes.
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const run = useCallback(() => {
    const myGen = ++generation.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (myGen === generation.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (myGen === generation.current) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, reload: run };
}
