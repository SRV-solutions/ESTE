import { env } from '../../config/env';
import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * - Check-in / check-out del material en el evento, con geolocalización (coordenadas en Lugar).
 * - Usuarios desactivados (no entran, no cuentan para el plan) y borrado definitivo: las órdenes
 *   que creó quedan sin creador en vez de impedir el borrado.
 * - Permisos por módulo: eventos, lugares, planos, sueldos, check-in y reportes dejan de colgar de
 *   "órdenes" / "usuarios" y cada rol los define aparte. A los roles existentes se les copian los
 *   equivalentes para que nadie pierda acceso.
 */
const checkinReportesPermisos: Migration = {
  name: '007_checkin_reportes_permisos',
  up: async (t) => {
    const admin = Number(env.adminRoleId);
    await sql(
      `ALTER TABLE "Location" ADD COLUMN lat double precision, ADD COLUMN lng double precision;

       ALTER TABLE "User" ADD COLUMN "disabledAt" timestamptz;

       ALTER TABLE "ServiceOrder" ALTER COLUMN "orderedBy" DROP NOT NULL;
       ALTER TABLE "ServiceOrder" DROP CONSTRAINT "ServiceOrder_orderedBy_fkey";
       ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_orderedBy_fkey"
         FOREIGN KEY ("orderedBy") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

       CREATE TABLE "CheckIn" (
         id serial PRIMARY KEY,
         "companyId" integer NOT NULL REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         "serviceOrderId" integer NOT NULL REFERENCES "ServiceOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "userId" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         kind varchar(3) NOT NULL CHECK (kind IN ('in','out')),
         lat double precision,
         lng double precision,
         accuracy real,
         "distanceM" integer,
         "onSite" boolean NOT NULL DEFAULT false,
         note varchar(500),
         "createdAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "CheckIn_order_idx" ON "CheckIn" ("serviceOrderId", "createdAt" DESC);
       CREATE INDEX "CheckIn_company_idx" ON "CheckIn" ("companyId", "createdAt" DESC);

       -- Permisos nuevos (si alguno ya existiera, no se duplica).
       INSERT INTO "Permission" (entity, action)
       SELECT e, a FROM (VALUES
         ('events','read'),('events','create'),('events','update'),('events','delete'),
         ('locations','read'),('locations','create'),('locations','update'),('locations','delete'),
         ('blueprints','read'),('blueprints','create'),('blueprints','update'),('blueprints','delete'),
         ('payroll','read'),('payroll','create'),('payroll','update'),('payroll','delete'),
         ('checkin','read'),('checkin','create'),
         ('reports','read')
       ) AS v(e, a)
       WHERE NOT EXISTS (SELECT 1 FROM "Permission" p WHERE p.entity = v.e AND p.action = v.a);

       -- Eventos, lugares y planos: lo que cada rol tenía sobre órdenes.
       INSERT INTO "RolePermission" ("roleId", "permissionId")
       SELECT rp."roleId", np.id
         FROM "RolePermission" rp
         JOIN "Permission" op ON op.id = rp."permissionId" AND op.entity = 'serviceOrders'
         JOIN "Permission" np ON np.entity IN ('events','locations','blueprints') AND np.action = op.action
       ON CONFLICT DO NOTHING;

       -- Sueldos: quien podía editar usuarios.
       INSERT INTO "RolePermission" ("roleId", "permissionId")
       SELECT rp."roleId", np.id
         FROM "RolePermission" rp
         JOIN "Permission" op ON op.id = rp."permissionId" AND op.entity = 'users' AND op.action = 'update'
         JOIN "Permission" np ON np.entity = 'payroll'
       ON CONFLICT DO NOTHING;

       -- Check-in: ver para quien ve órdenes; hacerlo para quien las edita. Reportes: quien ve órdenes.
       INSERT INTO "RolePermission" ("roleId", "permissionId")
       SELECT rp."roleId", np.id
         FROM "RolePermission" rp
         JOIN "Permission" op ON op.id = rp."permissionId" AND op.entity = 'serviceOrders' AND op.action = 'read'
         JOIN "Permission" np ON (np.entity = 'checkin' AND np.action = 'read') OR (np.entity = 'reports' AND np.action = 'read')
       ON CONFLICT DO NOTHING;
       INSERT INTO "RolePermission" ("roleId", "permissionId")
       SELECT rp."roleId", np.id
         FROM "RolePermission" rp
         JOIN "Permission" op ON op.id = rp."permissionId" AND op.entity = 'serviceOrders' AND op.action = 'update'
         JOIN "Permission" np ON np.entity = 'checkin' AND np.action = 'create'
       ON CONFLICT DO NOTHING;

       -- El Administrador tiene todo.
       INSERT INTO "RolePermission" ("roleId", "permissionId")
       SELECT ${admin}, p.id FROM "Permission" p
       WHERE NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = ${admin} AND rp."permissionId" = p.id);`,
      t,
    );
  },
};

export default checkinReportesPermisos;
