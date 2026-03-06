#!/usr/bin/env bash
set -euo pipefail

# Publish 3 shipped blog posts with screenshots to debrief.github.io
# Posts: 004-loader-mini-app, 005-e2e-workflow-tests, 094-point-rectangle-drawing
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth login)
#   - Write access to debrief/debrief.github.io
#
# Usage: bash .publish-staging/publish.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="future-debrief/2026-02-28-bulk-shipped-posts-with-screenshots"

echo "=== Checking prerequisites ==="

if ! command -v gh &> /dev/null; then
    echo "ERROR: gh CLI not installed. Install with: brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null 2>&1; then
    echo "ERROR: Not authenticated. Run: gh auth login"
    exit 1
fi

if ! gh repo view debrief/debrief.github.io &> /dev/null 2>&1; then
    echo "ERROR: Cannot access debrief/debrief.github.io"
    exit 1
fi

echo "=== Cloning debrief.github.io ==="
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

gh repo clone debrief/debrief.github.io "$WORK_DIR/website" -- --depth 1 --quiet
cd "$WORK_DIR/website"

echo "=== Creating branch ==="
git checkout -b "$BRANCH"

echo "=== Copying posts ==="
cp "$SCRIPT_DIR/_posts/2026-01-13-shipped-loader-mini-app.md" _posts/
cp "$SCRIPT_DIR/_posts/2026-02-07-shipped-e2e-tests-sandboxed.md" _posts/
cp "$SCRIPT_DIR/_posts/2026-02-13-shipped-point-rectangle-drawing.md" _posts/

echo "=== Copying images ==="
mkdir -p assets/images/future-debrief/shipped-loader-mini-app
mkdir -p assets/images/future-debrief/shipped-e2e-tests-sandboxed
mkdir -p assets/images/future-debrief/shipped-point-rectangle-drawing

cp "$SCRIPT_DIR/assets/images/future-debrief/shipped-loader-mini-app/"* \
    assets/images/future-debrief/shipped-loader-mini-app/

cp "$SCRIPT_DIR/assets/images/future-debrief/shipped-e2e-tests-sandboxed/"* \
    assets/images/future-debrief/shipped-e2e-tests-sandboxed/

cp "$SCRIPT_DIR/assets/images/future-debrief/shipped-point-rectangle-drawing/"* \
    assets/images/future-debrief/shipped-point-rectangle-drawing/

echo "=== Committing ==="
git add _posts/ assets/
git commit -m "Add 3 Future Debrief shipped posts with screenshots

Posts:
- Shipped: Loader Mini-App (4 screenshots)
- Shipped: VS Code E2E Tests in a Sandboxed Environment (4 screenshots)
- Shipped: Point and Rectangle Drawing (2 screenshots)"

echo "=== Pushing ==="
git push -u origin "$BRANCH"

echo "=== Creating PR ==="
PR_URL=$(gh pr create \
    --repo debrief/debrief.github.io \
    --title "Future Debrief: 3 shipped posts with screenshots" \
    --body "$(cat <<'EOF'
## Content Update

**Type:** Blog posts (bulk)
**Date:** 2026-02-28

### Posts included

| Post | Date | Images |
|------|------|--------|
| Shipped: Loader Mini-App | 2026-01-13 | 4 screenshots |
| Shipped: VS Code E2E Tests in a Sandboxed Environment | 2026-02-07 | 4 screenshots |
| Shipped: Point and Rectangle Drawing | 2026-02-13 | 2 screenshots |

## Preview

Once merged, visible at: https://debrief.github.io/future/

## Source

Auto-generated from [debrief-future](https://github.com/debrief/debrief-future)

## Checklist

- [ ] Content renders correctly
- [ ] Links work
- [ ] All 10 images display correctly
- [ ] Front matter is valid
EOF
)" \
    --base master)

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│  Website Publishing Complete                         │"
echo "├─────────────────────────────────────────────────────┤"
echo "│  PR: $PR_URL"
echo "│  Branch: $BRANCH"
echo "│  Content: 3 shipped blog posts with 10 screenshots  │"
echo "├─────────────────────────────────────────────────────┤"
echo "│  Next Steps:                                        │"
echo "│  1. Review PR at link above                         │"
echo "│  2. Merge when approved                             │"
echo "│  3. Live at: debrief.github.io/future/              │"
echo "└─────────────────────────────────────────────────────┘"
