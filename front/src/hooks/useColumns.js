import { useCallback, useMemo, useState } from 'react';

const KEY = (table) => `eventbox:columns:${table}`;

const read = (table) => {
  try {
    const raw = localStorage.getItem(KEY(table));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Qué columnas muestra una tabla. Cada persona elige las suyas y quedan guardadas en el navegador.
 * `columns`: [{ id, label, hidden?, ... }]. Las que tienen `hidden: true` no se ven hasta que se agregan.
 * Devuelve las columnas visibles (en el orden original), y helpers para el panel de columnas.
 */
export const useColumns = (table, columns) => {
  const defaults = useMemo(() => columns.filter((c) => !c.hidden).map((c) => c.id), [columns]);
  const [chosen, setChosen] = useState(() => {
    const saved = read(table);
    // Si una columna guardada ya no existe (cambió la app), se ignora.
    return Array.isArray(saved) ? saved.filter((id) => columns.some((c) => c.id === id)) : null;
  });
  const visibleIds = chosen ?? defaults;

  const persist = useCallback(
    (ids) => {
      setChosen(ids);
      try {
        if (ids) localStorage.setItem(KEY(table), JSON.stringify(ids));
        else localStorage.removeItem(KEY(table));
      } catch {
        /* sin almacenamiento (modo privado): queda solo para esta visita */
      }
    },
    [table],
  );

  const toggle = useCallback(
    (id) => {
      const next = visibleIds.includes(id) ? visibleIds.filter((v) => v !== id) : [...visibleIds, id];
      if (next.length) persist(next); // siempre queda al menos una columna
    },
    [visibleIds, persist],
  );

  const visible = useMemo(() => columns.filter((c) => visibleIds.includes(c.id)), [columns, visibleIds]);
  const isDefault = chosen === null || (chosen.length === defaults.length && defaults.every((id) => chosen.includes(id)));

  return {
    visible,
    visibleIds,
    toggle,
    reset: () => persist(null),
    isDefault,
    all: columns,
  };
};
