#!/usr/bin/env bash
# Copia assets al bundle standalone de Next.js (requerido tras cada build).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STANDALONE="$ROOT/.next/standalone"

if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "sync-standalone-assets: no standalone output at $STANDALONE — skip"
  exit 0
fi

mkdir -p "$STANDALONE/.next"
rm -rf "$STANDALONE/.next/static" "$STANDALONE/public"
cp -r "$ROOT/.next/static" "$STANDALONE/.next/static"
cp -r "$ROOT/public" "$STANDALONE/public"
echo "sync-standalone-assets: OK → $STANDALONE"
