#!/usr/bin/env bash
set -euo pipefail

REDIS_DUMP_PATH="${REDIS_DUMP_PATH:-/var/lib/docker/volumes/nearby_redis_data/_data/appendonlydir}"

echo "Checking Redis persistence path: ${REDIS_DUMP_PATH}"
if [[ ! -d "${REDIS_DUMP_PATH}" ]]; then
  echo "Redis persistence path not found. Update REDIS_DUMP_PATH for your host." >&2
  exit 1
fi

echo "Recent Redis persistence files:"
find "${REDIS_DUMP_PATH}" -maxdepth 2 -type f | sort | tail -n 10

echo "Backup readiness check completed."
