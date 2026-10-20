#!/usr/bin/env bash
# Repair Sportik PostgreSQL after a failed migrate or an "empty" catalog.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Ensuring postgres is up"
docker compose up -d postgres
docker compose exec postgres pg_isready -U app -d sport

echo "==> Widening alembic_version (safe if already applied)"
docker compose exec -T postgres psql -U app -d sport -v ON_ERROR_STOP=0 <<'SQL'
ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128);
SQL

echo "==> Rebuilding and running migrations"
docker compose build migrate
docker compose run --rm migrate

echo "==> Restarting backend (applies SEED_MOCK_DATA on startup)"
docker compose up -d --build backend frontend

echo "==> Current schema version and row counts"
docker compose exec -T postgres psql -U app -d sport <<'SQL'
SELECT version_num FROM alembic_version;
SELECT 'users' AS entity, count(*)::text FROM users
UNION ALL SELECT 'events', count(*)::text FROM events
UNION ALL SELECT 'sports', count(*)::text FROM sports;
SQL

echo "Done. If counts are zero, check: docker compose logs migrate && docker compose logs backend"
