#!/usr/bin/env bash
#
# extract.sh — produce a history-preserved subtree split of apps/spec-navigator/
# from debrief/debrief-future, ready to push as the new repo's main branch.
#
# Usage:
#   ./extract.sh [target-dir]
#
# Defaults target-dir to /tmp/spec-navigator-extract. The directory is recreated
# on every run, so this script is idempotent — re-running it discards any
# previous attempt and starts fresh.
#
# This script intentionally does not push anywhere. It only produces a local
# branch you can inspect before bootstrap-new-repo.sh pushes it.

set -euo pipefail

TARGET_DIR="${1:-/tmp/spec-navigator-extract}"
SOURCE_REMOTE="https://github.com/debrief/debrief-future.git"
SOURCE_BRANCH="main"
PREFIX="apps/spec-navigator"
EXTRACT_BRANCH="spec-navigator-extracted"

echo "==> spec-navigator extraction kit / Step 1: subtree split"
echo "    Source:    ${SOURCE_REMOTE} (branch ${SOURCE_BRANCH})"
echo "    Prefix:    ${PREFIX}"
echo "    Target:    ${TARGET_DIR}"
echo "    Branch:    ${EXTRACT_BRANCH}"
echo

if [[ -e "${TARGET_DIR}" ]]; then
  echo "==> Removing existing ${TARGET_DIR} for a clean re-run."
  rm -rf "${TARGET_DIR}"
fi

echo "==> Cloning source repository (full history)."
git clone "${SOURCE_REMOTE}" "${TARGET_DIR}"

cd "${TARGET_DIR}"
git switch "${SOURCE_BRANCH}"

echo "==> Validating Phase 1 has landed in ${SOURCE_BRANCH}."
if ! [[ -f "apps/spec-navigator/src/defaults.ts" ]]; then
  echo "ERROR: apps/spec-navigator/src/defaults.ts is missing on ${SOURCE_BRANCH}."
  echo "       Phase 1 of #248 must be merged before extraction. Aborting."
  exit 1
fi

# Strict bar: no debrief production literal in src/ outside defaults.ts fallbacks.
LEAKED=$(grep -rEn "'debrief'|\"debrief\"|debrief-future|debrief\\.github\\.io" apps/spec-navigator/src/ \
  | grep -vE '/defaults\.ts:' || true)
if [[ -n "${LEAKED}" ]]; then
  echo "ERROR: found unparameterised debrief literals in apps/spec-navigator/src/:"
  echo "${LEAKED}"
  echo
  echo "Fix these before extracting. Aborting."
  exit 1
fi

echo "==> Producing subtree split branch ${EXTRACT_BRANCH}."
git subtree split --prefix="${PREFIX}" -b "${EXTRACT_BRANCH}"

echo "==> Validating extracted branch."
git switch "${EXTRACT_BRANCH}"

EXTRACT_COMMITS=$(git rev-list --count HEAD)
echo "    Extracted branch contains ${EXTRACT_COMMITS} commits."
if (( EXTRACT_COMMITS < 1 )); then
  echo "ERROR: extracted branch has zero commits. Aborting."
  exit 1
fi

# Confirm the structure matches a freestanding app, not a monorepo subpath.
for required in package.json src/main.tsx vite.config.ts; do
  if ! [[ -f "${required}" ]]; then
    echo "ERROR: extracted branch is missing ${required}. Aborting."
    exit 1
  fi
done

# Confirm zero monorepo-prefixed paths leaked through.
if git ls-files | grep -E "^apps/spec-navigator/" >/dev/null; then
  echo "ERROR: extracted branch still contains apps/spec-navigator/-prefixed paths."
  exit 1
fi

echo "==> Smoke-installing extracted source."
if command -v pnpm >/dev/null 2>&1; then
  # Allow the install to fail gracefully — the extracted branch may need the
  # tsconfig and ESLint patches applied first. Print but do not block.
  if ! pnpm install --frozen-lockfile=false >/tmp/spec-nav-extract-install.log 2>&1; then
    echo "    NOTE: pnpm install reported issues; see /tmp/spec-nav-extract-install.log."
    echo "    The standalone repo will need patches/04-eslint-standalone.md and"
    echo "    patches/05-tsconfig-standalone.md applied before tests pass."
  else
    echo "    pnpm install succeeded."
  fi
else
  echo "    pnpm not on PATH — skipping smoke install."
fi

cat <<EOF

==> SUCCESS. Subtree split complete.

Branch:     ${EXTRACT_BRANCH}
Location:   ${TARGET_DIR}
Commits:    ${EXTRACT_COMMITS}

Next step:
  1. Create the empty repo on github.com (do not initialise it):

       gh repo create debrief/spec-navigator --public \\
         --description "Browser-based viewer for speckit specifications" \\
         --homepage https://debrief.github.io/spec-navigator/

  2. Run bootstrap-new-repo.sh from this kit:

       cd $(dirname "$(realpath "$0")")
       ./bootstrap-new-repo.sh ${TARGET_DIR}

EOF
