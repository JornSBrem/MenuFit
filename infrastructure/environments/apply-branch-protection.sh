#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<'USAGE'
Usage:
  GH_TOKEN=<token> GH_REPO=<owner/repo> ./infrastructure/environments/apply-branch-protection.sh [branch] [policy-file]

Defaults:
  branch: main
  policy-file: infrastructure/environments/branch-protection.main.json
USAGE
  exit 0
fi

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GH_REPO:?GH_REPO is required (owner/repo)}"

BRANCH="${1:-main}"
POLICY_FILE="${2:-infrastructure/environments/branch-protection.main.json}"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "Policy file not found: $POLICY_FILE" >&2
  exit 2
fi

API_URL="https://api.github.com/repos/${GH_REPO}/branches/${BRANCH}/protection"

echo "Applying branch protection to ${GH_REPO}:${BRANCH} using ${POLICY_FILE}"
curl --fail --silent --show-error \
  --request PUT \
  --url "${API_URL}" \
  --header "Accept: application/vnd.github+json" \
  --header "Authorization: Bearer ${GH_TOKEN}" \
  --data-binary @"${POLICY_FILE}" >/dev/null

echo "Branch protection updated successfully."
