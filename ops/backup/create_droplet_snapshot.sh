#!/usr/bin/env bash
set -euo pipefail

if ! command -v doctl >/dev/null 2>&1; then
  echo "doctl is required to create DigitalOcean snapshots." >&2
  exit 1
fi

SNAPSHOT_PREFIX="${BACKUP_PREFIX:-nearby-backup}"
TIMESTAMP="$(date +%Y%m%d)"
SNAPSHOT_NAME="${SNAPSHOT_PREFIX}-${TIMESTAMP}"

if [[ -n "${DO_DROPLET_ID:-}" ]]; then
  TARGET="${DO_DROPLET_ID}"
elif [[ -n "${DO_DROPLET_NAME:-}" ]]; then
  TARGET="$(doctl compute droplet list --format ID,Name --no-header | awk -v name="$DO_DROPLET_NAME" '$2 == name {print $1; exit}')"
else
  echo "Set DO_DROPLET_ID or DO_DROPLET_NAME before running this script." >&2
  exit 1
fi

if [[ -z "${TARGET}" ]]; then
  echo "Could not resolve the target droplet." >&2
  exit 1
fi

echo "Creating snapshot ${SNAPSHOT_NAME} for droplet ${TARGET}"
doctl compute droplet-action snapshot "${TARGET}" --snapshot-name "${SNAPSHOT_NAME}"
echo "Snapshot request submitted."
