#!/usr/bin/env bash
# MenuFit deploy script — draai dit als root op de container
# Gebruik: bash /opt/menufit/deploy.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo ""
echo "╔══════════════════════════════════╗"
echo "║       MenuFit Deploy             ║"
echo "╚══════════════════════════════════╝"
echo ""

echo "→ Git pull..."
git pull --rebase

echo ""
echo "→ Admin web dependencies..."
npm --prefix src/admin-web/app install --silent

echo ""
echo "→ Admin web build..."
npm --prefix src/admin-web/app run build

echo ""
echo "→ Backend herstarten..."
systemctl restart menufit-backend

echo ""
echo "→ Nginx herladen..."
systemctl reload nginx 2>/dev/null || true

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "✓ Deploy klaar!"
echo "  Admin portal: http://${IP}"
echo "  Backend API:  http://${IP}:3000"
echo ""
