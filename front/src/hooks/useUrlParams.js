import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Parámetros que manda el buscador: ?accion=nuevo, ?buscar=texto, ?categoria=12, ?ver=5. */
const KNOWN = ['accion', 'buscar', 'categoria', 'ver'];

/**
 * Lee una sola vez los parámetros del buscador (abrir "Agregar ítems", filtrar por un texto, abrir una
 * persona…) y los saca de la dirección, para que al volver atrás no se repita la acción.
 * `ready`: esperar a que la pantalla tenga sus datos (por ejemplo, para abrir un registro por id).
 */
export const useUrlParams = (handler, ready = true) => {
  const [params, setParams] = useSearchParams();
  const key = params.toString();
  useEffect(() => {
    if (!ready || !key) return;
    const values = Object.fromEntries(new URLSearchParams(key));
    if (!KNOWN.some((k) => k in values)) return;
    handler(values);
    const next = new URLSearchParams(key);
    KNOWN.forEach((k) => next.delete(k));
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
};
