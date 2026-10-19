import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * El personal de la empresa son sus usuarios. La ficha laboral (CUIL, puesto, área, ingreso,
 * teléfono) queda atada a un usuario: el nombre y el email salen del usuario, sin duplicarse.
 */
const personalEsUsuario: Migration = {
  name: '004_personal_es_usuario',
  up: async (t) => {
    await sql(
      `-- Fichas sueltas: se vinculan al usuario de la misma empresa con el mismo email.
       UPDATE "Employee" e SET "userId" = u.id
         FROM "User" u
        WHERE e."userId" IS NULL AND e.email IS NOT NULL
          AND u."companyId" = e."companyId" AND lower(u.email) = lower(e.email)
          AND NOT EXISTS (SELECT 1 FROM "Employee" x WHERE x."userId" = u.id);

       DO $$ BEGIN
         IF EXISTS (SELECT 1 FROM "Employee" WHERE "userId" IS NULL) THEN
           RAISE EXCEPTION 'Hay fichas de personal sin usuario: vinculalas a un usuario antes de migrar.';
         END IF;
       END $$;

       ALTER TABLE "Employee" DROP CONSTRAINT "Employee_userId_fkey";
       ALTER TABLE "Employee" ALTER COLUMN "userId" SET NOT NULL;
       -- RESTRICT: los recibos firmados son documentación laboral, no se borran con el usuario.
       ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey"
         FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
       ALTER TABLE "Employee" DROP COLUMN "firstName", DROP COLUMN "lastName", DROP COLUMN email;`,
      t,
    );
  },
};

export default personalEsUsuario;
