#!/usr/bin/env bash
# Eenmalige PostgreSQL setup voor MenuFit op de Proxmox LXC container
# Draai als root: bash /opt/menufit/infra/setup-postgres.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_DIR}/infra/.postgres-env"
SCHEMA_FILE="${REPO_DIR}/src/backend/domain/storage/sql/state-postgres-schema.sql"

echo ""
echo "→ PostgreSQL installeren..."
apt-get update -qq
apt-get install -y postgresql

echo ""
echo "→ PostgreSQL starten en enablen..."
systemctl enable postgresql
systemctl start postgresql

# Genereer een random wachtwoord
PG_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
PG_USER="menufit"
PG_DB="menufit"

echo ""
echo "→ Database en gebruiker aanmaken..."
runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${PG_USER}') THEN
    CREATE ROLE ${PG_USER} WITH LOGIN PASSWORD '${PG_PASSWORD}';
  ELSE
    ALTER ROLE ${PG_USER} WITH PASSWORD '${PG_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${PG_DB} OWNER ${PG_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${PG_DB}')
\gexec

GRANT ALL PRIVILEGES ON DATABASE ${PG_DB} TO ${PG_USER};
SQL

echo ""
echo "→ Schema toepassen..."
CONN_STRING="postgres://${PG_USER}:${PG_PASSWORD}@localhost:5432/${PG_DB}"
PGPASSWORD="${PG_PASSWORD}" psql -U "${PG_USER}" -h localhost -d "${PG_DB}" \
  -v ON_ERROR_STOP=1 -f "${SCHEMA_FILE}"

echo ""
echo "→ Environment file schrijven naar ${ENV_FILE}..."
cat > "${ENV_FILE}" <<ENV
STATE_STORE_DRIVER=postgres
STATE_STORE_POSTGRES_URL=${CONN_STRING}
ENV
chmod 600 "${ENV_FILE}"

echo ""
echo "✓ PostgreSQL setup klaar!"
echo ""
echo "  Connection string: ${CONN_STRING}"
echo "  Env file:          ${ENV_FILE}"
echo ""
echo "  Start de backend nu met:"
echo "  systemctl restart menufit-backend"
echo ""
