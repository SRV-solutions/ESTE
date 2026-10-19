import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/api';

/**
 * Carga datos de la API con estado de carga/error y `reload`.
 * Si llegan respuestas fuera de orden (filtros rápidos), solo se aplica la última.
 */
export const useLoader = (loader, deps = []) => {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
};
