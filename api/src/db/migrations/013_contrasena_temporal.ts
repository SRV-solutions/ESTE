import type { Migration } from '../migrate';
import { sql } from '../migrate';

/**
 * Contraseña temporal: a quien le crean el usuario (o le cambia la contraseña un administrador)
 * le llega por mail una contraseña temporal y la tiene que cambiar apenas entra.
 */
const contrasenaTemporal: Migration = {
  name: '013_contrasena_temporal',
  up: async (t) => {
    await sql(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false;`, t);
  },
};

export default contrasenaTemporal;
