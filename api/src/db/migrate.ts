import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import baseline from './migrations/000_baseline';
import multiempresa from './migrations/001_multiempresa';
import archivosYAvisos from './migrations/002_archivos_y_avisos';
import planesYModulos from './migrations/003_planes_y_modulos';
import personalEsUsuario from './migrations/004_personal_es_usuario';
import accesoDelEquipo from './migrations/005_acceso_del_equipo';
import rolesPorEmpresa from './migrations/006_roles_por_empresa';
import checkinReportesPermisos from './migrations/007_checkin_reportes_permisos';
import acuerdosEspeciales from './migrations/008_acuerdos_especiales';

export interface Migration {
  name: string;
  up: (t: Transaction) => Promise<void>;
}

/** Orden de aplicación. Nunca se edita una migración ya aplicada: se agrega una nueva. */
const MIGRATIONS: Migration[] = [baseline, multiempresa, archivosYAvisos, planesYModulos, personalEsUsuario, accesoDelEquipo, rolesPorEmpresa, checkinReportesPermisos, acuerdosEspeciales];

const run = (sql: string, t: Transaction) => sequelize.query(sql, { transaction: t });
export const sql = run;

/**
 * Aplica las migraciones pendientes, cada una en su propia transacción (si falla, no queda a medias).
 * Se registran en "EventBoxMigration". Usa un advisory lock para que dos instancias no migren a la vez.
 */
export const migrate = async () => {
  await sequelize.query('SELECT pg_advisory_lock(424242)');
  try {
    // La app se llamaba Sortex: las bases creadas con ese nombre conservan su historial.
    await sequelize.query(`DO $$ BEGIN
      IF to_regclass('"SortexMigration"') IS NOT NULL AND to_regclass('"EventBoxMigration"') IS NULL THEN
        ALTER TABLE "SortexMigration" RENAME TO "EventBoxMigration";
      END IF;
    END $$`);
    await sequelize.query(
      'CREATE TABLE IF NOT EXISTS "EventBoxMigration" (name text PRIMARY KEY, "appliedAt" timestamptz NOT NULL DEFAULT now())',
    );

    const rows = await sequelize.query<{ name: string }>('SELECT name FROM "EventBoxMigration"', { type: QueryTypes.SELECT });
    const applied = new Set(rows.map((r) => r.name));
    for (const m of MIGRATIONS) {
      if (applied.has(m.name)) continue;
      await sequelize.transaction(async (t) => {
        await m.up(t);
        await sequelize.query('INSERT INTO "EventBoxMigration" (name) VALUES (:name)', { replacements: { name: m.name }, transaction: t });
      });
      console.log(`[eventbox] Migración aplicada: ${m.name}`);
    }
  } finally {
    await sequelize.query('SELECT pg_advisory_unlock(424242)');
  }
};
