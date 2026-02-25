#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <resource-group> <parameters-file> [deployment-name]" >&2
  exit 1
fi

RESOURCE_GROUP="$1"
PARAMETERS_FILE="$2"
DEPLOYMENT_NAME="${3:-menufit-prod-postgres-$(date +%Y%m%d%H%M%S)}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/postgres-flex-server.bicep"

if [[ ! -f "$PARAMETERS_FILE" ]]; then
  echo "Parameters file not found: $PARAMETERS_FILE" >&2
  exit 1
fi

az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --parameters @"$PARAMETERS_FILE" \
  --query "properties.outputs" \
  -o json
