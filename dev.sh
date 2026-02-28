#!/bin/bash
# MenuFit lokale dev omgeving starten
# Start backend + admin web app tegelijk.
# Stop met CTRL+C.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

cleanup() {
  echo ""
  echo "Stoppen..."
  kill 0
}
trap cleanup EXIT INT TERM

echo "Admin web app starten..."
npm --prefix src/admin-web/app run dev &

echo ""
echo "Services draaien:"
echo "  Backend:   http://192.168.1.172:3000 (LXC container)"
echo "  Admin web: http://localhost:5173"
echo ""
echo "Stop met CTRL+C."
echo ""

wait
