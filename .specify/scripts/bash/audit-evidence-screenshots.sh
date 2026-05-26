#!/usr/bin/env bash
# Audit the active feature's evidence/screenshots/ directory against the
# screenshot artefacts the feature has committed itself to producing.
#
# Inputs (resolved in order):
#   1. $SPECIFY_FEATURE env var (process-scoped override)
#   2. .specify/.active-feature file (worktree-scoped, gitignored)
#   3. Current git branch (must contain an NNN- token)
#
# What it checks:
#   - Any `evidence/screenshots/*.{png,gif,jpg,jpeg,webp}` path mentioned in
#     `tasks.md` (case-insensitive). These are the artefacts the spec
#     itself listed as "Planned Artifacts" / "Evidence Requirements".
#   - Any markdown image reference `![...](screenshots/...)` inside
#     `evidence/opening-context.md`. The Content Specialist's cached opener
#     is a *commitment* — if it points at a file, that file must exist
#     before the PR opens.
#
# Exit codes:
#   0 — no active feature, no screenshots referenced, OR every referenced
#       screenshot is present on disk.
#   2 — active feature has screenshot references but one or more files
#       are missing. Prints a list of expected vs missing to stderr.
#
# Design notes:
#   - Exit 0 when no active feature is resolvable, so this script is safe
#     to call from a global PreToolUse hook on PR-creation tools (an
#     ad-hoc PR with no /speckit.pr in flight should not fire the audit).
#   - Globs are evaluated against the on-disk filesystem (not against
#     scope sets) so a pattern like `screenshots/storyboard-range-*.png`
#     in tasks.md collapses to "at least one matching file must exist".
#   - Plain bash + grep + awk only — no jq, no node — so the script
#     works in the freshly-provisioned cloud envs that block npm/PyPI.

set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "${SCRIPT_DIR}/common.sh"

REPO_ROOT="$(get_repo_root)"

# Resolve active feature without erroring if absent — this script is a
# hook, not a workflow gate; absence of a feature is a normal case.
ACTIVE_FEATURE=""
if [[ -n "${SPECIFY_FEATURE:-}" ]]; then
    ACTIVE_FEATURE="$SPECIFY_FEATURE"
elif [[ -f "${REPO_ROOT}/.specify/.active-feature" ]]; then
    ACTIVE_FEATURE="$(head -n 1 "${REPO_ROOT}/.specify/.active-feature" | tr -d '[:space:]')"
else
    # Try the current branch — accept NNN- anywhere in the name.
    BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
    if [[ -n "$BRANCH" ]]; then
        TOKEN="$(echo "$BRANCH" | grep -oE '[0-9]{3}-[a-z0-9-]+' | head -n 1 || true)"
        if [[ -n "$TOKEN" ]]; then
            # Find the spec dir matching this token.
            CANDIDATE="$(find "${REPO_ROOT}/specs" -maxdepth 1 -type d -name "${TOKEN}*" 2>/dev/null | head -n 1 || true)"
            if [[ -n "$CANDIDATE" ]]; then
                ACTIVE_FEATURE="$(basename "$CANDIDATE")"
            fi
        fi
    fi
fi

if [[ -z "$ACTIVE_FEATURE" ]]; then
    # No feature → nothing to audit. Hook-safe exit.
    exit 0
fi

FEATURE_DIR="${REPO_ROOT}/specs/${ACTIVE_FEATURE}"
if [[ ! -d "$FEATURE_DIR" ]]; then
    # Spec dir doesn't exist — also a hook-safe exit (active-feature is
    # stale; not this script's problem to fix).
    exit 0
fi

TASKS_FILE="${FEATURE_DIR}/tasks.md"
OPENER_FILE="${FEATURE_DIR}/evidence/opening-context.md"
SHOTS_DIR="${FEATURE_DIR}/evidence/screenshots"

# Collect referenced screenshot paths (relative to the evidence/ dir).
REFERENCED=()

# 1. Scan tasks.md for `evidence/screenshots/...` paths.
if [[ -f "$TASKS_FILE" ]]; then
    # Pull out anything that looks like a screenshots path. Tolerant of
    # backtick / parenthesis wrapping. Accept png / gif / jpg / webp.
    while IFS= read -r path; do
        # Normalise to "screenshots/foo.png".
        rel="${path#*evidence/screenshots/}"
        REFERENCED+=("screenshots/${rel}")
    done < <(grep -oE 'evidence/screenshots/[A-Za-z0-9._-]+\.(png|gif|jpg|jpeg|webp)' "$TASKS_FILE" | sort -u || true)
fi

# 2. Scan evidence/opening-context.md for markdown image references.
if [[ -f "$OPENER_FILE" ]]; then
    while IFS= read -r path; do
        # path looks like "screenshots/foo.png"
        REFERENCED+=("${path}")
    done < <(grep -oE '!\[[^]]*\]\(screenshots/[A-Za-z0-9._-]+\.(png|gif|jpg|jpeg|webp)\)' "$OPENER_FILE" \
              | sed -E 's/^!\[[^]]*\]\((screenshots\/[^)]+)\)$/\1/' | sort -u || true)
fi

if [[ ${#REFERENCED[@]} -eq 0 ]]; then
    # No commitments → nothing to audit.
    exit 0
fi

# De-duplicate.
mapfile -t REFERENCED < <(printf '%s\n' "${REFERENCED[@]}" | sort -u)

MISSING=()
for ref in "${REFERENCED[@]}"; do
    file="${FEATURE_DIR}/evidence/${ref}"
    if [[ ! -f "$file" ]]; then
        MISSING+=("$ref")
    fi
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
    exit 0
fi

# Print a structured, actionable failure to stderr and exit non-zero so
# a PreToolUse hook blocks the PR.
{
    echo "─────────────────────────────────────────────────────────────"
    echo "  EVIDENCE SCREENSHOT AUDIT FAILED for ${ACTIVE_FEATURE}"
    echo "─────────────────────────────────────────────────────────────"
    echo ""
    echo "  The feature spec / cached opener references screenshots that"
    echo "  do not exist on disk. Shipping the PR / blog post in this"
    echo "  state lands a post with broken image links."
    echo ""
    echo "  Missing files (relative to specs/${ACTIVE_FEATURE}/evidence/):"
    for m in "${MISSING[@]}"; do
        echo "    - ${m}"
    done
    echo ""
    echo "  Producers:"
    echo "    - Storybook variants:"
    echo "        cd shared/components && node run-playwright.mjs <spec-basename>"
    echo "    - Web-shell workflow + interaction GIF:"
    echo "        cd apps/web-shell && node run-playwright.mjs <spec-basename>"
    echo "    - Spec Navigator:"
    echo "        cd apps/spec-navigator && node run-playwright.mjs"
    echo ""
    echo "  These wrappers extract \`@sparticuz/chromium\` and run Playwright"
    echo "  reliably in Claude Code cloud sessions. Do NOT defer."
    echo ""
    echo "  Override (use with care — produces a post with missing images):"
    echo "    SPECIFY_SKIP_SCREENSHOT_AUDIT=1"
    echo ""
    echo "  Background:"
    echo "    docs/project_notes/bugs.md → \"feature posts shipped without"
    echo "    screenshots, citing UI scope deferral\""
    echo "─────────────────────────────────────────────────────────────"
} >&2

# Honour an explicit override so a maintainer can ship a no-images post
# when the post genuinely doesn't need them.
if [[ "${SPECIFY_SKIP_SCREENSHOT_AUDIT:-}" == "1" ]]; then
    echo "[audit] SPECIFY_SKIP_SCREENSHOT_AUDIT=1 set — proceeding despite missing screenshots." >&2
    exit 0
fi

exit 2
