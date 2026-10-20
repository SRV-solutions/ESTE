import { literal, Order } from 'sequelize';

/**
 * Orden natural por código (`HDMI-2` antes que `HDMI-10`), resuelto en SQL para poder paginar.
 * `table` es el alias de la tabla Item en la consulta.
 */
export const naturalCodeOrder = (table = 'Item'): Order => [
  [literal(`regexp_replace("${table}"."code", '-[0-9]+$', '')`), 'ASC'],
  [literal(`NULLIF(substring("${table}"."code" from '-([0-9]+)$'), '')::int`), 'ASC'],
];

const SPLIT = /(\d+)/;

/** Mismo orden natural, para listas que ya están en memoria. */
export const compareCodes = (a = '', b = '') => {
  const pa = a.split(SPLIT);
  const pb = b.split(SPLIT);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? '';
    const y = pb[i] ?? '';
    if (x === y) continue;
    const nx = Number(x);
    const ny = Number(y);
    if (x !== '' && y !== '' && !Number.isNaN(nx) && !Number.isNaN(ny)) return nx - ny;
    return x.localeCompare(y);
  }
  return 0;
};
