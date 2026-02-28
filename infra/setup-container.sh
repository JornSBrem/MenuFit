#!/usr/bin/env bash
# Eenmalige setup van nginx + SSL + backend service op de Proxmox LXC container
# Draai als root: bash /opt/menufit/infra/setup-container.sh

set -euo pipefail

echo "→ nginx en openssl installeren..."
apt-get update -qq
apt-get install -y nginx openssl

echo "→ Self-signed SSL certificaat aanmaken (10 jaar geldig)..."
mkdir -p /etc/nginx/ssl
IP=$(hostname -I | awk '{print $1}')
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/menufit.key \
    -out /etc/nginx/ssl/menufit.crt \
    -subj "/CN=${IP}/O=MenuFit" \
    -addext "subjectAltName=IP:${IP}"
chmod 600 /etc/nginx/ssl/menufit.key
echo "   Certificaat aangemaakt voor IP: ${IP}"

echo "→ nginx config koppelen..."
ln -sf /opt/menufit/infra/nginx-menufit.conf /etc/nginx/sites-enabled/menufit
rm -f /etc/nginx/sites-enabled/default

echo "→ nginx config testen..."
nginx -t

echo "→ nginx starten..."
systemctl enable nginx
systemctl restart nginx

echo ""
echo "→ menufit-backend systemd service installeren..."
cp /opt/menufit/infra/menufit-backend.service /etc/systemd/system/menufit-backend.service
systemctl daemon-reload
systemctl enable menufit-backend

echo ""
echo "✓ Setup klaar!"
echo "  Admin portal: https://${IP}  (zelfondertekend cert — accepteer de browsermelding)"
echo ""
echo "  Volgende stap — PostgreSQL instellen (eenmalig):"
echo "  bash /opt/menufit/infra/setup-postgres.sh"
echo ""
echo "  Daarna de backend starten:"
echo "  systemctl start menufit-backend"
echo ""
echo "  Deployen doe je voortaan met:"
echo "  bash /opt/menufit/deploy.sh"
echo ""
