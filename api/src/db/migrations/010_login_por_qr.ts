import type { Migration } from '../migrate';
import { sql } from '../migrate';

/** Tokens de un solo uso para entrar en el celular escaneando el QR desde una sesión abierta en la PC. */
const loginPorQr: Migration = {
  name: '010_login_por_qr',
  up: async (t) => {
    await sql(
      `CREATE TABLE "LoginLinkToken" (
         id serial PRIMARY KEY,
         "userId" integer NOT NULL REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE,
         "tokenHash" varchar(64) NOT NULL UNIQUE,
         "expiresAt" timestamptz NOT NULL,
         "usedAt" timestamptz,
         "createdAt" timestamptz NOT NULL DEFAULT now()
       );
       CREATE INDEX "LoginLinkToken_user_idx" ON "LoginLinkToken" ("userId");`,
      t,
    );
  },
};

export default loginPorQr;
