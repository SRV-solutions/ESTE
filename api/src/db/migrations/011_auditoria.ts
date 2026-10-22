import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * Auditoría: quién entró, desde qué IP y dispositivo, y qué hizo. Más el último ingreso de cada usuario.
 * El registro guarda una copia del nombre de usuario para que siga legible si la persona se elimina.
 */
const auditoria: Migration = {
  name: '011_auditoria',
  up: async (t) => {
    await sql(
      `ALTER TABLE "User" ADD COLUMN "lastLoginAt" timestamptz, ADD COLUMN "lastLoginIp" varchar(64);

       CREATE TABLE "AuditLog" (
         id bigserial PRIMARY KEY,
         "companyId" integer REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "userId" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         username varchar(255),
         kind varchar(16) NOT NULL,
         action varchar(80) NOT NULL,
         summary varchar(300) NOT NULL,
         method varchar(8),
         path varchar(300),
         status smallint,
         ip varchar(64),
         "userAgent" varchar(300),
         meta jsonb,
         "createdAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "AuditLog_company_idx" ON "AuditLog" ("companyId", "createdAt" DESC);
       CREATE INDEX "AuditLog_user_idx" ON "AuditLog" ("userId", "createdAt" DESC);
       CREATE INDEX "AuditLog_kind_idx" ON "AuditLog" (kind, "createdAt" DESC);`,
      t,
    );
  },
};

export default auditoria;
