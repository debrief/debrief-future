#!/usr/bin/env bash
# Patch code-server's webview files for E2E testing.
#
# Two patches are applied:
#
# 1. index.html (webview host page):
#    - Disables the service worker that blocks #active-frame creation
#    - Comments out CSP to allow the modified script to execute
#
# 2. workbench.js (VS Code main bundle):
#    - Removes the origin-hash guard that silently drops webview-ready messages
#
# These patches enable Playwright to interact with webview content via the
# MessagePort-based content injection pattern.
#
# Usage:
#   bash tests/e2e/scripts/patch-webview.sh [CODE_SERVER_DIR]
#
# CODE_SERVER_DIR defaults to /opt/code-server
#
# See docs/project_notes/webview-e2e-research.md for full analysis.

set -euo pipefail

CODE_SERVER_DIR="${1:-/opt/code-server}"

# Find the VS Code installation directory
VSCODE_DIR=$(find "$CODE_SERVER_DIR" -path "*/lib/vscode/out/vs/workbench/contrib/webview/browser/pre" -type d 2>/dev/null | head -1)
if [ -z "$VSCODE_DIR" ]; then
  echo "ERROR: Could not find VS Code webview directory in $CODE_SERVER_DIR" >&2
  exit 1
fi

INDEX_HTML="$VSCODE_DIR/index.html"
echo "Patching $INDEX_HTML..."

# Backup
cp "$INDEX_HTML" "${INDEX_HTML}.bak" 2>/dev/null || true

# Patch 1a: Disable service worker
if grep -q "searchParams.has('disableServiceWorker')" "$INDEX_HTML"; then
  sed -i "s/const disableServiceWorker = searchParams.has('disableServiceWorker');/const disableServiceWorker = true; \/\/ Patched for E2E testing/" "$INDEX_HTML"
  echo "  ✓ Service worker disabled"
else
  echo "  - Service worker patch already applied or not needed"
fi

# Patch 1b: Comment out CSP meta tag (it references a SHA hash of the original script)
if grep -q '<meta http-equiv="Content-Security-Policy"' "$INDEX_HTML" && ! grep -q '<!--<meta http-equiv="Content-Security-Policy"' "$INDEX_HTML"; then
  sed -i 's|<meta http-equiv="Content-Security-Policy"|<!-- CSP disabled for E2E -->\n\t<!--<meta http-equiv="Content-Security-Policy"|' "$INDEX_HTML"
  # Close the comment around the CSP line
  sed -i '/<!--<meta http-equiv="Content-Security-Policy"/,/style-src/{s|>$|>-->|}' "$INDEX_HTML"
  echo "  ✓ CSP meta tag commented out"
else
  echo "  - CSP already commented out or not found"
fi

# Patch 2: workbench.js — remove origin hash guard
WORKBENCH_DIR=$(find "$CODE_SERVER_DIR" -path "*/lib/vscode/out/vs/code/browser/workbench" -type d 2>/dev/null | head -1)
if [ -z "$WORKBENCH_DIR" ]; then
  echo "WARNING: Could not find workbench.js directory" >&2
else
  WORKBENCH_JS="$WORKBENCH_DIR/workbench.js"
  if [ -f "$WORKBENCH_JS" ]; then
    echo "Patching $WORKBENCH_JS..."
    cp "$WORKBENCH_JS" "${WORKBENCH_JS}.bak" 2>/dev/null || true

    # Remove the this.g guard: change
    #   if(!(!this.g||i?.data?.target!==this.a)){if(i.origin!==this.nb(this.g)){
    # to:
    #   if(i?.data?.target===this.a){if(this.g&&i.origin!==this.nb(this.g)){
    python3 -c "
import sys
with open('$WORKBENCH_JS', 'r') as f:
    content = f.read()
old = 'if(!(!this.g||i?.data?.target!==this.a)){if(i.origin!==this.nb(this.g)){'
new = 'if(i?.data?.target===this.a){if(this.g&&i.origin!==this.nb(this.g)){'
if old in content:
    content = content.replace(old, new)
    with open('$WORKBENCH_JS', 'w') as f:
        f.write(content)
    print('  ✓ Origin hash guard removed')
else:
    print('  - Origin hash guard already patched or not found')
"
  fi
fi

echo "Webview patches complete."
