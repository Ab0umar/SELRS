#!/usr/bin/env bash
set -euo pipefail

if ! command -v mysqld >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y mysql-server mysql-client
fi

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@12.5.1 --activate
fi

cd /workspace
pnpm install --frozen-lockfile
