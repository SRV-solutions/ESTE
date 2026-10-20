import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';

/** Carga datos de la API con estado de carga/error, `reload` y `refreshing` (para tirar hacia abajo). */
export const useLoader = (loader, deps = []) => {
  const [state, setState] = useState({ data: undefined, loading: true, refreshing: false, error: null });
  const requestId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const load = useCallback(
    async (refreshing = false) => {
      const id = ++requestId.current;
      setState((s) => ({ ...s, loading: !refreshing, refreshing, error: null }));
      try {
        const data = await run();
        if (id === requestId.current) setState({ data, loading: false, refreshing: false, error: null });
      } catch (err) {
        if (id === requestId.current) setState((s) => ({ ...s, loading: false, refreshing: false, error: errorMessage(err) }));
      }
    },
    [run],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: () => load(false), refresh: () => load(true) };
};
