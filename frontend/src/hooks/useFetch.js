import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../services/api.js";

/**
 * Carrega dados assíncronos com estados de loading/erro.
 * `pollInterval` (ms) atualiza periodicamente — usado no acompanhamento de pedidos em tempo real.
 */
export function useFetch(fetcher, deps = [], { pollInterval } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      if (!silent) setError(getErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pollInterval) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, pollInterval);
    return () => clearInterval(id);
  }, [load, pollInterval]);

  return { data, error, loading, reload: load, setData };
}
