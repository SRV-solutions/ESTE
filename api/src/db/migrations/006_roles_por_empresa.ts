import { env } from '../../config/env';
import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * Cada empresa tiene sus propios roles y los puede editar sin tocar los de otra.
 * - El rol Administrador sigue siendo uno solo, global y con todos los permisos (no se edita).
 * - Los demás roles globales quedan como plantillas: se copian a cada empresa (con sus permisos)
 *   y los usuarios pasan a usar la copia de su empresa.
 */
const rolesPorEmpresa: Migration = {
  name: '006_roles_por_empresa',
  up: async (t) => {
    const admin = Number(env.adminRoleId);
    await sql(
      `ALTER TABLE "Role" ADD COLUMN "companyId" integer REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;
       CREATE INDEX "Role_company_idx" ON "Role" ("companyId");

       DO $$
       DECLARE c record; r record; nid integer;
       BEGIN
         FOR c IN SELECT id FROM "Company" LOOP
           FOR r IN SELECT * FROM "Role" WHERE "companyId" IS NULL AND id <> ${admin} ORDER BY id LOOP
             INSERT INTO "Role" ("roleName", description, "companyId") VALUES (r."roleName", r.description, c.id) RETURNING id INTO nid;
             INSERT INTO "RolePermission" ("roleId", "permissionId") SELECT nid, "permissionId" FROM "RolePermission" WHERE "roleId" = r.id;
             UPDATE "User" SET "roleId" = nid WHERE "companyId" = c.id AND "roleId" = r.id;
           END LOOP;
         END LOOP;
       END $$;

       CREATE UNIQUE INDEX "Role_company_name_key" ON "Role" ("companyId", lower("roleName")) WHERE "companyId" IS NOT NULL;`,
      t,
    );
  },
};

export default rolesPorEmpresa;
