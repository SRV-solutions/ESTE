import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * Buscador general: índice para encontrar ítems por el comienzo de su código sin importar mayúsculas
 * ("hdmi-1" → HDMI-12, HDMI-13…). text_pattern_ops permite usar el índice con LIKE 'xxx%'.
 */
const buscador: Migration = {
  name: '012_buscador',
  up: async (t) => {
    await sql(`CREATE INDEX IF NOT EXISTS "Item_company_code_search_idx" ON "Item" ("companyId", upper(code) text_pattern_ops);`, t);
  },
};

export default buscador;
