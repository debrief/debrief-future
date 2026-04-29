#!/usr/bin/env bash
# Skip-guard for the webview log-panel E2E suite.
#
# Spec 210 (Un-skip webview log-panel E2E suite) reactivated
# tests/e2e/test-log-panel.spec.ts after its #143/#176 blockers shipped.
# Spec 233 (Re-activate Log Panel E2E Suite after #142 resolves)
# restored the suite again following #534's narrow `.fixme` mute.
#
# This guard fails the lint stage if the test file re-acquires a
# **suite-level** mute — `test.describe.skip(` or
# `test.describe.fixme(` — which would silently take the entire
# integration path off CI coverage.
#
# Per-test `test.skip(` / `test.fixme(` markers are PERMITTED.  Spec 233
# §60 (Edge Cases) and FR-005 explicitly allow narrow per-test mutes
# when individual scenarios are blocked on architectural limitations
# of the cloud E2E framework (Hybrid A+D — see
# docs/project_notes/webview-e2e-research.md "Limitations"), provided
# each muted test carries an inline comment pointing to the follow-up
# issue.  The remaining test count is visible in the Playwright report,
# so narrow mutes do not silently reduce coverage the way a
# describe-level mute does.
#
# Usage: bash scripts/check-log-panel-skip-guard.sh
# Exit code 0 = clean, 1 = describe-level skip/fixme detected

set -euo pipefail

TARGET="tests/e2e/test-log-panel.spec.ts"

if [ ! -f "$TARGET" ]; then
  echo "❌ Log-panel skip-guard: $TARGET not found"
  exit 1
fi

VIOLATIONS=$(grep -nE '^\s*test\.describe\.(skip|fixme)\s*\(' "$TARGET" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Log-panel skip-guard failed!"
  echo ""
  echo "$TARGET must not contain test.describe.skip or"
  echo "test.describe.fixme — those mute the entire suite."
  echo "Per-test test.fixme(...) is allowed (see spec 233 §60)."
  echo "Offending lines:"
  echo ""
  echo "$VIOLATIONS"
  exit 1
fi

echo "✅ Log-panel skip-guard passed ($TARGET has no describe-level skip/fixme)"
