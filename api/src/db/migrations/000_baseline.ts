import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * Esquema original (el que ya tienen las bases existentes). Todo es IF NOT EXISTS:
 * en una base existente no cambia nada; en una vacía crea las tablas y los roles.
 */
const baseline: Migration = {
  name: '000_baseline',
  up: async (t) => {
    await sql(
      `DO $$ BEGIN
         CREATE TYPE "enum_ServiceOrder_status" AS ENUM ('created','in_review','approved','rejected','in_process','ready',
           'dispatched','delivered','returning','received','under_review','disassembled');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      t,
    );

    await sql(
      `CREATE TABLE IF NOT EXISTS "Role" (
         id serial PRIMARY KEY, "roleName" varchar(255) NOT NULL, description varchar(255));
       CREATE TABLE IF NOT EXISTS "Permission" (
         id serial PRIMARY KEY, entity varchar(255) NOT NULL, action varchar(255) NOT NULL);
       CREATE TABLE IF NOT EXISTS "RolePermission" (
         id serial PRIMARY KEY,
         "roleId" integer NOT NULL REFERENCES "Role"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "permissionId" integer NOT NULL REFERENCES "Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         UNIQUE ("roleId", "permissionId"));
       CREATE TABLE IF NOT EXISTS "User" (
         id serial PRIMARY KEY, username varchar(255) NOT NULL UNIQUE, email varchar(255) NOT NULL UNIQUE,
         password varchar(255) NOT NULL, firstname varchar(255), lastname varchar(255),
         "roleId" integer REFERENCES "Role"(id) ON UPDATE CASCADE);
       CREATE TABLE IF NOT EXISTS "Location" (
         id serial PRIMARY KEY, "locationName" varchar(255) NOT NULL, address varchar(255) NOT NULL,
         city varchar(255) NOT NULL, country varchar(255) NOT NULL);
       CREATE TABLE IF NOT EXISTS "Event" (
         id serial PRIMARY KEY, "eventName" varchar(255) NOT NULL, "dateEvent" timestamptz NOT NULL,
         "locationId" integer REFERENCES "Location"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         organizer varchar(255) NOT NULL, producer varchar(255) NOT NULL, "finalClient" varchar(255) NOT NULL);
       CREATE TABLE IF NOT EXISTS "Category" (
         id serial PRIMARY KEY, code varchar(255) NOT NULL UNIQUE, name varchar(255) NOT NULL, description varchar(255),
         type varchar(255) NOT NULL, unity varchar(255) NOT NULL, value double precision NOT NULL,
         weight double precision NOT NULL, "isStorable" boolean NOT NULL, "isContainer" boolean NOT NULL,
         "isActive" boolean NOT NULL);
       CREATE TABLE IF NOT EXISTS "Item" (
         id serial PRIMARY KEY, code varchar(255) UNIQUE, "isActive" boolean NOT NULL, uses integer,
         "ownerId" integer REFERENCES "User"(id) ON UPDATE CASCADE,
         "categoryId" integer REFERENCES "Category"(id) ON UPDATE CASCADE);
       CREATE TABLE IF NOT EXISTS "ServiceOrder" (
         id serial PRIMARY KEY,
         "eventId" integer REFERENCES "Event"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "orderedBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "deployedBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "checkedBy" integer REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "createdDate" date NOT NULL, "incomeDate" timestamptz, "outcomeDate" timestamptz,
         "assemblyDate" timestamptz, "disassemblyDate" timestamptz,
         status "enum_ServiceOrder_status" NOT NULL, observations varchar(255));
       CREATE TABLE IF NOT EXISTS "ServiceOrderItem" (
         id serial PRIMARY KEY,
         "serviceOrderId" integer NOT NULL REFERENCES "ServiceOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "itemId" integer NOT NULL REFERENCES "Item"(id) ON UPDATE CASCADE,
         "isActive" boolean NOT NULL DEFAULT true);
       CREATE TABLE IF NOT EXISTS "ServiceOrderStoreItem" (
         id serial PRIMARY KEY,
         "serviceOrderId" integer NOT NULL REFERENCES "ServiceOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "itemIdParent" integer NOT NULL REFERENCES "Item"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "itemIdChild" integer NOT NULL REFERENCES "Item"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "isActive" boolean NOT NULL DEFAULT true);
       CREATE TABLE IF NOT EXISTS "StoreItem" (
         id serial PRIMARY KEY,
         "itemIdParent" integer REFERENCES "Item"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "itemIdChild" integer REFERENCES "Item"(id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      t,
    );

    // Roles y permisos de fábrica (solo si la base está vacía).
    await sql(
      `INSERT INTO "Permission" (id, entity, action)
       SELECT v.id, v.entity, v.action FROM (VALUES
         (1,'users','create'),(2,'users','read'),(3,'users','update'),(4,'users','delete'),
         (5,'items','create'),(6,'items','read'),(7,'items','update'),(8,'items','delete'),
         (9,'categories','create'),(10,'categories','read'),(11,'categories','update'),(12,'categories','delete'),
         (13,'serviceOrders','create'),(14,'serviceOrders','read'),(15,'serviceOrders','update'),(16,'serviceOrders','delete')
       ) AS v(id, entity, action)
       WHERE NOT EXISTS (SELECT 1 FROM "Permission");

       INSERT INTO "Role" (id, "roleName", description)
       SELECT v.id, v.name, v.description FROM (VALUES
         (1,'Administrador','Administrador con permisos completos sobre todas las entidades.'),
         (2,'Usuario común','Usuario común con solo permisos de lectura.'),
         (3,'Asistente de usuarios','Asistente con permisos de modificación sobre usuarios.'),
         (4,'Coordinador de depósito','Coordinador con permisos de modificación sobre ítems, categorías y órdenes.'),
         (5,'Coordinador de servicios','Coordinador de órdenes de servicio, sin permisos de modificación sobre el stock.'),
         (6,'Operador de depósito','Operador con permisos de modificación sobre ítems y categorías.')
       ) AS v(id, name, description)
       WHERE NOT EXISTS (SELECT 1 FROM "Role");

       INSERT INTO "RolePermission" ("roleId", "permissionId")
       SELECT r, p FROM (VALUES
         (1,ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]),
         (2,ARRAY[2,6,10,14]),
         (3,ARRAY[1,2,3,6,10,14]),
         (4,ARRAY[2,5,6,7,9,10,11,13,14,15]),
         (5,ARRAY[2,6,10,13,14,15]),
         (6,ARRAY[2,5,6,7,9,10,11,14])
       ) AS v(r, perms), unnest(perms) AS p
       WHERE NOT EXISTS (SELECT 1 FROM "RolePermission");

       SELECT setval(pg_get_serial_sequence('"Role"', 'id'), GREATEST((SELECT MAX(id) FROM "Role"), 1));
       SELECT setval(pg_get_serial_sequence('"Permission"', 'id'), GREATEST((SELECT MAX(id) FROM "Permission"), 1));`,
      t,
    );
  },
};

export default baseline;
