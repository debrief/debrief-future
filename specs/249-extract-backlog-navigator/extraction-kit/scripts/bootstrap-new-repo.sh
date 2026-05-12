#!/usr/bin/env bash
#
# bootstrap-new-repo.sh — Push the extracted branch to the new repo,
# install workflows + templates + dummy dataset, commit, push.
#
# MUST be run AFTER extract.sh has produced a working tree under
# /tmp/backlog-nav-extract-XXXXXX/repo on branch `extracted`.
#
# Usage:
#   ./bootstrap-new-repo.sh --destination <org>/<repo> --host <host> [flags]
#
# Flags:
#   --destination <org>/<repo>           Required.
#   --host <host>                        Defaults to <org>.github.io.
#   --merge-unrelated-histories          If the target repo is non-empty
#                                        (e.g., GitHub initialised it with
#                                        a README), merge instead of aborting.
#   --extract-path <path>                Override the auto-detected working
#                                        tree from extract.sh.
#   --dry-run                            Apply templates in a temp dir and
#                                        report; do NOT push.
#
# Spec: 249-extract-backlog-navigator R-011, R-012.

set -euo pipefail

DESTINATION=""
HOST=""
MERGE_UNRELATED=0
EXTRACT_PATH=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --destination) DESTINATION="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --merge-unrelated-histories) MERGE_UNRELATED=1; shift ;;
    --extract-path) EXTRACT_PATH="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) grep '^# ' "$0" | sed 's/^# //'; exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 64 ;;
  esac
done

KIT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "$DESTINATION" && -f "$KIT_ROOT/kit-config.json" ]] && command -v jq >/dev/null 2>&1; then
  ORG_FROM_CFG="$(jq -r '.destination.org // empty' "$KIT_ROOT/kit-config.json")"
  REPO_FROM_CFG="$(jq -r '.destination.repo // empty' "$KIT_ROOT/kit-config.json")"
  HOST_FROM_CFG="$(jq -r '.host // empty' "$KIT_ROOT/kit-config.json")"
  if [[ -n "$ORG_FROM_CFG" && -n "$REPO_FROM_CFG" ]]; then
    DESTINATION="$ORG_FROM_CFG/$REPO_FROM_CFG"
  fi
  if [[ -z "$HOST" && -n "$HOST_FROM_CFG" ]]; then
    HOST="$HOST_FROM_CFG"
  fi
fi

if [[ -z "$DESTINATION" ]]; then
  echo "ERROR: --destination <org>/<repo> required" >&2
  exit 64
fi

DEST_ORG="${DESTINATION%%/*}"
DEST_REPO="${DESTINATION##*/}"
if [[ -z "$HOST" ]]; then
  HOST="$DEST_ORG.github.io"
fi

# Auto-detect working tree from extract.sh if not supplied
if [[ -z "$EXTRACT_PATH" ]]; then
  if [[ -f "$KIT_ROOT/.last-extract-path" ]]; then
    EXTRACT_PATH="$(cat "$KIT_ROOT/.last-extract-path")"
  fi
fi

if [[ $DRY_RUN -eq 1 && -z "$EXTRACT_PATH" ]]; then
  # In dry-run we can synthesize a temp dir
  EXTRACT_PATH="$(mktemp -d -t bootstrap-dryrun-XXXXXX)"
  echo "==> Dry run: using synthesised temp dir $EXTRACT_PATH"
  git init --quiet "$EXTRACT_PATH"
fi

if [[ -z "$EXTRACT_PATH" || ! -d "$EXTRACT_PATH" ]]; then
  echo "ERROR: extract path not found. Run ./extract.sh first, or supply --extract-path." >&2
  exit 70
fi

echo "==> bootstrap-new-repo.sh"
echo "    Destination:   $DESTINATION"
echo "    Host:          $HOST"
echo "    Working tree:  $EXTRACT_PATH"
echo "    Mode:          $(if [[ $DRY_RUN -eq 1 ]]; then echo 'DRY RUN'; else echo 'live'; fi)"
echo

cd "$EXTRACT_PATH"

# -- Step 1: detect non-empty target ------------------------------------------

if [[ $DRY_RUN -eq 0 ]]; then
  echo "==> Step 1: probe destination"
  REMOTE_URL="git@github.com:$DESTINATION.git"
  if git ls-remote --exit-code "$REMOTE_URL" HEAD >/dev/null 2>&1; then
    if [[ $MERGE_UNRELATED -eq 1 ]]; then
      echo "    Target non-empty; --merge-unrelated-histories supplied; will merge."
    else
      cat <<EOF >&2

ERROR: destination repo ($DESTINATION) is NOT empty.

The first push will fail because GitHub's web UI defaults to creating
README/.gitignore/LICENSE files. To recover:

  A) Re-create the repo empty:
       Delete or rename the existing repo on github.com, then re-create
       with all three init checkboxes UNCHECKED.

  B) Merge the unrelated histories:
       ./bootstrap-new-repo.sh --destination $DESTINATION --host $HOST \\
         --merge-unrelated-histories

Option A leaves a cleaner history. Option B is faster.
EOF
      exit 75
    fi
  else
    echo "    Target appears empty (or unreachable — proceeding)."
  fi
fi

# -- Step 2: copy templates with substitution --------------------------------

echo "==> Step 2: copy templates with {{ORG}}, {{REPO}}, {{HOST}} substitution"

TEMPLATE_FILES=(
  README.md
  CONFIGURATION.md
  SECURITY.md
  .eslintrc.cjs
  tsconfig.json
  tsconfig.node.json
  .gitignore
  BACKLOG.dummy.md
)

for tmpl in "${TEMPLATE_FILES[@]}"; do
  SRC="$KIT_ROOT/templates/$tmpl"
  if [[ ! -f "$SRC" ]]; then
    echo "    Skipping $tmpl (template not present in kit)"
    continue
  fi

  case "$tmpl" in
    BACKLOG.dummy.md)
      DEST="BACKLOG.md"
      ;;
    *)
      DEST="$tmpl"
      ;;
  esac

  # Substitute placeholders
  sed -e "s|{{ORG}}|$DEST_ORG|g" \
      -e "s|{{REPO}}|$DEST_REPO|g" \
      -e "s|{{HOST}}|$HOST|g" \
    "$SRC" > "$DEST"
  echo "    -> $DEST"
done

# -- Step 3: copy workflows --------------------------------------------------

echo "==> Step 3: copy workflows into .github/workflows/"
mkdir -p .github/workflows

for wf in "$KIT_ROOT/workflows/"*.yml; do
  [[ -f "$wf" ]] || continue
  BASENAME="$(basename "$wf")"
  # Skip the .template variant; document opt-in in README only
  if [[ "$BASENAME" == "live.yml.template" ]]; then
    continue
  fi
  sed -e "s|{{ORG}}|$DEST_ORG|g" \
      -e "s|{{REPO}}|$DEST_REPO|g" \
      -e "s|{{HOST}}|$HOST|g" \
    "$wf" > ".github/workflows/$BASENAME"
  echo "    -> .github/workflows/$BASENAME"
done

# Stage the live.yml template alongside as a reference for adopters
if [[ -f "$KIT_ROOT/workflows/live.yml.template" ]]; then
  mkdir -p .github/workflows-optional
  cp "$KIT_ROOT/workflows/live.yml.template" .github/workflows-optional/live.yml
  echo "    -> .github/workflows-optional/live.yml (NOT enabled by default)"
fi

# -- Step 4: copy bundled dummy spec dirs ------------------------------------

if [[ -d "$KIT_ROOT/templates/specs-dummy" ]]; then
  echo "==> Step 4: copy bundled dummy spec dirs"
  mkdir -p specs
  cp -r "$KIT_ROOT/templates/specs-dummy/"* specs/
  echo "    -> specs/ populated from templates/specs-dummy/"
fi

# -- Step 5: commit + push ---------------------------------------------------

# -- Step 4.5: smoke build (full) -------------------------------------------
#
# Now that the standalone tsconfig / eslintrc / etc. templates are in place,
# the extracted tree can build standalone. This is the gate the spec's
# R-010 calls for ("smoke `pnpm install && pnpm test && pnpm build` before
# pushing"). Failure here aborts the bootstrap rather than producing a
# broken first commit.

if [[ $DRY_RUN -eq 0 ]]; then
  echo "==> Step 4.5: smoke (pnpm install && pnpm test && pnpm build)"
  SMOKE_FAILED=0
  if ! pnpm install --frozen-lockfile --silent; then
    echo "    SMOKE FAIL: pnpm install" >&2; SMOKE_FAILED=1
  fi
  if [[ $SMOKE_FAILED -eq 0 ]] && ! pnpm test --silent; then
    echo "    SMOKE FAIL: pnpm test" >&2; SMOKE_FAILED=1
  fi
  if [[ $SMOKE_FAILED -eq 0 ]] && ! pnpm build; then
    echo "    SMOKE FAIL: pnpm build" >&2; SMOKE_FAILED=1
  fi
  if [[ $SMOKE_FAILED -eq 1 ]]; then
    echo "==> Aborting bootstrap. Working tree at $EXTRACT_PATH left for inspection." >&2
    exit 75
  fi
  echo "    OK — smoke green"
fi

git add -A

if [[ $DRY_RUN -eq 1 ]]; then
  echo
  echo "==> Dry-run substitution complete. Staged files (not committed):"
  git diff --cached --stat | head -40
  echo
  echo "==> Placeholder leakage check:"
  if git diff --cached | grep -E '\{\{(ORG|REPO|HOST)\}\}'; then
    echo "    FAIL — unsubstituted placeholders remain (see lines above)"
    exit 75
  else
    echo "    OK — no remaining {{ORG}}/{{REPO}}/{{HOST}} markers"
  fi
  echo
  echo "==> Dry run complete. Working tree: $EXTRACT_PATH"
  exit 0
fi

git -c user.email=bootstrap@kit.local -c user.name="bootstrap-new-repo.sh" \
    -c commit.gpgsign=false -c gpg.format=openpgp \
  commit --quiet --no-gpg-sign \
  -m "chore: bootstrap standalone repo from extraction kit (spec 249)"

echo "==> Step 5: push to git@github.com:$DESTINATION.git"
PUSH_OUTPUT="$(git push "git@github.com:$DESTINATION.git" extracted:main 2>&1 || true)"

if echo "$PUSH_OUTPUT" | grep -qE '403|permission denied'; then
  cat <<EOF >&2

ERROR: push returned 403.

This almost always means the agent's GitHub App is not authorised on
the destination repo. Resolve via the GitHub web UI:

  https://github.com/organizations/$DEST_ORG/settings/installations
    → Configure (the Claude code or other agent app)
    → Repository access
    → Add the destination repo: $DEST_REPO

After authorising, re-run this script.
EOF
  exit 75
fi

if [[ -n "$PUSH_OUTPUT" ]]; then
  echo "$PUSH_OUTPUT"
fi

echo
echo "==> bootstrap-new-repo.sh complete"
echo "    Pushed to:     git@github.com:$DESTINATION.git (main)"
echo "    Next steps:"
echo "      1. Settings → Pages → Source: 'Deploy from a branch' → gh-pages → /"
echo "         (wait for the first deploy to create the branch first)"
echo "      2. Open a small test PR and watch pr-preview.yml deploy a preview."
echo "      3. Hold for ≥7 days of green CI before starting Phase 3 (cutover)."
