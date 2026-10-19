import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import baseline from './migrations/000_baseline';
import multiempresa from './migrations/001_multiempresa';

export interface Migration {
  name: string;
  up: (t: Transaction) => Promise<void>;
}

/** Orden de aplicación. Nunca se edita una migración ya aplicada: se agrega una nueva. */
const MIGRATIONS: Migration[] = [baseline, multiempresa];

const run = (sql: string, t: Transaction) => sequelize.query(sql, { transaction: t });
export const sql = run;

/**
 * Aplica las migraciones pendientes, cada una en su propia transacción (si falla, no queda a medias).
 * Se registra en "SortexMigration". Usa un advisory lock para que dos instancias no migren a la vez.
 */
export const migrate = async () => {
  await sequelize.query('CREATE TABLE IF NOT EXISTS "SortexMigration" (name text PRIMARY KEY, "appliedAt" timestamptz NOT NULL DEFAULT now())');
  await sequelize.query('SELECT pg_advisory_lock(424242)');
  try {
    const rows = await sequelize.query<{ name: string }>('SELECT name FROM "SortexMigration"', { type: QueryTypes.SELECT });
    const applied = new Set(rows.map((r) => r.name));
    for (const m of MIGRATIONS) {
      if (applied.has(m.name)) continue;
      await sequelize.transaction(async (t) => {
        await m.up(t);
        await sequelize.query('INSERT INTO "SortexMigration" (name) VALUES (:name)', { replacements: { name: m.name }, transaction: t });
      });
      console.log(`[sortex] Migración aplicada: ${m.name}`);
    }
  } finally {
    await sequelize.query('SELECT pg_advisory_unlock(424242)');
  }
};
