#!/usr/bin/env bash
# Serves the built site and the API on the same port.
# Works from the repository root or from backend/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$HERE/server.py" ]; then
  cd "$HERE"
elif [ -f "$HERE/backend/server.py" ]; then
  cd "$HERE/backend"
else
  echo "Could not find backend/server.py" >&2
  exit 1
fi
exec python3 -m uvicorn server:app --host 0.0.0.0 --port "${PORT:-8001}"
