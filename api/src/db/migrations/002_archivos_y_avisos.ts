import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * - Foto de perfil de cada usuario (el logo de la empresa ya tenía su columna).
 * - Reportes de problemas que mandan los usuarios desde la app.
 * - Recuperación de contraseña por mail.
 */
const archivosYAvisos: Migration = {
  name: '002_archivos_y_avisos',
  up: async (t) => {
    await sql(
      `ALTER TABLE "User" ADD COLUMN "avatarUrl" varchar(500);

       CREATE TABLE "Feedback" (
         id serial PRIMARY KEY,
         "companyId" integer REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         "userId" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         type varchar(16) NOT NULL CHECK (type IN ('error','sugerencia','consulta')),
         message text NOT NULL,
         "pageUrl" varchar(500),
         "userAgent" varchar(300),
         "attachmentUrl" varchar(500),
         status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
         "resolvedAt" timestamptz,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "Feedback_status_idx" ON "Feedback" (status, "createdAt" DESC);

       CREATE TABLE "PasswordResetToken" (
         id serial PRIMARY KEY,
         "userId" integer NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "tokenHash" char(64) NOT NULL UNIQUE,
         "expiresAt" timestamptz NOT NULL,
         "usedAt" timestamptz,
         "createdAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "PasswordResetToken_user_idx" ON "PasswordResetToken" ("userId");`,
      t,
    );
  },
};

export default archivosYAvisos;
