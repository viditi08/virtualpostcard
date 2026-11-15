#!/usr/bin/env bash
# Builds the React site, then installs the Python API.
# Works from the repository root or from backend/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HERE"
if [ ! -f "$ROOT/frontend/package.json" ] && [ -f "$ROOT/../frontend/package.json" ]; then
  ROOT="$(cd "$ROOT/.." && pwd)"
fi

if ! command -v npm >/dev/null 2>&1; then
  NODE_VERSION=v22.21.0
  mkdir -p "$ROOT/.node"
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ -C "$ROOT/.node" --strip-components=1
  export PATH="$ROOT/.node/bin:$PATH"
fi

cd "$ROOT/frontend"
npm install --include=dev
npm run build
cd "$ROOT/backend"
python3 -m pip install -r requirements.txt
