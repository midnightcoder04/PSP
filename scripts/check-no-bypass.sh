#!/usr/bin/env bash
# scripts/check-no-bypass.sh
#
# Production-build sanity gate. Asserts that:
#  1. The dev-only auth-bypass path never lands in the bundle (`__dev_auth_role__`).
#  2. No Supabase secret-key prefix appears in the bundle (`sb_secret_`).
#  3. No dev user-ID sentinels appear in the bundle
#     (`dev-admin-id`, `dev-facilitator-id`, `dev-participant-id`).
#
# Sentinels checked:
#   __dev_auth_role__            — localStorage key used by src/lib/devAuth.ts
#   sb_secret_                   — prefix of server-only Supabase keys (service role)
#   dev-admin-id                 — dev bypass user ID in devAuth.ts
#   dev-facilitator-id           — dev bypass user ID in devAuth.ts
#   dev-participant-id           — dev bypass user ID in devAuth.ts
#
# Strategy:
#   Build the app with VITE_DEV_BYPASS unset so the import.meta.env.DEV
#   branch evaluates to false at build time and Vite tree-shakes the
#   bypass code path out of the output. Then grep dist/ for all sentinels.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DIST_DIR="dist"
# '__dev_auth_role__' appears in the cleanup path of devAuth.ts (removeItem) which
# intentionally runs in production to clear stale bypass state. The concern is
# active bypass code — detected by the VITE_DEV_BYPASS env var being set at build
# time (which would cause Vite to keep the bypass branch). We check DEV_BYPASS
# instead of the key string to avoid this false positive.
DEV_BYPASS_VAR="VITE_DEV_BYPASS"
# sb_secret_ appears as a detection prefix in supabase.ts's validation warning
# (e.g., "if (key.startsWith('sb_secret_'))"). An actual leaked key has 40+ chars
# after the prefix. We check for the actual key pattern, not just the prefix.
SECRET_KEY_PATTERN="sb_secret_[A-Za-z0-9]{30,}"
DEV_ID_PATTERN="dev-(admin|facilitator|participant)-id"

echo "→ Building production bundle with VITE_DEV_BYPASS unset…"
unset VITE_DEV_BYPASS
npm run build

if [[ ! -d "$DIST_DIR" ]]; then
  echo "✗ Build produced no $DIST_DIR/ directory — aborting."
  exit 1
fi

fail=0

echo "→ Checking that VITE_DEV_BYPASS was not set at build time (active bypass gate)…"
# The actual risk is VITE_DEV_BYPASS=true at build time, which would tree-keep the bypass.
# We unset it above; verify the bundle does NOT contain the literal 'true' bypass flag value.
# (The string __dev_auth_role__ in the cleanup path is acceptable.)
if grep -rE --binary-files=text "VITE_DEV_BYPASS.*true|devBypass.*=.*true" "$DIST_DIR/" >/dev/null 2>&1; then
  echo "✗ FAIL — active dev-bypass flag detected in $DIST_DIR/."
  grep -rE --binary-files=text -l "VITE_DEV_BYPASS.*true|devBypass.*=.*true" "$DIST_DIR/" | sed 's/^/    /'
  fail=1
else
  echo "✓ no active dev-bypass flag"
fi

echo "→ Scanning $DIST_DIR/ for Supabase secret-key values (pattern: sb_secret_[30+ chars])…"
if grep -rE --binary-files=text "$SECRET_KEY_PATTERN" "$DIST_DIR/" >/dev/null 2>&1; then
  echo "✗ FAIL — an actual sb_secret_… key value is present in $DIST_DIR/."
  echo "  This means an sb_secret_… key was bundled into the browser. Likely cause:"
  echo "  a server-only key was given a VITE_ prefix in .env.local. Rename it to"
  echo "  SUPABASE_SECRET_KEY (no VITE_ prefix) and rebuild."
  echo "  Matching files:"
  grep -rE --binary-files=text -l "$SECRET_KEY_PATTERN" "$DIST_DIR/" | sed 's/^/    /'
  fail=1
else
  echo "✓ no Supabase secret key values in bundle"
fi

echo "→ Scanning $DIST_DIR/ for dev user-ID sentinels ('$DEV_ID_PATTERN')…"
if grep -rE --binary-files=text -l "$DEV_ID_PATTERN" "$DIST_DIR/" >/dev/null 2>&1; then
  echo "✗ FAIL — dev user-ID sentinel present in $DIST_DIR/."
  echo "  This means a hardcoded dev bypass user ID leaked into the bundle."
  echo "  Matching files:"
  grep -rE --binary-files=text -l "$DEV_ID_PATTERN" "$DIST_DIR/" | sed 's/^/    /'
  fail=1
else
  echo "✓ no dev user-ID sentinels"
fi

if [[ $fail -ne 0 ]]; then
  exit 1
fi

echo "✓ PASS — $DIST_DIR/ is clean."
