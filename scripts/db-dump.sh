#!/usr/bin/env bash
# Hace un backup de la base de Event Box en backups/ (formato custom de pg_dump, para db-restore.sh).
#
# Uso:
#   scripts/db-dump.sh                 → base "este" local (desarrollo)
#   DB_NAME=eventbox scripts/db-dump.sh postgres://postgres:clave@host:5432
set -euo pipefail

SERVER="${1:-}"
DB_NAME="${DB_NAME:-este}"
TS=$(date +%Y%m%d%H%M)
OUT="backups/eventbox-produccion-$TS.dump"
mkdir -p backups

if [ -n "$SERVER" ]; then
  pg_dump --no-owner --no-privileges -Fc -f "$OUT" "${SERVER%/}/$DB_NAME"
else
  export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
  pg_dump --no-owner --no-privileges -Fc -f "$OUT" "$DB_NAME"
fi
echo "Backup: $OUT ($(du -h "$OUT" | cut -f1))"
