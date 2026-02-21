#!/usr/bin/env bash
# heroku-e2e.sh — Run Playwright E2E tests against a deployed Heroku review app.
#
# Usage:
#   bash tests/e2e/scripts/heroku-e2e.sh https://<app>.herokuapp.com
#   bash tests/e2e/scripts/heroku-e2e.sh  # uses $HEROKU_APP_URL
#
# Prerequisites:
#   - Playwright + Chromium installed (pnpm exec playwright install chromium)
#   - A deployed Heroku review app URL

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HEROKU_URL="${1:-${HEROKU_APP_URL:-}}"

if [[ -z "$HEROKU_URL" ]]; then
  echo "Usage: $0 <heroku-app-url>"
  echo "   or: HEROKU_APP_URL=https://... $0"
  exit 1
fi

echo "[heroku-e2e] Target: $HEROKU_URL"

# Wait for the app to be reachable (handles cold-start)
echo "[heroku-e2e] Waiting for app to respond..."
for i in $(seq 1 30); do
  if curl -sf --connect-timeout 10 "$HEROKU_URL" -o /dev/null 2>/dev/null; then
    echo "[heroku-e2e] App reachable after ${i}s"
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "[heroku-e2e] ERROR: App not reachable after 30 attempts"
    exit 1
  fi
  sleep 2
done

# Run the Heroku smoke tests
cd "$REPO_ROOT"
HEROKU_APP_URL="$HEROKU_URL" \
CODE_SERVER_URL="$HEROKU_URL" \
  pnpm exec playwright test \
    --config tests/e2e/playwright.config.ts \
    tests/e2e/test-heroku-smoke.spec.ts

echo "[heroku-e2e] All tests passed!"
