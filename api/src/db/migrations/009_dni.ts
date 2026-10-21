import type { Migration } from '../migrate';
import { sql } from '../migrate';

/** DNI del usuario, para entrar con DNI además de usuario o email. Se completa desde el CUIL de la ficha laboral. */
const dni: Migration = {
  name: '009_dni',
  up: async (t) => {
    await sql(
      `ALTER TABLE "User" ADD COLUMN dni varchar(10);
       CREATE UNIQUE INDEX "User_dni_key" ON "User" (dni) WHERE dni IS NOT NULL;
       -- CUIL = prefijo (2) + DNI (8) + verificador (1): el DNI son los 8 del medio.
       UPDATE "User" u SET dni = ltrim(substr(e.cuil, 3, 8), '0')
         FROM "Employee" e
        WHERE e."userId" = u.id AND e.cuil IS NOT NULL AND u.dni IS NULL
          AND NOT EXISTS (SELECT 1 FROM "User" x WHERE x.dni = ltrim(substr(e.cuil, 3, 8), '0'));`,
      t,
    );
  },
};

export default dni;
