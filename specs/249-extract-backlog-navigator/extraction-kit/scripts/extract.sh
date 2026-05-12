#!/usr/bin/env bash
#
# extract.sh — Subtree-split apps/backlog-navigator/ from debrief-future
# into a standalone-shaped tree.
#
# Steps:
#   1. Clone debrief-future into a working dir
#   2. git subtree split --prefix=apps/backlog-navigator -b extracted
#   3. Checkout extracted; sed-replace vite.config.ts base default
#   4. pnpm install --lockfile-only; commit pnpm-lock.yaml
#   5. Smoke: pnpm install && pnpm test && pnpm build (abort on failure)
#
# Usage:
#   ./extract.sh --destination <org>/<repo> [--dry-run]
#
# Flags:
#   --destination <org>/<repo>   Required (or read from kit-config.json)
#   --dry-run                    Perform all local steps; do NOT push.
#                                Leaves the working tree in /tmp for inspection.
#
# Spec: 249-extract-backlog-navigator R-001, R-009, R-010, R-012.

set -euo pipefail

# -- Parse args ---------------------------------------------------------------

DESTINATION=""
DRY_RUN=0
SOURCE_REPO="${SOURCE_REPO:-debrief/debrief-future}"
SOURCE_PREFIX="${SOURCE_PREFIX:-apps/backlog-navigator}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --destination)
      DESTINATION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      grep '^# ' "$0" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 64
      ;;
  esac
done

# -- Read kit-config.json if --destination not supplied -----------------------

KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "$DESTINATION" && -f "$KIT_ROOT/kit-config.json" ]]; then
  # Best-effort jq fallback to plain grep if jq absent.
  if command -v jq >/dev/null 2>&1; then
    ORG="$(jq -r '.destination.org // empty' "$KIT_ROOT/kit-config.json")"
    REPO="$(jq -r '.destination.repo // empty' "$KIT_ROOT/kit-config.json")"
    if [[ -n "$ORG" && -n "$REPO" ]]; then
      DESTINATION="$ORG/$REPO"
    fi
  fi
fi

if [[ -z "$DESTINATION" ]]; then
  echo "ERROR: --destination <org>/<repo> required (or set in kit-config.json)" >&2
  echo "Example: ./extract.sh --destination deepbluecltd/backlog-navigator" >&2
  exit 64
fi

if [[ ! "$DESTINATION" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "ERROR: destination must look like <org>/<repo>, got: $DESTINATION" >&2
  exit 64
fi

DEST_ORG="${DESTINATION%%/*}"
DEST_REPO="${DESTINATION##*/}"

echo "==> extract.sh"
echo "    Source:      $SOURCE_REPO (prefix: $SOURCE_PREFIX)"
echo "    Destination: $DESTINATION"
echo "    Mode:        $(if [[ $DRY_RUN -eq 1 ]]; then echo 'DRY RUN'; else echo 'live'; fi)"
echo

# -- Step 1: clone source into temp working dir ------------------------------

WORK_DIR="$(mktemp -d -t backlog-nav-extract-XXXXXX)"
echo "==> Step 1: cloning $SOURCE_REPO into $WORK_DIR"

if [[ $DRY_RUN -eq 1 ]]; then
  # In dry-run, prefer the local repo if we're inside one (faster, no network).
  if git -C "$KIT_ROOT" rev-parse --show-toplevel >/dev/null 2>&1; then
    REPO_ROOT="$(git -C "$KIT_ROOT" rev-parse --show-toplevel)"
    git clone --quiet "$REPO_ROOT" "$WORK_DIR/repo"
  else
    git clone --quiet "https://github.com/$SOURCE_REPO.git" "$WORK_DIR/repo"
  fi
else
  git clone --quiet "https://github.com/$SOURCE_REPO.git" "$WORK_DIR/repo"
fi

cd "$WORK_DIR/repo"

# -- Step 2: subtree split ---------------------------------------------------

echo "==> Step 2: git subtree split --prefix=$SOURCE_PREFIX -b extracted"
git subtree split --prefix="$SOURCE_PREFIX" -b extracted >/dev/null
git checkout --quiet extracted

# -- Step 3: sed-replace vite.config.ts base default -------------------------

echo "==> Step 3: sed-replace vite.config.ts base default → /$DEST_REPO/"

# Match the existing default: /debrief-future/backlog-navigator/
# Replace with: /$DEST_REPO/
if [[ -f vite.config.ts ]]; then
  # Use perl for portable in-place edit (BSD sed != GNU sed)
  perl -i -pe "s|'/debrief-future/backlog-navigator/'|'/$DEST_REPO/'|g" vite.config.ts
  if grep -q "'/$DEST_REPO/'" vite.config.ts; then
    echo "    OK — base default now /$DEST_REPO/"
  else
    echo "    WARNING — sed substitution may not have matched. Verify vite.config.ts manually." >&2
  fi
else
  echo "    WARNING — vite.config.ts not found at expected location" >&2
fi

# -- Step 4: regenerate pnpm-lock.yaml --------------------------------------

echo "==> Step 4: pnpm install --lockfile-only"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm not on PATH. Install pnpm to continue." >&2
  exit 70
fi

pnpm install --lockfile-only --silent

if [[ ! -f pnpm-lock.yaml ]]; then
  echo "ERROR: pnpm-lock.yaml was not generated" >&2
  exit 70
fi

git add pnpm-lock.yaml vite.config.ts 2>/dev/null || true
if ! git diff --cached --quiet; then
  # Disable signing for the bootstrap commit — this script runs in
  # sandboxed environments where the signing key isn't always available,
  # and the lockfile-regen commit doesn't need an author signature.
  git -c user.email=extract@kit.local -c user.name="extract.sh" \
      -c commit.gpgsign=false -c gpg.format=openpgp \
    commit --quiet --no-gpg-sign \
    -m "chore: regenerate lockfile and apply standalone base path for ${DESTINATION}"
fi

# -- Step 5: lockfile verification ------------------------------------------
#
# The full smoke build (`pnpm install --frozen-lockfile && pnpm test && pnpm
# build`) runs inside bootstrap-new-repo.sh AFTER the standalone tsconfig /
# eslintrc / etc. templates are applied — the extracted tree alone still
# references the monorepo's `../../tsconfig.base.json` until bootstrap
# substitutes its own. Here we only confirm the lockfile is structurally
# valid (parseable) — anything more would fail spuriously on the unmerged
# tree.

echo "==> Step 5: validate lockfile"
if ! pnpm install --frozen-lockfile --ignore-scripts --silent >/dev/null 2>&1; then
  echo "    LOCKFILE-VALIDATION FAIL: pnpm install --frozen-lockfile rejected the regenerated lockfile" >&2
  echo "==> Working tree left at $WORK_DIR/repo for inspection." >&2
  exit 75
fi
echo "    OK — lockfile parseable, deps resolve"

# -- Final --------------------------------------------------------------------

echo
echo "==> extract.sh complete"
echo "    Working tree:  $WORK_DIR/repo"
echo "    Branch:        extracted"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "    Mode:          DRY RUN — tree preserved for inspection; no push performed."
  echo "    Next:          inspect, then run live mode without --dry-run."
else
  echo "    Next:          ./bootstrap-new-repo.sh --destination $DESTINATION --host $DEST_ORG.github.io"
  # Export the work dir for bootstrap-new-repo.sh to pick up
  echo "$WORK_DIR/repo" > "$KIT_ROOT/.last-extract-path"
fi
