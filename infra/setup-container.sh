#!/usr/bin/env bash
# Eenmalige setup van nginx op de Proxmox LXC container
# Draai als root: bash /opt/menufit/infra/setup-container.sh

set -euo pipefail

echo "→ nginx installeren..."
apt-get update -qq
apt-get install -y nginx

echo "→ nginx config koppelen..."
ln -sf /opt/menufit/infra/nginx-menufit.conf /etc/nginx/sites-enabled/menufit
rm -f /etc/nginx/sites-enabled/default

echo "→ nginx config testen..."
nginx -t

echo "→ nginx starten..."
systemctl enable nginx
systemctl restart nginx

echo ""
echo "✓ Setup klaar! Deployen doe je voortaan met:"
echo "  bash /opt/menufit/deploy.sh"
echo ""
