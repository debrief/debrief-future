#!/usr/bin/env bash
# Evidence artefact: sample invocation of patch-webview.sh against
# openvscode-server v1.109.5, captured for spec #142.
#
# Run this script to reproduce the patch step as CI runs it. It expects
# openvscode-server to be installed at /opt/openvscode-server (override
# with the SERVER_DIR env var). Re-running is safe — every patch is
# idempotent and exits non-zero only if a pattern is missing (which
# signals an upstream upgrade rather than a transient failure).

set -euo pipefail

SERVER_DIR="${SERVER_DIR:-/opt/openvscode-server}"

echo "── Sample patch invocation ─────────────────────────────────────────"
echo "Server dir : $SERVER_DIR"
echo "Script     : tests/e2e/scripts/patch-webview.sh"
echo "Tested vs  : openvscode-server v1.109.5"
echo

bash tests/e2e/scripts/patch-webview.sh "$SERVER_DIR"

echo
echo "── Expected output (first run on a clean server) ───────────────────"
cat <<'EXPECTED'
Patching /opt/openvscode-server/.../pre/index.html...
  ✓ Patch 1: CSP meta tag commented out
  ✓ Patch 1b: Origin hash hostname check bypassed
Patching /opt/openvscode-server/.../workbench.js...
  ✓ Patch 2: Origin hash guard removed
  ✓ Patch 3: Visibility gate on webview view resolution removed

✓ All webview patches applied successfully.
  Tested against: openvscode-server v1.109.5
EXPECTED

echo
echo "── Expected output (re-run; idempotent) ────────────────────────────"
cat <<'EXPECTED'
Patching /opt/openvscode-server/.../pre/index.html...
  ✓ Patch 1: CSP already commented out
  ✓ Patch 1b: Origin hash bypass already applied
Patching /opt/openvscode-server/.../workbench.js...
  ✓ Patch 2: Origin check already removed
  ✓ Patch 3: Visibility gate already removed

✓ All webview patches applied successfully.
  Tested against: openvscode-server v1.109.5
EXPECTED

echo
echo "── Failure mode (server upgraded, pattern not found) ───────────────"
cat <<'EXPECTED'
Patching /opt/openvscode-server/.../workbench.js...
  ✓ Patch 2: Origin hash guard removed
  ✗ Patch 3 FAILED: Expected visibility gate pattern not found
    Pattern: oc(){this.isBodyVisible()?(this.pc(),...
    This may indicate an openvscode-server version change.

⚠ WARNING: 1 patch(es) failed to apply.
  This likely means openvscode-server has been upgraded.
  Check the patterns in this script against the new version.
  Tested against: openvscode-server v1.109.5

# exits 1 — CI fails fast rather than silently losing webview coverage
EXPECTED
