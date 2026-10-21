#!/usr/bin/env bash
set -euo pipefail

cd /workspace

if ! sudo mysqladmin --silent ping >/dev/null 2>&1; then
  sudo service mysql start
fi

ready=0
for _ in $(seq 1 30); do
  if sudo mysqladmin --silent ping >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "MySQL did not become ready" >&2
  exit 1
fi

ENV_FILE="$HOME/.selrs-local.env"
if [ ! -f "$ENV_FILE" ]; then
  umask 077
  db_pass="$(openssl rand -hex 16)"
  jwt_secret="$(openssl rand -hex 24)"
  admin_pass="$(openssl rand -hex 12)"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=mysql://selrs:${db_pass}@127.0.0.1:3306/selrs_db
JWT_SECRET=${jwt_secret}
SELRS_DEV_ADMIN_USER=devadmin
SELRS_DEV_ADMIN_PASSWORD=${admin_pass}
EOF
  chmod 600 "$ENV_FILE"
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

db_pass="$(printf '%s' "$DATABASE_URL" | sed -E 's#mysql://selrs:([^@]+)@.*#\1#')"
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS selrs_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS selrs_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'selrs'@'127.0.0.1' IDENTIFIED BY '${db_pass}';
ALTER USER 'selrs'@'127.0.0.1' IDENTIFIED BY '${db_pass}';
GRANT ALL PRIVILEGES ON selrs_db.* TO 'selrs'@'127.0.0.1';
GRANT ALL PRIVILEGES ON selrs_test.* TO 'selrs'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

umask 077
cat > /workspace/.env <<EOF
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000
DATABASE_URL=${DATABASE_URL}
DATABASE_TEST_URL=${DATABASE_URL%selrs_db}selrs_test
JWT_SECRET=${JWT_SECRET}
ATTENDANCE_ENABLED=false
ATTENDANCE_DEVICE_ENABLED=false
ZK_DEVICE_ENABLED=false
SRV100_IMPORT_ENABLED=false
BLACKICE_IMPORT_ENABLED=false
MSSQL_SYNC_AUTO=false
MSSQL_SYNC_INCREMENTAL_AUTO=false
EOF
chmod 600 /workspace/.env

table_count="$(mysql --protocol=TCP -h 127.0.0.1 -u selrs -p"${db_pass}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='selrs_db' AND table_name='user_permissions'" selrs_db)"
if [ "$table_count" != "1" ]; then
  pnpm exec drizzle-kit push --force
fi

test_table_count="$(mysql --protocol=TCP -h 127.0.0.1 -u selrs -p"${db_pass}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='selrs_test' AND table_name='user_permissions'")"
if [ "$test_table_count" != "1" ]; then
  DATABASE_URL="${DATABASE_URL%selrs_db}selrs_test" pnpm exec drizzle-kit push --force
fi

node /workspace/.cursor/seed-dev-admin.mjs

if curl -sf http://127.0.0.1:4000/healthz >/dev/null 2>&1; then
  echo "SELRS dev server is already running"
  exit 0
fi

exec pnpm dev
