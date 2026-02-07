#!/usr/bin/env bash
# ensure-chromium.sh — Download Playwright Chromium from GH release if not already installed.
#
# This script provides a fallback for sandboxed environments where
# `npx playwright install chromium` cannot reach the Playwright CDN.
# It downloads a pre-built Chromium from the debrief-future GH release
# and writes a .chromium-path file for playwright.config.ts to pick up.
#
# Usage:
#   bash tests/e2e/scripts/ensure-chromium.sh
#
# To update the browser version:
#   1. Download the new chromium zip from https://cdn.playwright.dev/builds/cft/<version>/linux64/chrome-linux64.zip
#   2. Upload to the GH release at https://github.com/debrief/debrief-future/releases/tag/playwright-browsers-v1
#   3. Update CHROMIUM_VERSION and PLAYWRIGHT_BUILD below

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
REPO="debrief/debrief-future"
RELEASE_TAG="playwright-browsers-v1"
ASSET_NAME="chrome-linux64.zip"
CHROMIUM_VERSION="145.0.7632.6"
PLAYWRIGHT_BUILD="1208"

# Where Playwright expects to find chromium
PLAYWRIGHT_BROWSERS="${PLAYWRIGHT_BROWSERS_PATH:-${HOME}/.cache/ms-playwright}"
CHROMIUM_DIR="${PLAYWRIGHT_BROWSERS}/chromium-${PLAYWRIGHT_BUILD}"
CHROME_BIN="${CHROMIUM_DIR}/chrome-linux64/chrome"

# Script directory (tests/e2e/scripts/) → tests/e2e/
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
CHROMIUM_PATH_FILE="${E2E_DIR}/.chromium-path"

# ── Check if already installed ─────────────────────────────────────────────────
if [[ -x "$CHROME_BIN" ]]; then
  echo "Chromium ${PLAYWRIGHT_BUILD} already installed at ${CHROME_BIN}"
  echo "$CHROME_BIN" > "$CHROMIUM_PATH_FILE"
  exit 0
fi

# ── Try standard Playwright install first ──────────────────────────────────────
echo "Attempting standard Playwright chromium install..."
if npx playwright install chromium 2>/dev/null; then
  if [[ -x "$CHROME_BIN" ]]; then
    echo "Playwright install succeeded"
    echo "$CHROME_BIN" > "$CHROMIUM_PATH_FILE"
    exit 0
  fi
fi
echo "Standard install unavailable, falling back to GH release..."

# ── Download from GitHub Release ───────────────────────────────────────────────
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${RELEASE_TAG}/${ASSET_NAME}"
TMP_ZIP="/tmp/chromium-${PLAYWRIGHT_BUILD}.zip"

echo "Downloading Chromium ${CHROMIUM_VERSION} (build ${PLAYWRIGHT_BUILD})..."
echo "  URL: ${DOWNLOAD_URL}"

curl -fSL --retry 4 --retry-delay 2 -o "$TMP_ZIP" "$DOWNLOAD_URL"
echo "  Downloaded: $(du -h "$TMP_ZIP" | cut -f1)"

# ── Extract ────────────────────────────────────────────────────────────────────
echo "Extracting to ${CHROMIUM_DIR}..."
mkdir -p "$CHROMIUM_DIR"
unzip -oq "$TMP_ZIP" -d "$CHROMIUM_DIR"

# Create marker files that Playwright checks
touch "${CHROMIUM_DIR}/INSTALLATION_COMPLETE"
touch "${CHROMIUM_DIR}/DEPENDENCIES_VALIDATED"

# ── Verify ─────────────────────────────────────────────────────────────────────
if [[ ! -x "$CHROME_BIN" ]]; then
  echo "ERROR: Chrome binary not found at ${CHROME_BIN}" >&2
  echo "Contents of ${CHROMIUM_DIR}:" >&2
  ls -la "$CHROMIUM_DIR" >&2
  exit 1
fi

VERSION=$("$CHROME_BIN" --version 2>&1 || true)
echo "Installed: ${VERSION}"

# ── Write path file for playwright.config.ts ───────────────────────────────────
echo "$CHROME_BIN" > "$CHROMIUM_PATH_FILE"
echo "Chromium path written to ${CHROMIUM_PATH_FILE}"

# ── Cleanup ────────────────────────────────────────────────────────────────────
rm -f "$TMP_ZIP"
echo "Done."
