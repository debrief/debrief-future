#!/usr/bin/env bash
# Patch VS Code server's webview files for E2E testing.
#
# Four patches are applied:
#
# 1.  index.html: Comments out CSP to allow modified scripts to execute
# 1b. index.html: Bypasses the origin-hash hostname check in signalReady()
#                  so the webview iframe can establish its MessageChannel with
#                  the VS Code host (required when CDN interceptor serves from localhost)
# 2.  workbench.js: Removes the origin-hash guard that silently drops webview-ready messages
# 3.  workbench.js: Removes the isBodyVisible() gate on webview view resolution
#                   (fixes Blocker 4: resolveWebviewView never called in headless)
#
# NOTE: The service worker is intentionally left enabled. It is the designed
# mechanism for intercepting vscode-cdn.net requests and serving webview content
# from local files via postMessage. Disabling it breaks offline webview loading
# because the browser attempts real DNS resolution on the CDN domain.
# See docs/project_notes/webview-e2e-research.md for full analysis.
#
# These patches enable Playwright to interact with real extension webview content
# in headless openvscode-server.
#
# Works with both code-server and openvscode-server:
#   code-server:        .../lib/vscode/out/vs/...
#   openvscode-server:  .../out/vs/...
#
# Usage:
#   bash tests/e2e/scripts/patch-webview.sh [SERVER_DIR]
#
# SERVER_DIR defaults to /opt/openvscode-server
#
# Version: Tested against openvscode-server v1.109.5

set -euo pipefail

SERVER_DIR="${1:-/opt/openvscode-server}"
PATCH_FAILURES=0

# Find the webview pre directory — try both code-server and openvscode-server layouts
VSCODE_DIR=$(find "$SERVER_DIR" -path "*/vs/workbench/contrib/webview/browser/pre" -type d 2>/dev/null | head -1)
if [ -z "$VSCODE_DIR" ]; then
  echo "ERROR: Could not find VS Code webview directory in $SERVER_DIR" >&2
  echo "  Searched for: */vs/workbench/contrib/webview/browser/pre" >&2
  find "$SERVER_DIR" -name "pre" -type d 2>/dev/null | head -5 >&2
  exit 1
fi

INDEX_HTML="$VSCODE_DIR/index.html"
echo "Patching $INDEX_HTML..."

# Backup (idempotent — only backup if .bak doesn't already exist)
[ -f "${INDEX_HTML}.bak" ] || cp "$INDEX_HTML" "${INDEX_HTML}.bak"

# ── Patch 1: Comment out CSP meta tag ─────────────────────────────────────────
if grep -q '<!--<meta http-equiv="Content-Security-Policy"' "$INDEX_HTML" || \
   grep -q '<!-- CSP disabled for E2E -->' "$INDEX_HTML"; then
  echo "  ✓ Patch 1: CSP already commented out"
elif grep -q '<meta http-equiv="Content-Security-Policy"' "$INDEX_HTML"; then
  sed -i 's|<meta http-equiv="Content-Security-Policy"|<!-- CSP disabled for E2E -->\n\t<!--<meta http-equiv="Content-Security-Policy"|' "$INDEX_HTML"
  sed -i '/<!--<meta http-equiv="Content-Security-Policy"/,/style-src/{s|>$|>-->|}' "$INDEX_HTML"
  echo "  ✓ Patch 1: CSP meta tag commented out"
else
  echo "  ✗ Patch 1 FAILED: Expected CSP meta tag not found in index.html" >&2
  echo "    This may indicate an openvscode-server version change." >&2
  PATCH_FAILURES=$((PATCH_FAILURES + 1))
fi

# ── Patch 1b: Bypass origin-hash hostname check in signalReady() ─────────────
# The webview iframe's signalReady() computes a SHA-256 hash of parentOrigin
# and checks it against the iframe's hostname. When the CDN interceptor serves
# pre/index.html from localhost, the hostname never matches, so signalReady()
# throws and the MessageChannel to VS Code is never established — meaning
# extension webview content (React, Leaflet) never renders in #active-frame.
#
# Fix: Replace the hash-validation block with an unconditional start().
if grep -q '// E2E: origin hash bypass' "$INDEX_HTML"; then
  echo "  ✓ Patch 1b: Origin hash bypass already applied"
elif grep -q "if (hostname === parentOriginHash" "$INDEX_HTML"; then
  sed -i '/if (hostname === parentOriginHash/,/throw new Error.*Expected.*hostname/{
    s|if (hostname === parentOriginHash.*|// E2E: origin hash bypass — always start regardless of hostname|
    s|// validation succeeded!|// (original validation removed for E2E testing)|
    s|return start(parentOrigin);|start(parentOrigin); return;|
    s|}$||
    s|throw new Error.*Expected.*parentOriginHash.*|// (origin hash check removed for E2E)|
  }' "$INDEX_HTML"
  echo "  ✓ Patch 1b: Origin hash hostname check bypassed"
else
  echo "  ✗ Patch 1b FAILED: Expected origin hash check not found in index.html" >&2
  PATCH_FAILURES=$((PATCH_FAILURES + 1))
fi

# ── Patches 2 & 3: workbench.js ───────────────────────────────────────────────
WORKBENCH_JS=$(find "$SERVER_DIR" -path "*/vs/code/browser/workbench/workbench.js" -type f 2>/dev/null | head -1)
if [ -z "$WORKBENCH_JS" ]; then
  echo "✗ FAILED: Could not find workbench.js" >&2
  echo "  Searched for: */vs/code/browser/workbench/workbench.js" >&2
  find "$SERVER_DIR" -name "workbench.js" -type f 2>/dev/null | head -5 >&2
  exit 1
fi

echo "Patching $WORKBENCH_JS..."
[ -f "${WORKBENCH_JS}.bak" ] || cp "$WORKBENCH_JS" "${WORKBENCH_JS}.bak"

# Use heredoc with 'PYEOF' (quoted) to prevent bash from expanding ${...}
# template literals in the JavaScript patterns. Pass WORKBENCH_JS as argv[1].
python3 - "$WORKBENCH_JS" << 'PYEOF'
import sys

workbench_path = sys.argv[1]
with open(workbench_path, 'r') as f:
    content = f.read()

patch_count = 0

# ── Patch 2: Remove origin hash guard ────────────────────────────────────────
# The host-side message handler checks i.origin against the expected CDN origin.
# When the webview iframe loads from localhost (same origin, via CDN interceptor
# or direct openvscode-server serving), the origin doesn't match the expected
# CDN hash. The original code silently drops the webview-ready message.
#
# This version removes the origin check entirely so the message is always
# processed, allowing the MessageChannel handshake to complete.
#
# Original:
#   if(!(!this.g||i?.data?.target!==this.a)){if(i.origin!==this.nb(this.g)){...;return}
# Patched:
#   if(i?.data?.target===this.a){/*E2E:origin-check-removed*/

# The full original pattern includes the outer if, the inner origin check,
# the console.log, and the return — all of which must be replaced.
# We search for the block from the outer if to 'return}' and replace it
# with just the target check (no origin validation).
final_2 = 'if(i?.data?.target===this.a){/*E2E:origin-check-removed*/'

if final_2 in content:
    print('  \u2713 Patch 2: Origin check already removed')
    patch_count += 1
else:
    # Find the start of the guard
    marker = 'i?.data?.target!==this.a'
    alt_marker = 'i?.data?.target===this.a'
    idx = content.find(marker)
    if idx == -1:
        idx = content.find(alt_marker)
    if idx != -1:
        # Walk back to find 'if(' that starts this block
        search_back = content[max(0, idx-50):idx]
        if_pos = search_back.rfind('if(')
        if if_pos != -1:
            block_start = max(0, idx-50) + if_pos
            # Walk forward to find the 'return}' that closes the origin check
            return_marker = 'return}'
            return_idx = content.find(return_marker, idx)
            if return_idx != -1 and return_idx - idx < 300:
                block_end = return_idx + len(return_marker)
                old_block = content[block_start:block_end]
                content = content.replace(old_block, final_2)
                print('  \u2713 Patch 2: Origin hash guard removed')
                patch_count += 1
            else:
                print('  \u2717 Patch 2 FAILED: Could not find return} closing origin check', file=sys.stderr)
        else:
            print('  \u2717 Patch 2 FAILED: Could not find if( before target check', file=sys.stderr)
    else:
        print('  \u2717 Patch 2 FAILED: Target check pattern not found', file=sys.stderr)
        print('    This may indicate an openvscode-server version change.', file=sys.stderr)

# ── Patch 3: Remove isBodyVisible() gate on webview view resolution ──────────
# In headless openvscode-server, sidebar webview views are never marked visible,
# so resolveWebviewView() is never called. This patch removes the visibility gate
# so that the webview view is always resolved when its pane is constructed.
old_3 = 'oc(){this.isBodyVisible()?(this.pc(),this.c.value?.claim(this,$e(this.element),void 0)):this.c.value?.release(this)}'
new_3 = 'oc(){this.pc();if(this.isBodyVisible()){this.c.value?.claim(this,$e(this.element),void 0)}else{this.c.value?.release(this)}}'
if new_3 in content:
    print('  \u2713 Patch 3: Visibility gate already removed')
    patch_count += 1
elif old_3 in content:
    content = content.replace(old_3, new_3)
    print('  \u2713 Patch 3: Visibility gate on webview view resolution removed')
    patch_count += 1
else:
    print('  \u2717 Patch 3 FAILED: Expected visibility gate pattern not found', file=sys.stderr)
    print('    Pattern: oc(){this.isBodyVisible()?(this.pc(),...', file=sys.stderr)
    print('    This may indicate an openvscode-server version change.', file=sys.stderr)

with open(workbench_path, 'w') as f:
    f.write(content)

sys.exit(0 if patch_count >= 1 else 1)
PYEOF
PATCH_FAILURES=$((PATCH_FAILURES + $?))

# ── Summary ────────────────────────────────────────────────────────────────────
if [ "$PATCH_FAILURES" -gt 0 ]; then
  echo ""
  echo "⚠ WARNING: $PATCH_FAILURES patch(es) failed to apply." >&2
  echo "  This likely means openvscode-server has been upgraded." >&2
  echo "  Check the patterns in this script against the new version." >&2
  echo "  Tested against: openvscode-server v1.109.5" >&2
  exit 1
fi

echo ""
echo "✓ All webview patches applied successfully."
echo "  Tested against: openvscode-server v1.109.5"
