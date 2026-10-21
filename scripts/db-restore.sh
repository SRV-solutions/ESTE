#!/usr/bin/env bash
# Restaura un backup de Event Box en un Postgres, en una base llamada "eventbox" (o la que se indique).
#
# Uso:
#   scripts/db-restore.sh <archivo.dump> [URL de conexión al servidor]
#
# Ejemplos:
#   scripts/db-restore.sh backups/eventbox-produccion-202610201230.dump
#       → usa PGHOST/PGUSER/PGPASSWORD/PGPORT del entorno (o localhost, usuario postgres)
#   scripts/db-restore.sh backups/eventbox-produccion-202610201230.dump postgres://postgres:clave@1.2.3.4:5432
#   DB_NAME=eventbox_pruebas scripts/db-restore.sh backups/x.dump
#
# Si la base ya existe, la reemplaza por completo (pide confirmación). Necesita psql y pg_restore
# de la misma versión mayor que el Postgres destino o más nueva.
set -euo pipefail

DUMP="${1:-}"
SERVER="${2:-}"
DB_NAME="${DB_NAME:-eventbox}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Uso: $0 <archivo.dump> [postgres://usuario:clave@host:puerto]" >&2
  exit 1
fi

# Conexión al servidor (base de mantenimiento "postgres") y a la base destino.
if [ -n "$SERVER" ]; then
  SERVER="${SERVER%/}"
  ADMIN_URL="$SERVER/postgres"
  DB_URL="$SERVER/$DB_NAME"
else
  export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
  ADMIN_URL="postgres"
  DB_URL="$DB_NAME"
fi

exists=$(psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")
if [ "$exists" = "1" ]; then
  echo "La base \"$DB_NAME\" ya existe en el servidor. Se va a BORRAR y reemplazar con $DUMP."
  read -r -p "¿Seguir? (escribí SI): " ok
  [ "$ok" = "SI" ] || { echo "Cancelado."; exit 1; }
  psql "$ADMIN_URL" -q -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid()" >/dev/null
  psql "$ADMIN_URL" -q -c "DROP DATABASE \"$DB_NAME\""
fi

echo "Creando la base \"$DB_NAME\"…"
psql "$ADMIN_URL" -q -c "CREATE DATABASE \"$DB_NAME\" ENCODING 'UTF8' TEMPLATE template0"

echo "Restaurando $DUMP…"
# --no-owner / --no-privileges: los objetos quedan del usuario que restaura, sin depender del dueño original.
pg_restore --no-owner --no-privileges --exit-on-error -d "$DB_URL" "$DUMP"

echo
# Solo ASCII en el SQL: la consola de Windows manda los acentos en otra codificación y psql los rechaza.
psql "$DB_URL" -tAc "SELECT 'Listo: '||(SELECT count(*) FROM \"Company\")||' empresa(s), '||(SELECT count(*) FROM \"User\")||' usuarios, '||(SELECT count(*) FROM \"Item\")||' items, migraciones hasta '||(SELECT max(name) FROM \"EventBoxMigration\")"
echo "En el .env de la API: DB_NAME=$DB_NAME (y DB_HOST, DB_USER, DB_PASSWORD del servidor). Al arrancar, la API aplica sola las migraciones que falten."
