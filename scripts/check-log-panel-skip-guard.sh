#!/usr/bin/env bash
# Skip-guard for the webview log-panel E2E suite.
#
# Spec 210 (Un-skip webview log-panel E2E suite) reactivated
# tests/e2e/test-log-panel.spec.ts after its #143/#176 blockers shipped.
# Spec 233 (Re-activate Log Panel E2E Suite after #142 resolves)
# restored the suite again following #534's narrow `.fixme` mute.
#
# FR-005 requires a CI-gated lint check that fails if the suite ever
# re-acquires test.skip(, test.fixme(, test.describe.skip(, or
# test.describe.fixme( — which would silently reduce coverage of the
# real integration path (code-server → webview iframe → extension host)
# that no other layer exercises.
#
# Usage: bash scripts/check-log-panel-skip-guard.sh
# Exit code 0 = clean, 1 = skip/fixme detected

set -euo pipefail

TARGET="tests/e2e/test-log-panel.spec.ts"

if [ ! -f "$TARGET" ]; then
  echo "❌ Log-panel skip-guard: $TARGET not found"
  exit 1
fi

VIOLATIONS=$(grep -nE '^\s*test(\.describe)?\.(skip|fixme)\s*\(' "$TARGET" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Log-panel skip-guard failed!"
  echo ""
  echo "$TARGET must not contain test.skip, test.fixme,"
  echo "test.describe.skip, or test.describe.fixme — see spec 233 FR-005."
  echo "Offending lines:"
  echo ""
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ Log-panel skip-guard passed ($TARGET has no skip/fixme)"
