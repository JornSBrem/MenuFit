#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <resource-group> <service-prefix>" >&2
  exit 1
fi

RESOURCE_GROUP="$1"
SERVICE_PREFIX="$2"

REQUIRED_TYPES=(
  "Microsoft.App/containerApps"
  "Microsoft.App/managedEnvironments"
  "Microsoft.KeyVault/vaults"
  "Microsoft.OperationalInsights/workspaces"
  "Microsoft.Storage/storageAccounts"
  "Microsoft.Cdn/profiles"
)

resources_json="$(az resource list --resource-group "$RESOURCE_GROUP" -o json)"

for type in "${REQUIRED_TYPES[@]}"; do
  if ! echo "$resources_json" | jq -e --arg t "$type" '.[] | select(.type == $t)' >/dev/null; then
    echo "Missing required resource type: $type" >&2
    exit 1
  fi
done

if ! echo "$resources_json" | jq -e --arg p "$SERVICE_PREFIX" '.[] | select(.name | startswith($p))' >/dev/null; then
  echo "No resources found with expected prefix: $SERVICE_PREFIX" >&2
  exit 1
fi

echo "Production infrastructure validation passed for resource group: $RESOURCE_GROUP"
