import { useEffect, useState } from 'react';

/** Devuelve `value` recién cuando dejó de cambiar durante `delay` ms (para búsquedas). */
export const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};
