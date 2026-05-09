#!/usr/bin/env bash
# scripts/check-no-bypass.sh
#
# Production-build sanity gate. Asserts that the dev-only auth-bypass path
# never lands in a production bundle. Run before any production deploy
# (and as a CI gate, once CI exists).
#
# Strategy:
#   1. Build the app with VITE_DEV_BYPASS unset so the import.meta.env.DEV
#      branch evaluates to false at build time and Vite tree-shakes the
#      bypass code path out of the output.
#   2. Grep the dist/ output for the unique localStorage key the bypass
#      uses (`__dev_auth_role__`). Zero matches = pass; any match = fail.
#
# Why this key? It is unique to src/lib/devAuth.ts and would only land
# in dist/ if the bypass branch were retained.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DIST_DIR="dist"
DEV_SENTINEL="__dev_auth_role__"
SECRET_PREFIX="sb_secret_"

echo "→ Building production bundle with VITE_DEV_BYPASS unset…"
unset VITE_DEV_BYPASS
npm run build

if [[ ! -d "$DIST_DIR" ]]; then
  echo "✗ Build produced no $DIST_DIR/ directory — aborting."
  exit 1
fi

fail=0

echo "→ Scanning $DIST_DIR/ for dev-bypass sentinel '$DEV_SENTINEL'…"
if grep -r --binary-files=text -l "$DEV_SENTINEL" "$DIST_DIR/" >/dev/null 2>&1; then
  echo "✗ FAIL — dev-bypass marker '$DEV_SENTINEL' present in $DIST_DIR/."
  echo "  Matching files:"
  grep -r --binary-files=text -l "$DEV_SENTINEL" "$DIST_DIR/" | sed 's/^/    /'
  fail=1
else
  echo "✓ no dev-bypass markers"
fi

echo "→ Scanning $DIST_DIR/ for Supabase secret-key prefix '$SECRET_PREFIX'…"
if grep -r --binary-files=text -l "$SECRET_PREFIX" "$DIST_DIR/" >/dev/null 2>&1; then
  echo "✗ FAIL — secret-key prefix '$SECRET_PREFIX' present in $DIST_DIR/."
  echo "  This means an sb_secret_… key was bundled into the browser. Likely cause:"
  echo "  a server-only key was given a VITE_ prefix in .env.local. Rename it to"
  echo "  SUPABASE_SECRET_KEY (no VITE_ prefix) and rebuild."
  echo "  Matching files:"
  grep -r --binary-files=text -l "$SECRET_PREFIX" "$DIST_DIR/" | sed 's/^/    /'
  fail=1
else
  echo "✓ no Supabase secret keys"
fi

if [[ $fail -ne 0 ]]; then
  exit 1
fi

echo "✓ PASS — $DIST_DIR/ is clean."
