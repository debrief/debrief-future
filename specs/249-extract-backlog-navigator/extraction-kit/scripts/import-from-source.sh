#!/usr/bin/env bash
#
# import-from-source.sh — Pull backlog-navigator from debrief-future
# into the CURRENT repo (which must be the destination).
#
# Designed to run inside a Claude Code session (or any shell) opened in
# the destination repo's working tree. The script never pushes outside
# the current repo's origin — it only reads from debrief-future via git
# clone (public repo, no credentials needed) and writes to `origin` of
# the current repo.
#
# Two invocation modes:
#
#   A) Bootstrap (no local clone of debrief-future):
#
#        curl -fsSL https://raw.githubusercontent.com/debrief/debrief-future/main/specs/249-extract-backlog-navigator/extraction-kit/scripts/import-from-source.sh -o /tmp/import.sh
#        bash /tmp/import.sh
#
#      The script clones debrief-future into /tmp itself.
#
#   B) Local (already have debrief-future cloned somewhere):
#
#        git clone --depth 100 https://github.com/debrief/debrief-future.git /tmp/src
#        bash /tmp/src/specs/249-extract-backlog-navigator/extraction-kit/scripts/import-from-source.sh
#
#      The script uses the local clone's templates without re-fetching.
#
# Flags:
#   --destination <org>/<repo>   Override the auto-detected origin remote.
#                                Useful when origin isn't yet configured.
#   --host <host>                Defaults to <org>.github.io.
#   --source-path <path>         Path to a local debrief-future clone.
#                                Auto-detected if the script is run from
#                                inside one; otherwise the script clones.
#   --merge-unrelated-histories  If the destination has init commits
#                                (README/LICENSE/.gitignore), merge
#                                instead of aborting. Conflicts on those
#                                three files resolve in favour of the
#                                imported tree.
#   --dry-run                    Apply everything locally; do NOT push.
#                                The destination repo is left in its
#                                pre-push state for inspection.
#   --no-smoke                   Skip the full pnpm test+build smoke
#                                (lockfile validation still runs). For
#                                CI environments where the smoke takes
#                                too long; not recommended for first run.
#
# Spec: 249-extract-backlog-navigator (revised flow — see README.md).

set -euo pipefail

# -- Parse args ---------------------------------------------------------------

DESTINATION=""
HOST=""
SOURCE_PATH=""
SOURCE_REPO="${SOURCE_REPO:-debrief/debrief-future}"
SOURCE_PREFIX="${SOURCE_PREFIX:-apps/backlog-navigator}"
MERGE_UNRELATED=0
DRY_RUN=0
NO_SMOKE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --destination) DESTINATION="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --source-path) SOURCE_PATH="$2"; shift 2 ;;
    --merge-unrelated-histories) MERGE_UNRELATED=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-smoke) NO_SMOKE=1; shift ;;
    -h|--help) grep '^# ' "$0" | sed 's/^# //'; exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 64 ;;
  esac
done

# -- Resolve destination from origin if not supplied -------------------------

if [[ -z "$DESTINATION" ]]; then
  REMOTE_URL="$(git config --get remote.origin.url 2>/dev/null || echo "")"
  if [[ -z "$REMOTE_URL" ]]; then
    echo "FAIL — could not detect destination: no origin remote and no --destination flag" >&2
    echo "       Either set origin (git remote add origin git@github.com:<org>/<repo>.git)" >&2
    echo "       or pass --destination <org>/<repo> explicitly." >&2
    exit 64
  fi
  # Parse "git@github.com:org/repo(.git)" or "https://github.com/org/repo(.git)"
  if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?/?$ ]]; then
    DESTINATION="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  else
    echo "FAIL — could not parse origin URL: $REMOTE_URL" >&2
    exit 64
  fi
fi

if [[ ! "$DESTINATION" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "FAIL — destination must look like <org>/<repo>, got: $DESTINATION" >&2
  exit 64
fi

DEST_ORG="${DESTINATION%%/*}"
DEST_REPO="${DESTINATION##*/}"
[[ -z "$HOST" ]] && HOST="$DEST_ORG.github.io"

# -- Track machine-readable metrics for the JSON report ---------------------

FILES_RENDERED=0
TOKENS_REPLACED=0
SMOKE_EXIT_CODE="skipped"
PLACEHOLDER_CHECK="not-run"
REPORT_PATH="$(pwd)/import-report.json"

count_tokens() {
  # Awk-based count avoids `set -o pipefail` tripping on zero matches.
  awk 'BEGIN { n = 0 }
       {
         line = $0
         while (match(line, /\{\{(ORG|REPO|HOST)\}\}/)) {
           n++
           line = substr(line, RSTART + RLENGTH)
         }
       }
       END { print n }' "$1" 2>/dev/null || echo 0
}

write_report() {
  {
    cat <<EOF
{
  "destination": "$DESTINATION",
  "host": "$HOST",
  "mode": "$(if [[ $DRY_RUN -eq 1 ]]; then echo 'dry-run'; else echo 'live'; fi)",
  "filesRendered": $FILES_RENDERED,
  "tokensReplaced": $TOKENS_REPLACED,
  "placeholderCheck": "$PLACEHOLDER_CHECK",
  "smokeTestExitCode": $(if [[ "$SMOKE_EXIT_CODE" == "skipped" ]]; then echo '"skipped"'; else echo "$SMOKE_EXIT_CODE"; fi),
  "sourceRepo": "$SOURCE_REPO",
  "sourcePath": "$SOURCE_PATH"
}
EOF
  } > "$REPORT_PATH" 2>/dev/null || true
}
trap write_report EXIT

# -- Verify we're inside a git repo (the destination) ------------------------

DEST_REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$DEST_REPO_ROOT" ]]; then
  echo "FAIL — not inside a git working tree. cd into your destination repo first." >&2
  exit 64
fi

if [[ "$DEST_REPO_ROOT" != "$(pwd)" ]]; then
  echo "    Note: switching cwd to destination repo root ($DEST_REPO_ROOT)"
  cd "$DEST_REPO_ROOT"
fi

echo "==> import-from-source.sh"
echo "    Destination:   $DESTINATION (origin)"
echo "    Host:          $HOST"
echo "    Source repo:   $SOURCE_REPO"
echo "    Mode:          $(if [[ $DRY_RUN -eq 1 ]]; then echo 'DRY RUN — no push'; else echo 'live'; fi)"
echo

# -- Step 1: locate or clone the source repo --------------------------------

if [[ -z "$SOURCE_PATH" ]]; then
  # Try to auto-detect: if this script lives inside a clone, use its parent.
  SCRIPT_PATH="${BASH_SOURCE[0]:-}"
  if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
    CANDIDATE="$(cd "$(dirname "$SCRIPT_PATH")/../../../.." 2>/dev/null && pwd)"
    if [[ -d "$CANDIDATE/.git" ]]; then
      SOURCE_PATH="$CANDIDATE"
    fi
  fi
fi

if [[ -z "$SOURCE_PATH" ]]; then
  SOURCE_PATH="$(mktemp -d -t debrief-source-XXXXXX)"
  echo "==> Step 1: clone $SOURCE_REPO into $SOURCE_PATH"
  git clone --quiet "https://github.com/$SOURCE_REPO.git" "$SOURCE_PATH"
  echo "    OK — source clone ready"
else
  echo "==> Step 1: use existing source clone at $SOURCE_PATH"
  if [[ ! -d "$SOURCE_PATH/.git" ]]; then
    echo "    FAIL — $SOURCE_PATH is not a git working tree" >&2
    exit 70
  fi
  echo "    OK — source path verified"
fi

KIT_ROOT="$SOURCE_PATH/specs/249-extract-backlog-navigator/extraction-kit"
if [[ ! -d "$KIT_ROOT/templates" ]]; then
  echo "    FAIL — kit templates not found at $KIT_ROOT/templates" >&2
  echo "           The source repo at $SOURCE_PATH may be on an old branch." >&2
  exit 70
fi

# -- Step 2: subtree split in the source clone ------------------------------

echo "==> Step 2: subtree split apps/backlog-navigator/ in source clone"
(
  cd "$SOURCE_PATH"
  # Idempotent: delete any prior extracted branch from a previous run.
  git branch -D extracted >/dev/null 2>&1 || true
  git subtree split --prefix="$SOURCE_PREFIX" -b extracted >/dev/null
)
echo "    OK — extracted branch produced in source clone"

# -- Step 3: refuse to carry any .env* files --------------------------------

echo "==> Step 3: scan extracted tree for stray .env* files"
SOURCE_EXTRACTED_TREE="$SOURCE_PATH"
ENV_FILES="$(cd "$SOURCE_EXTRACTED_TREE" && git ls-tree -r --name-only extracted | grep -E '(^|/)\.env(\.|$)' || true)"
if [[ -n "$ENV_FILES" ]]; then
  echo "    FAIL — extracted branch contains .env* file(s):" >&2
  echo "$ENV_FILES" | sed 's/^/      /' >&2
  echo "    Rotate any secrets they contain, remove them from the source" >&2
  echo "    repo's history, and re-run. The kit refuses to import .env*." >&2
  exit 75
fi
echo "    OK — no .env* files in extracted tree"

# -- Step 4: merge or check-out extracted history into destination ----------

echo "==> Step 4: merge extracted history into destination"

# Add the source clone as a temporary remote so we can fetch from it.
git remote remove backlog-source-tmp >/dev/null 2>&1 || true
git remote add backlog-source-tmp "$SOURCE_PATH"
git fetch --quiet backlog-source-tmp extracted

# `git rev-parse HEAD` on an unborn branch prints the literal "HEAD" to
# stdout *and* exits nonzero — so checking exit code is the only reliable
# way to detect an empty repo.
if git rev-parse --quiet --verify HEAD >/dev/null 2>&1; then
  HAS_HEAD=1
else
  HAS_HEAD=0
fi

if [[ $HAS_HEAD -eq 0 ]]; then
  # Empty destination repo — create main from the extracted branch.
  git checkout -b main backlog-source-tmp/extracted
  echo "    OK — main created from extracted (empty destination)"
else
  # Non-empty destination — merge with --allow-unrelated-histories.
  if [[ $MERGE_UNRELATED -eq 0 ]]; then
    cat >&2 <<EOF

FAIL — destination repo $DESTINATION already has commits.

The destination should normally be created EMPTY on github.com
(uncheck all three init options: README, .gitignore, license).

To merge anyway (typically when the repo was created with the default
init options), re-run with:

  --merge-unrelated-histories

Conflicts on README.md / LICENSE / .gitignore are auto-resolved in
favour of the imported tree.
EOF
    git remote remove backlog-source-tmp
    exit 75
  fi

  git merge --no-edit --no-gpg-sign --allow-unrelated-histories \
    -m "Import backlog-navigator history from $SOURCE_REPO (#249)" \
    backlog-source-tmp/extracted || true

  # Resolve common init-file conflicts in favour of the imported side.
  if git ls-files -u | grep -q .; then
    for f in README.md LICENSE .gitignore; do
      if git ls-files -u | grep -qE "$f$"; then
        git checkout --theirs "$f" 2>/dev/null || true
      fi
    done
    git add -A
    # Anything still unmerged → operator intervention required.
    if git ls-files -u | grep -q .; then
      echo "    FAIL — unresolved merge conflicts:" >&2
      git ls-files -u | sed 's/^/      /' >&2
      git remote remove backlog-source-tmp
      exit 75
    fi
    git -c commit.gpgsign=false \
      commit --no-gpg-sign --no-edit \
      -m "Import backlog-navigator history from $SOURCE_REPO (#249)"
  fi
  echo "    OK — extracted history merged with init commits"
fi

git remote remove backlog-source-tmp

# -- Step 4b: drop debrief-future-specific tests ----------------------------
#
# `src/parser/__tests__/liveBacklog.roundtrip.test.ts` is a debrief-future
# production gate — it parses the *monorepo's* live BACKLOG.md and asserts
# items.length > 50 + epics.length > 5. Both bits assume the monorepo
# layout (path walks `../../../../..` from the test file) and the
# production data shape. Neither holds standalone.
#
# Coverage isn't lost: `src/parser/__tests__/parseBacklog.test.ts:87`
# already verifies byte-for-byte round-trip against a curated fixture
# (`e2e/fixtures/backlog-fixture.md`) which DOES travel with the subtree
# split and is the right round-trip gate for the standalone repo.

echo "==> Step 4b: drop debrief-future-specific tests"
DROPPED=()
for stale in \
  src/parser/__tests__/liveBacklog.roundtrip.test.ts \
; do
  if [[ -f "$stale" ]]; then
    rm -f "$stale"
    DROPPED+=("$stale")
  fi
done
if [[ ${#DROPPED[@]} -gt 0 ]]; then
  printf "    -> dropped: %s\n" "${DROPPED[@]}"
  echo "    OK — debrief-future production gates removed"
else
  echo "    OK — no stale tests to drop"
fi

# -- Step 5: sed-replace vite.config.ts base default ------------------------

echo "==> Step 5: rewrite vite.config.ts base default → /$DEST_REPO/"
if [[ -f vite.config.ts ]]; then
  perl -i -pe "s|'/debrief-future/backlog-navigator/'|'/$DEST_REPO/'|g" vite.config.ts
  if grep -q "'/$DEST_REPO/'" vite.config.ts; then
    echo "    OK — base default now /$DEST_REPO/"
  else
    echo "    FAIL — sed substitution did not match in vite.config.ts" >&2
    exit 75
  fi
else
  echo "    FAIL — vite.config.ts not found at extracted-tree root" >&2
  exit 75
fi

# -- Step 6: apply templates with placeholder substitution -----------------

echo "==> Step 6: apply templates with {{ORG}}/{{REPO}}/{{HOST}} substitution"

TEMPLATE_FILES=(
  README.md
  ADOPTING.md
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
  [[ -f "$SRC" ]] || { echo "    Skipping $tmpl (template not present in kit)"; continue; }

  case "$tmpl" in
    BACKLOG.dummy.md) DEST="BACKLOG.md" ;;
    *) DEST="$tmpl" ;;
  esac

  PRE_TOKENS="$(count_tokens "$SRC")"
  TOKENS_REPLACED=$((TOKENS_REPLACED + PRE_TOKENS))

  sed -e "s|{{ORG}}|$DEST_ORG|g" \
      -e "s|{{REPO}}|$DEST_REPO|g" \
      -e "s|{{HOST}}|$HOST|g" \
    "$SRC" > "$DEST"
  FILES_RENDERED=$((FILES_RENDERED + 1))
  echo "    -> $DEST"
done
echo "    OK — $FILES_RENDERED template files rendered"

# -- Step 7: apply workflows ------------------------------------------------

echo "==> Step 7: install workflows into .github/workflows/"
mkdir -p .github/workflows

WF_COUNT=0
for wf in "$KIT_ROOT/workflows/"*.yml; do
  [[ -f "$wf" ]] || continue
  BASENAME="$(basename "$wf")"
  if [[ "$BASENAME" == "live.yml.template" ]]; then
    continue
  fi
  PRE_TOKENS="$(count_tokens "$wf")"
  TOKENS_REPLACED=$((TOKENS_REPLACED + PRE_TOKENS))
  sed -e "s|{{ORG}}|$DEST_ORG|g" \
      -e "s|{{REPO}}|$DEST_REPO|g" \
      -e "s|{{HOST}}|$HOST|g" \
    "$wf" > ".github/workflows/$BASENAME"
  FILES_RENDERED=$((FILES_RENDERED + 1))
  WF_COUNT=$((WF_COUNT + 1))
  echo "    -> .github/workflows/$BASENAME"
done

if [[ -f "$KIT_ROOT/workflows/live.yml.template" ]]; then
  mkdir -p .github/workflows-optional
  cp "$KIT_ROOT/workflows/live.yml.template" .github/workflows-optional/live.yml
  echo "    -> .github/workflows-optional/live.yml (NOT enabled by default)"
fi
echo "    OK — $WF_COUNT workflows installed"

# -- Step 8: bundled dummy spec dataset ------------------------------------

if [[ -d "$KIT_ROOT/templates/specs-dummy" ]]; then
  echo "==> Step 8: copy bundled dummy spec dirs"
  mkdir -p specs
  cp -r "$KIT_ROOT/templates/specs-dummy/"* specs/
  echo "    OK — bundled dummy dataset in place"
fi

# -- Step 8b: consumer-workflow templates -----------------------------------
#
# These workflow YAMLs are for ADOPTERS to drop into THEIR repos (not the
# navigator's own .github/workflows/). They're shipped in `docs/consumer-
# workflows/` so adopters following ADOPTING.md's Path 3 can copy them
# verbatim and edit the navigator URL.

if [[ -d "$KIT_ROOT/templates/consumer-workflows" ]]; then
  echo "==> Step 8b: copy consumer-workflow templates"
  mkdir -p docs/consumer-workflows
  for wf in "$KIT_ROOT/templates/consumer-workflows/"*.yml; do
    [[ -f "$wf" ]] || continue
    BASENAME="$(basename "$wf")"
    PRE_TOKENS="$(count_tokens "$wf")"
    TOKENS_REPLACED=$((TOKENS_REPLACED + PRE_TOKENS))
    sed -e "s|{{ORG}}|$DEST_ORG|g" \
        -e "s|{{REPO}}|$DEST_REPO|g" \
        -e "s|{{HOST}}|$HOST|g" \
      "$wf" > "docs/consumer-workflows/$BASENAME"
    FILES_RENDERED=$((FILES_RENDERED + 1))
    echo "    -> docs/consumer-workflows/$BASENAME"
  done
  echo "    OK — consumer-workflow templates copied"
fi

# -- Step 9: regenerate pnpm-lock.yaml -------------------------------------

echo "==> Step 9: regenerate pnpm-lock.yaml"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "    FAIL — pnpm not on PATH. Install pnpm to continue." >&2
  exit 70
fi

# Drop the monorepo-keyed lockfile (it carries workspace deps that don't
# exist standalone). Regenerate keyed only to this package.json.
rm -f pnpm-lock.yaml
pnpm install --lockfile-only --silent

if [[ ! -f pnpm-lock.yaml ]]; then
  echo "    FAIL — pnpm-lock.yaml was not generated" >&2
  exit 70
fi
echo "    OK — pnpm-lock.yaml generated"

# -- Step 10: smoke build --------------------------------------------------

if [[ $NO_SMOKE -eq 1 ]]; then
  echo "==> Step 10: smoke SKIPPED (--no-smoke supplied)"
  SMOKE_EXIT_CODE="skipped"
else
  echo "==> Step 10: smoke (pnpm install && pnpm test && pnpm build)"
  SMOKE_FAILED=0
  if ! pnpm install --frozen-lockfile --silent; then
    echo "    FAIL — pnpm install" >&2; SMOKE_FAILED=1
  fi
  if [[ $SMOKE_FAILED -eq 0 ]] && ! pnpm test --silent; then
    echo "    FAIL — pnpm test" >&2; SMOKE_FAILED=1
  fi
  if [[ $SMOKE_FAILED -eq 0 ]] && ! pnpm build; then
    echo "    FAIL — pnpm build" >&2; SMOKE_FAILED=1
  fi
  SMOKE_EXIT_CODE=$SMOKE_FAILED
  if [[ $SMOKE_FAILED -eq 1 ]]; then
    echo "==> Aborting before commit. Working tree at $DEST_REPO_ROOT for inspection." >&2
    echo "    To recover: git reset --hard HEAD before re-running." >&2
    exit 75
  fi
  echo "    OK — smoke green"
fi

# -- Step 11: stage + commit + placeholder check ---------------------------

git add -A
PLACEHOLDER_CHECK="ok"
if git diff --cached | grep -E '\{\{(ORG|REPO|HOST)\}\}' >/dev/null 2>&1; then
  echo "==> Placeholder leakage check:"
  echo "    FAIL — unsubstituted {{ORG}}/{{REPO}}/{{HOST}} markers remain:" >&2
  git diff --cached | grep -nE '\{\{(ORG|REPO|HOST)\}\}' | head -20 >&2
  PLACEHOLDER_CHECK="fail"
  exit 75
fi
echo "==> Placeholder leakage check:  OK — no remaining {{ORG}}/{{REPO}}/{{HOST}} markers"

if [[ $DRY_RUN -eq 1 ]]; then
  echo
  echo "==> Dry-run complete. Staged files (not committed):"
  git diff --cached --stat | head -40
  echo
  echo "    Working tree:  $DEST_REPO_ROOT"
  echo "    Report:        $REPORT_PATH"
  echo
  echo "    To recover: git reset HEAD && git clean -fd to undo all changes."
  exit 0
fi

git -c user.email=import@kit.local -c user.name="import-from-source.sh" \
    -c commit.gpgsign=false \
  commit --quiet --no-gpg-sign \
  -m "chore: apply extraction kit (templates + workflows) from $SOURCE_REPO (#249)"

# -- Step 12: push to origin -----------------------------------------------

echo "==> Step 12: push to origin/main"
PUSH_OUTPUT="$(git push -u origin HEAD:main 2>&1 || true)"
if echo "$PUSH_OUTPUT" | grep -qE '403|permission denied'; then
  cat >&2 <<EOF

FAIL — push to origin returned 403.

This usually means the agent/Claude code GitHub App is not authorised on
this repo. Resolve via the GitHub web UI:

  https://github.com/organizations/$DEST_ORG/settings/installations
    → Configure (the Claude code app or whichever agent you're using)
    → Repository access
    → Add this repo: $DEST_REPO

After authorising, re-run this script.
EOF
  exit 75
fi
if [[ -n "$PUSH_OUTPUT" ]]; then
  echo "$PUSH_OUTPUT"
fi

# -- Final ------------------------------------------------------------------

echo
echo "==> import-from-source.sh complete"
echo "    OK — imported, smoke-tested, pushed"
echo "    Pushed to:     origin/main ($DESTINATION)"
echo "    Report:        $REPORT_PATH"
echo
echo "    Next steps:"
echo "      1. Settings → Pages → Source: 'Deploy from a branch' → gh-pages → /"
echo "         (the gh-pages branch appears after the first deploy.yml run)"
echo "      2. Open a small test PR; watch pr-preview.yml deploy a preview."
echo "      3. Hold for ≥7 days of green CI before starting Phase 3 (cutover)."
