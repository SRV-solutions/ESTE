import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * - Planes por empresa (Básico, Profesional, Empresa).
 * - Responsables por etapa de la orden (logística y recepción) y traspaso de material entre eventos.
 * - Planos compartidos y módulo de personal con recibos de sueldo.
 */
const planesYModulos: Migration = {
  name: '003_planes_y_modulos',
  up: async (t) => {
    await sql(
      `ALTER TABLE "Company" ADD COLUMN plan varchar(16) NOT NULL DEFAULT 'profesional'
         CHECK (plan IN ('basico','profesional','empresa'));

       ALTER TABLE "ServiceOrder"
         ADD COLUMN "logisticsBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         ADD COLUMN "receptionBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         ADD COLUMN "transferredToId" integer REFERENCES "ServiceOrder"(id) ON UPDATE CASCADE ON DELETE SET NULL;
       CREATE INDEX "ServiceOrder_transferredTo_idx" ON "ServiceOrder" ("transferredToId");

       CREATE TABLE "Blueprint" (
         id serial PRIMARY KEY,
         "companyId" integer NOT NULL REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         "eventId" integer REFERENCES "Event"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         title varchar(160) NOT NULL,
         description text,
         "fileKey" varchar(300) NOT NULL,
         "fileName" varchar(200) NOT NULL,
         "mimeType" varchar(80) NOT NULL,
         size integer NOT NULL,
         "uploadedBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "Blueprint_company_idx" ON "Blueprint" ("companyId", "createdAt" DESC);
       CREATE INDEX "Blueprint_event_idx" ON "Blueprint" ("eventId");

       CREATE TABLE "Employee" (
         id serial PRIMARY KEY,
         "companyId" integer NOT NULL REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         "userId" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         "firstName" varchar(80) NOT NULL,
         "lastName" varchar(80) NOT NULL,
         cuil varchar(11) CHECK (cuil ~ '^[0-9]{11}$'),
         position varchar(120),
         area varchar(120),
         "startDate" date,
         email varchar(160),
         phone varchar(60),
         "isActive" boolean NOT NULL DEFAULT true,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now(),
         UNIQUE ("companyId", cuil),
         UNIQUE ("userId")
       );
       CREATE INDEX "Employee_company_idx" ON "Employee" ("companyId");

       CREATE TABLE "Payslip" (
         id serial PRIMARY KEY,
         "companyId" integer NOT NULL REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         "employeeId" integer NOT NULL REFERENCES "Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         period char(7) NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
         kind varchar(16) NOT NULL DEFAULT 'mensual' CHECK (kind IN ('mensual','aguinaldo','vacaciones','liquidacion_final','otro')),
         "grossAmount" numeric(14,2),
         "netAmount" numeric(14,2),
         "fileKey" varchar(300) NOT NULL,
         "fileName" varchar(200) NOT NULL,
         status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','disputed')),
         "signedAt" timestamptz,
         "signatureIp" varchar(64),
         "employeeComment" text,
         "uploadedBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now(),
         UNIQUE ("employeeId", period, kind)
       );
       CREATE INDEX "Payslip_company_idx" ON "Payslip" ("companyId", period DESC);`,
      t,
    );
  },
};

export default planesYModulos;
