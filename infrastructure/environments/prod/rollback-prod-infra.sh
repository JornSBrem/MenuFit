#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <resource-group> <known-good-parameters-file> <rollback-deployment-name>" >&2
  exit 1
fi

RESOURCE_GROUP="$1"
PARAMETERS_FILE="$2"
ROLLBACK_DEPLOYMENT_NAME="$3"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

"$SCRIPT_DIR/deploy-prod-infra.sh" "$RESOURCE_GROUP" "$PARAMETERS_FILE" "$ROLLBACK_DEPLOYMENT_NAME"
