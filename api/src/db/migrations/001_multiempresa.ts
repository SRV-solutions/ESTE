import type { Migration } from '../migrate';
import { sql } from '../migrate';

const TENANT_TABLES = ['User', 'Location', 'Event', 'Category', 'Item', 'ServiceOrder'];

/** Reemplaza una FK por otra con distinto ON DELETE (las originales borraban órdenes en cascada). */
const refk = (table: string, column: string, ref: string, onDelete: string) => `
  ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_${column}_fkey";
  ALTER TABLE "${table}" ADD CONSTRAINT "${table}_${column}_fkey"
    FOREIGN KEY ("${column}") REFERENCES "${ref}"(id) ON UPDATE CASCADE ON DELETE ${onDelete};`;

/**
 * Sortex multiempresa:
 * - Empresas (clientes que alquilan la plataforma) y todo el stock separado por empresa.
 * - Suscripción mensual: pagos (Mercado Pago) y facturas electrónicas (ARCA).
 * - Índices en todas las FK, unicidad donde corresponde y borrados seguros.
 * - Datos existentes: pasan a la empresa E.S.T.E. Eventos.
 */
const multiempresa: Migration = {
  name: '001_multiempresa',
  up: async (t) => {
    // ---------- Empresas ----------
    await sql(
      `CREATE TABLE "Company" (
         id serial PRIMARY KEY,
         name varchar(120) NOT NULL,
         "legalName" varchar(160),
         cuit varchar(11) UNIQUE CHECK (cuit ~ '^[0-9]{11}$'),
         "taxCondition" varchar(32) NOT NULL DEFAULT 'consumidor_final'
           CHECK ("taxCondition" IN ('responsable_inscripto','monotributo','exento','consumidor_final')),
         email varchar(160),
         phone varchar(60),
         address varchar(200),
         "logoUrl" varchar(500),
         status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
         "monthlyPriceUsd" numeric(10,2) NOT NULL DEFAULT 400 CHECK ("monthlyPriceUsd" >= 0),
         "paidUntil" date,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now()
       );

       -- La base que ya existía es de E.S.T.E.: queda como empresa 1, al día por 30 días.
       INSERT INTO "Company" (id, name, phone, address, "logoUrl", "paidUntil")
       SELECT 1, 'E.S.T.E. Eventos', '4921-1200', 'Famatina 4033', '/logo.png', current_date + 30
       WHERE EXISTS (SELECT 1 FROM "User");
       SELECT setval(pg_get_serial_sequence('"Company"', 'id'), GREATEST((SELECT MAX(id) FROM "Company"), 1));`,
      t,
    );

    for (const table of TENANT_TABLES) {
      await sql(
        `ALTER TABLE "${table}" ADD COLUMN "companyId" integer
           REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
         UPDATE "${table}" SET "companyId" = 1 WHERE "companyId" IS NULL AND EXISTS (SELECT 1 FROM "Company" WHERE id = 1);
         CREATE INDEX "${table}_companyId_idx" ON "${table}" ("companyId");`,
        t,
      );
      if (table !== 'User') await sql(`ALTER TABLE "${table}" ALTER COLUMN "companyId" SET NOT NULL;`, t);
    }

    // Los superadmins de SRV pueden no pertenecer a ninguna empresa; el resto sí.
    await sql(
      `ALTER TABLE "User" ADD COLUMN "isSuperAdmin" boolean NOT NULL DEFAULT false;
       ALTER TABLE "User" ADD CONSTRAINT "User_company_required" CHECK ("companyId" IS NOT NULL OR "isSuperAdmin");`,
      t,
    );

    // Códigos únicos por empresa (dos empresas pueden tener su propio "HDMI-1").
    await sql(
      `ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_code_key";
       CREATE UNIQUE INDEX "Category_company_code_key" ON "Category" ("companyId", code);
       ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_code_key";
       CREATE UNIQUE INDEX "Item_company_code_key" ON "Item" ("companyId", code);`,
      t,
    );

    // ---------- Integridad ----------
    await sql(
      `ALTER TABLE "Item" ALTER COLUMN code SET NOT NULL;
       ALTER TABLE "Item" ALTER COLUMN "categoryId" SET NOT NULL;
       ALTER TABLE "Event" ALTER COLUMN "locationId" SET NOT NULL;
       ALTER TABLE "ServiceOrder" ALTER COLUMN "eventId" SET NOT NULL;
       ALTER TABLE "ServiceOrder" ALTER COLUMN "orderedBy" SET NOT NULL;
       ALTER TABLE "StoreItem" ALTER COLUMN "itemIdParent" SET NOT NULL;
       ALTER TABLE "StoreItem" ALTER COLUMN "itemIdChild" SET NOT NULL;
       ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_not_self" CHECK ("itemIdParent" <> "itemIdChild");
       ALTER TABLE "ServiceOrder" ALTER COLUMN observations TYPE text;
       ALTER TABLE "Category" ALTER COLUMN description TYPE text;`,
      t,
    );

    // Antes: borrar un usuario o un lugar borraba en cascada órdenes de servicio enteras.
    await sql(
      refk('ServiceOrder', 'orderedBy', 'User', 'RESTRICT') +
        refk('ServiceOrder', 'checkedBy', 'User', 'SET NULL') +
        refk('ServiceOrder', 'deployedBy', 'User', 'SET NULL') +
        refk('ServiceOrder', 'eventId', 'Event', 'RESTRICT') +
        refk('Event', 'locationId', 'Location', 'RESTRICT') +
        refk('Item', 'ownerId', 'User', 'SET NULL'),
      t,
    );

    // Un ítem no puede estar dos veces en la misma orden ni en dos contenedores a la vez.
    await sql(
      `CREATE UNIQUE INDEX "ServiceOrderItem_order_item_key" ON "ServiceOrderItem" ("serviceOrderId", "itemId");
       CREATE INDEX "ServiceOrderItem_itemId_idx" ON "ServiceOrderItem" ("itemId");
       CREATE UNIQUE INDEX "ServiceOrderStoreItem_order_child_key" ON "ServiceOrderStoreItem" ("serviceOrderId", "itemIdChild");
       CREATE INDEX "ServiceOrderStoreItem_parent_idx" ON "ServiceOrderStoreItem" ("itemIdParent");
       CREATE INDEX "ServiceOrderStoreItem_child_idx" ON "ServiceOrderStoreItem" ("itemIdChild");
       CREATE UNIQUE INDEX "StoreItem_child_key" ON "StoreItem" ("itemIdChild");
       CREATE INDEX "StoreItem_parent_idx" ON "StoreItem" ("itemIdParent");
       CREATE INDEX "Item_categoryId_idx" ON "Item" ("categoryId");
       CREATE INDEX "Event_locationId_idx" ON "Event" ("locationId");
       CREATE INDEX "ServiceOrder_eventId_idx" ON "ServiceOrder" ("eventId");
       CREATE INDEX "ServiceOrder_company_status_idx" ON "ServiceOrder" ("companyId", status);
       CREATE INDEX "User_roleId_idx" ON "User" ("roleId");`,
      t,
    );

    // ---------- Suscripción y facturación ----------
    await sql(
      `CREATE TABLE "Payment" (
         id serial PRIMARY KEY,
         "companyId" integer NOT NULL REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         period char(7) NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
         "amountUsd" numeric(10,2) NOT NULL,
         "exchangeRate" numeric(12,2) NOT NULL,
         "amountArs" numeric(14,2) NOT NULL,
         status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
         method varchar(16) NOT NULL DEFAULT 'mercadopago' CHECK (method IN ('mercadopago','manual')),
         "mpPreferenceId" varchar(80),
         "mpPaymentId" varchar(40) UNIQUE,
         "paidAt" timestamptz,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "Payment_company_idx" ON "Payment" ("companyId", "createdAt" DESC);

       CREATE TABLE "Invoice" (
         id serial PRIMARY KEY,
         "companyId" integer NOT NULL REFERENCES "Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         "paymentId" integer NOT NULL UNIQUE REFERENCES "Payment"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
         status varchar(16) NOT NULL CHECK (status IN ('issued','failed')),
         "pointOfSale" integer,
         "voucherType" integer,
         "voucherNumber" integer,
         cae varchar(20),
         "caeExpiresAt" date,
         "amountArs" numeric(14,2) NOT NULL,
         "receiverDocType" integer,
         "receiverDocNumber" varchar(20),
         "receiverName" varchar(160),
         "receiverTaxCondition" varchar(32),
         "serviceFrom" date,
         "serviceTo" date,
         error text,
         "issuedAt" timestamptz,
         "createdAt" timestamptz NOT NULL DEFAULT now(),
         "updatedAt" timestamptz NOT NULL DEFAULT now(),
         UNIQUE ("pointOfSale", "voucherType", "voucherNumber")
       );
       CREATE INDEX "Invoice_company_idx" ON "Invoice" ("companyId", "createdAt" DESC);

       -- Ticket de acceso de ARCA (WSAA): dura 12 h y ARCA no entrega otro mientras siga vigente.
       CREATE TABLE "ArcaTicket" (
         service varchar(20) PRIMARY KEY,
         token text NOT NULL,
         sign text NOT NULL,
         "expiresAt" timestamptz NOT NULL
       );`,
      t,
    );

    // ---------- Textos ----------
    await sql(
      `UPDATE "Role" SET "roleName" = 'Usuario común' WHERE "roleName" = 'Usuario Comun';
       UPDATE "Role" SET "roleName" = 'Asistente de usuarios' WHERE "roleName" = 'Asistente de Usuarios';
       UPDATE "Role" SET "roleName" = 'Coordinador de depósito' WHERE "roleName" = 'Coordinador de Deposito';
       UPDATE "Role" SET "roleName" = 'Coordinador de servicios' WHERE "roleName" = 'Coordinador de Servicios';
       UPDATE "Role" SET "roleName" = 'Operador de depósito' WHERE "roleName" = 'Operador de Deposito';
       UPDATE "Role" SET description = 'Asistente con permisos de modificación sobre usuarios.' WHERE id = 3;
       UPDATE "Role" SET description = 'Coordinador con permisos de modificación sobre ítems, categorías y órdenes.' WHERE id = 4;
       UPDATE "Role" SET description = 'Coordinador de órdenes de servicio, sin permisos de modificación sobre el stock.' WHERE id = 5;
       UPDATE "Role" SET description = 'Operador con permisos de modificación sobre ítems y categorías.' WHERE id = 6;

       -- Caracteres perdidos al importar un CSV de Excel (Windows-1252) como UTF-8.
       UPDATE "Category"
          SET name = replace(name, 'Cu' || chr(65533) || 'druples', 'Cuádruples'),
              description = replace(description, 'Cu' || chr(65533) || 'druples', 'Cuádruples')
        WHERE name LIKE '%' || chr(65533) || '%' OR description LIKE '%' || chr(65533) || '%';`,
      t,
    );
  },
};

export default multiempresa;
