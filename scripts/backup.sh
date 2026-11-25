#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${BACKUP_DATABASE_URL:-}" ]]; then
  echo "Set BACKUP_DATABASE_URL" >&2
  exit 1
fi
mkdir -p backups
stamp="$(date -u +%Y%m%d)"
pg_dump --no-owner --no-acl "$BACKUP_DATABASE_URL" > "backups/backstage-${stamp}.sql"
echo "Wrote backups/backstage-${stamp}.sql"
