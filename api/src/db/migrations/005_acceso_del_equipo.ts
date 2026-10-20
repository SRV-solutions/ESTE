import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * El equipo en un solo lugar: cada persona es un "User" con un tipo de acceso.
 * - app: entra a Event Box y cuenta para el límite de usuarios del plan.
 * - temporary: entra hasta "accessUntil" (máximo 2 días); no cuenta para el límite, pero el plan
 *   pone un tope de temporales activos a la vez.
 * - none: no entra (eventuales, personal que solo cobra). Tiene ficha laboral y recibos.
 */
const accesoDelEquipo: Migration = {
  name: '005_acceso_del_equipo',
  up: async (t) => {
    await sql(
      `ALTER TABLE "User"
         ADD COLUMN access varchar(10) NOT NULL DEFAULT 'app' CHECK (access IN ('app','temporary','none')),
         ADD COLUMN "accessUntil" timestamptz;
       ALTER TABLE "User"
         ALTER COLUMN username DROP NOT NULL,
         ALTER COLUMN email DROP NOT NULL,
         ALTER COLUMN password DROP NOT NULL;
       ALTER TABLE "User"
         ADD CONSTRAINT "User_login_required" CHECK (access = 'none' OR (username IS NOT NULL AND password IS NOT NULL)),
         ADD CONSTRAINT "User_app_email_required" CHECK (access <> 'app' OR email IS NOT NULL),
         ADD CONSTRAINT "User_temporary_until" CHECK (access <> 'temporary' OR "accessUntil" IS NOT NULL);
       CREATE INDEX "User_company_access_idx" ON "User" ("companyId", access);`,
      t,
    );
  },
};

export default accesoDelEquipo;
