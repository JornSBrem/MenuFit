#!/usr/bin/env bash
# Cloudflare Tunnel setup voor MenuFit
# Maakt de backend + admin portal bereikbaar via internet zonder port forwarding.
#
# Vereisten:
#   - Cloudflare-account met een domein (gratis plan is voldoende)
#   - Draai als root op de container
#
# Gebruik:
#   bash /opt/menufit/infra/setup-cloudflare-tunnel.sh

set -euo pipefail

TUNNEL_NAME="menufit"

# ──────────────────────────────────────────────────────────────
# 1. cloudflared installeren
# ──────────────────────────────────────────────────────────────
if ! command -v cloudflared &>/dev/null; then
  echo "→ cloudflared installeren..."
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -qq
  apt-get install -y cloudflared
else
  echo "✓ cloudflared is al geïnstalleerd ($(cloudflared --version))"
fi

# ──────────────────────────────────────────────────────────────
# 2. Inloggen bij Cloudflare (opent een URL die je in je browser opent)
# ──────────────────────────────────────────────────────────────
if [ ! -f /root/.cloudflared/cert.pem ]; then
  echo ""
  echo "→ Inloggen bij Cloudflare..."
  echo "  Er verschijnt een URL — open die in je browser en selecteer je domein."
  echo ""
  cloudflared tunnel login
else
  echo "✓ Al ingelogd bij Cloudflare"
fi

# ──────────────────────────────────────────────────────────────
# 3. Tunnel aanmaken
# ──────────────────────────────────────────────────────────────
if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
  echo "✓ Tunnel '${TUNNEL_NAME}' bestaat al"
  TUNNEL_ID=$(cloudflared tunnel list -o json | python3 -c "
import sys, json
for t in json.load(sys.stdin):
    if t['name'] == '${TUNNEL_NAME}':
        print(t['id']); break
")
else
  echo "→ Tunnel '${TUNNEL_NAME}' aanmaken..."
  cloudflared tunnel create "${TUNNEL_NAME}"
  TUNNEL_ID=$(cloudflared tunnel list -o json | python3 -c "
import sys, json
for t in json.load(sys.stdin):
    if t['name'] == '${TUNNEL_NAME}':
        print(t['id']); break
")
fi
echo "  Tunnel ID: ${TUNNEL_ID}"

# ──────────────────────────────────────────────────────────────
# 4. Config schrijven
# ──────────────────────────────────────────────────────────────
CONFIG_FILE="/root/.cloudflared/config.yml"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Tunnel aangemaakt! Nu moet je een hostname kiezen."
echo ""
echo "  Voorbeeld: menufit.jouwdomein.nl"
echo "═══════════════════════════════════════════════════════════"
echo ""
read -rp "Hostname (bijv. menufit.jouwdomein.nl): " HOSTNAME

cat > "${CONFIG_FILE}" <<YAML
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: ${HOSTNAME}
    service: https://localhost:443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
YAML

echo "✓ Config geschreven naar ${CONFIG_FILE}"

# ──────────────────────────────────────────────────────────────
# 5. DNS record aanmaken
# ──────────────────────────────────────────────────────────────
echo ""
echo "→ DNS record aanmaken voor ${HOSTNAME}..."
cloudflared tunnel route dns "${TUNNEL_NAME}" "${HOSTNAME}" || true

# ──────────────────────────────────────────────────────────────
# 6. Systemd service installeren
# ──────────────────────────────────────────────────────────────
echo ""
echo "→ cloudflared als service installeren..."
cloudflared service install 2>/dev/null || true
systemctl enable cloudflared
systemctl restart cloudflared

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ Cloudflare Tunnel is actief!"
echo ""
echo "  Admin portal:  https://${HOSTNAME}"
echo "  Backend API:   https://${HOSTNAME}/api/v3/..."
echo "  Health check:  https://${HOSTNAME}/health"
echo ""
echo "  iOS app:       gebruik https://${HOSTNAME} als backend URL"
echo ""
echo "  Status:        systemctl status cloudflared"
echo "  Logs:          journalctl -u cloudflared -f"
echo "═══════════════════════════════════════════════════════════"
echo ""
