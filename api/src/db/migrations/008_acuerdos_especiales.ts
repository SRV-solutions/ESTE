import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * Acuerdo especial de SRV con una empresa: durante un período, precio propio, módulos propios
 * (independientes del plan) y límites propios. Al vencer, la empresa vuelve a su plan.
 */
const acuerdosEspeciales: Migration = {
  name: '008_acuerdos_especiales',
  up: async (t) => {
    await sql(
      `ALTER TABLE "Company"
         ADD COLUMN "dealFrom" date,
         ADD COLUMN "dealUntil" date,
         ADD COLUMN "dealPriceUsd" numeric(10,2),
         ADD COLUMN "dealFeatures" jsonb,
         ADD COLUMN "dealMaxUsers" integer,
         ADD COLUMN "dealMaxTemporary" integer,
         ADD COLUMN "dealNote" text;`,
      t,
    );
  },
};

export default acuerdosEspeciales;
