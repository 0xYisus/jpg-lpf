#!/usr/bin/env bash
# Copy Python Salto artifacts into the Vite public folder for the web UI.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/simulations/salto"
DEST="$ROOT/public/data/salto"
mkdir -p "$DEST"
cp "$SRC"/summary.csv "$SRC"/seasons_window_*.csv "$SRC"/bets_window_*.csv "$SRC"/comparison.md "$DEST"/
echo "Synced Salto CSVs → public/data/salto/"
