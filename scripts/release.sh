#!/usr/bin/env bash
# Apply pending database migrations against a deployed environment.
#
# The worker container runs this automatically on every deploy. Use this
# script to migrate manually — e.g. for a zero-downtime release where you
# want the schema updated before new application code goes live.
#
#   DATABASE_URL="postgresql://…" ./scripts/release.sh
#
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

host=$(printf '%s' "$DATABASE_URL" | sed -E 's#.*@([^/:]+).*#\1#')
echo "Applying migrations to ${host}…"

pnpm --filter @dentalos/db exec prisma migrate deploy

echo "Migrations applied. Current status:"
pnpm --filter @dentalos/db exec prisma migrate status
