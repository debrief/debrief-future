#!/usr/bin/env bash
# Vendor a prebuilt dist of radiantearth/stac-browser at the pinned tag under
# apps/web-shell/test-fixtures/stac-browser-v<TAG>/. The Playwright interop
# test (specs/241) serves this dist statically and points it at our regenerated
# catalog — vendoring keeps the test offline-clean and within the 60s budget
# (research.md decision 7).
#
# To bump the pinned version: edit STAC_BROWSER_TAG below and the corresponding
# DEST directory, re-run, commit the new tree, delete the old one. Bumps are
# deliberate so screenshots remain reproducible.
#
# Re-runs of this script overwrite the existing dist tree in-place.

set -euo pipefail

STAC_BROWSER_TAG="v3.3.4"
DEST_DIR="apps/web-shell/test-fixtures/stac-browser-${STAC_BROWSER_TAG}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

echo "Cloning radiantearth/stac-browser @ ${STAC_BROWSER_TAG} into ${WORK_DIR}"
git clone --depth 1 --branch "${STAC_BROWSER_TAG}" \
  https://github.com/radiantearth/stac-browser.git "${WORK_DIR}/stac-browser"

cd "${WORK_DIR}/stac-browser"
echo "Installing dependencies (npm ci)"
npm ci
echo "Building dist"
NODE_OPTIONS=--openssl-legacy-provider npm run build || npm run build

cd "${REPO_ROOT}"
mkdir -p "${DEST_DIR}"
# Wipe any stale contents (preserve .gitkeep)
find "${DEST_DIR}" -mindepth 1 -not -name '.gitkeep' -delete
cp -R "${WORK_DIR}/stac-browser/dist/." "${DEST_DIR}/"
echo "Vendored stac-browser ${STAC_BROWSER_TAG} → ${DEST_DIR}/"
