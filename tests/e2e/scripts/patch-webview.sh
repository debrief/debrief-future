#!/usr/bin/env bash
# Patch VS Code server's webview files for E2E testing.
#
# Four patches are applied:
#
# 1a. index.html: Disables the service worker that blocks #active-frame creation
# 1b. index.html: Comments out CSP to allow the modified script to execute
# 2.  workbench.js: Removes the origin-hash guard that silently drops webview-ready messages
# 3.  workbench.js: Removes the isBodyVisible() gate on webview view resolution
#                   (fixes Blocker 4: resolveWebviewView never called in headless)
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
#
# See docs/project_notes/webview-e2e-research.md for full analysis.

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

# ── Patch 1a: Disable service worker ──────────────────────────────────────────
# Version guard: check that the expected pattern exists before patching
if grep -q "const disableServiceWorker = true;" "$INDEX_HTML"; then
  echo "  ✓ Patch 1a: Service worker already disabled"
elif grep -q "searchParams.has('disableServiceWorker')" "$INDEX_HTML"; then
  sed -i "s/const disableServiceWorker = searchParams.has('disableServiceWorker');/const disableServiceWorker = true; \/\/ Patched for E2E testing/" "$INDEX_HTML"
  echo "  ✓ Patch 1a: Service worker disabled"
else
  echo "  ✗ Patch 1a FAILED: Expected pattern not found in index.html" >&2
  echo "    Pattern: searchParams.has('disableServiceWorker')" >&2
  echo "    This may indicate an openvscode-server version change." >&2
  PATCH_FAILURES=$((PATCH_FAILURES + 1))
fi

# ── Patch 1b: Comment out CSP meta tag ────────────────────────────────────────
if grep -q '<!--<meta http-equiv="Content-Security-Policy"' "$INDEX_HTML" || \
   grep -q '<!-- CSP disabled for E2E -->' "$INDEX_HTML"; then
  echo "  ✓ Patch 1b: CSP already commented out"
elif grep -q '<meta http-equiv="Content-Security-Policy"' "$INDEX_HTML"; then
  sed -i 's|<meta http-equiv="Content-Security-Policy"|<!-- CSP disabled for E2E -->\n\t<!--<meta http-equiv="Content-Security-Policy"|' "$INDEX_HTML"
  sed -i '/<!--<meta http-equiv="Content-Security-Policy"/,/style-src/{s|>$|>-->|}' "$INDEX_HTML"
  echo "  ✓ Patch 1b: CSP meta tag commented out"
else
  echo "  ✗ Patch 1b FAILED: Expected CSP meta tag not found in index.html" >&2
  echo "    This may indicate an openvscode-server version change." >&2
  PATCH_FAILURES=$((PATCH_FAILURES + 1))
fi

# ── Patches 2 & 3: workbench.js ──────────────────────────────────────────────
WORKBENCH_JS=$(find "$SERVER_DIR" -path "*/vs/code/browser/workbench/workbench.js" -type f 2>/dev/null | head -1)
if [ -z "$WORKBENCH_JS" ]; then
  echo "✗ FAILED: Could not find workbench.js" >&2
  echo "  Searched for: */vs/code/browser/workbench/workbench.js" >&2
  find "$SERVER_DIR" -name "workbench.js" -type f 2>/dev/null | head -5 >&2
  exit 1
fi

echo "Patching $WORKBENCH_JS..."
[ -f "${WORKBENCH_JS}.bak" ] || cp "$WORKBENCH_JS" "${WORKBENCH_JS}.bak"

python3 -c "
import sys

with open('$WORKBENCH_JS', 'r') as f:
    content = f.read()

patch_count = 0

# ── Patch 2: Remove origin hash guard ────────────────────────────────────────
# This guard silently drops webview-ready messages before the origin hash resolves.
# Change:
#   if(!(!this.g||i?.data?.target!==this.a)){if(i.origin!==this.nb(this.g)){
# To:
#   if(i?.data?.target===this.a){if(this.g&&i.origin!==this.nb(this.g)){
old_2 = 'if(!(!this.g||i?.data?.target!==this.a)){if(i.origin!==this.nb(this.g)){'
new_2 = 'if(i?.data?.target===this.a){if(this.g&&i.origin!==this.nb(this.g)){'
# Check for already-patched version too
if new_2 in content:
    print('  ✓ Patch 2: Origin hash guard already removed')
    patch_count += 1
elif old_2 in content:
    content = content.replace(old_2, new_2)
    print('  ✓ Patch 2: Origin hash guard removed')
    patch_count += 1
else:
    print('  ✗ Patch 2 FAILED: Expected origin hash guard pattern not found', file=sys.stderr)
    print('    Pattern: ' + old_2[:60] + '...', file=sys.stderr)
    print('    This may indicate an openvscode-server version change.', file=sys.stderr)

# ── Patch 3: Remove isBodyVisible() gate on webview view resolution ──────────
# In headless openvscode-server, sidebar webview views are never marked visible,
# so resolveWebviewView() is never called. This patch removes the visibility gate
# so that the webview view is always resolved when its pane is constructed.
#
# Change:
#   oc(){this.isBodyVisible()?(this.pc(),this.c.value?.claim(this,\$e(this.element),void 0)):this.c.value?.release(this)}
# To:
#   oc(){this.pc();if(this.isBodyVisible()){this.c.value?.claim(this,\$e(this.element),void 0)}else{this.c.value?.release(this)}}
old_3 = 'oc(){this.isBodyVisible()?(this.pc(),this.c.value?.claim(this,\$e(this.element),void 0)):this.c.value?.release(this)}'
new_3 = 'oc(){this.pc();if(this.isBodyVisible()){this.c.value?.claim(this,\$e(this.element),void 0)}else{this.c.value?.release(this)}}'
if new_3 in content:
    print('  ✓ Patch 3: Visibility gate already removed')
    patch_count += 1
elif old_3 in content:
    content = content.replace(old_3, new_3)
    print('  ✓ Patch 3: Visibility gate on webview view resolution removed')
    patch_count += 1
else:
    print('  ✗ Patch 3 FAILED: Expected visibility gate pattern not found', file=sys.stderr)
    print('    Pattern: oc(){this.isBodyVisible()?(this.pc(),...', file=sys.stderr)
    print('    This may indicate an openvscode-server version change.', file=sys.stderr)

with open('$WORKBENCH_JS', 'w') as f:
    f.write(content)

# Exit with failure count for the caller to check
sys.exit(0 if patch_count >= 1 else 1)
" || PATCH_FAILURES=$((PATCH_FAILURES + $?))

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
