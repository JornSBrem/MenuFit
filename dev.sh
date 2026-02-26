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

# Verwijder eventueel al draaiend proces op poort 3000
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "Poort 3000 al in gebruik — bestaand proces stoppen..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi

echo "Backend starten..."
node --experimental-strip-types src/backend/server.ts &

echo "Admin web app starten..."
npm --prefix src/admin-web/app run dev &

echo ""
echo "Services draaien:"
echo "  Backend:   http://localhost:3000"
echo "  Admin web: http://localhost:5173"
echo ""
echo "Stop met CTRL+C."
echo ""

wait
