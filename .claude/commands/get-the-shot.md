---
description: Find and upload the most recent screenshot from Desktop to a GitHub issue.
---

# Get The Shot

Upload the most recent screenshot from `~/Desktop` to a GitHub issue.

## Arguments

```text
$ARGUMENTS
```

Parse arguments for:
- **Issue number** (required): e.g., `30` or `#30`
- **Age limit** (optional): e.g., `5m` for 5 minutes (default: 2 minutes)

Examples:
- `/get-the-shot 30` — attach to issue #30
- `/get-the-shot #30 5m` — attach to #30, screenshot must be < 5 mins old

## Workflow

### Step 1: Find Recent Screenshot

```bash
find ~/Desktop -name "Screenshot*.png" -mmin -2 -type f -print | head -1
```

If no screenshot found within time limit, tell the user and stop.

### Step 2: Upload via Gist Git Clone

GitHub gists don't support binary uploads via CLI, but they're git repos.

**Prerequisite**: Run `gh auth setup-git` once to enable HTTPS auth for gists.

Workaround:

```bash
# Create a placeholder gist
GIST_URL=$(gh gist create --public -d "Screenshot for issue #N" - <<< "placeholder")
GIST_ID=$(basename "$GIST_URL")

# Clone it
TMPDIR=$(mktemp -d)
git clone "https://gist.github.com/${GIST_ID}.git" "$TMPDIR/gist" --quiet

# Copy screenshot (sanitize filename)
cp "/path/to/screenshot.png" "$TMPDIR/gist/screenshot.png"

# Commit and push
cd "$TMPDIR/gist"
git add screenshot.png
git rm placeholder 2>/dev/null || true
git commit -m "Add screenshot" --quiet
git push --quiet

# Get raw URL
GITHUB_USER=$(gh api user --jq '.login')
RAW_URL="https://gist.githubusercontent.com/${GITHUB_USER}/${GIST_ID}/raw/screenshot.png"

# Cleanup
rm -rf "$TMPDIR"
```

### Step 3: Add to Issue

```bash
gh issue comment N --body "![Screenshot](${RAW_URL})"
```

### Step 4: Confirm

Report:
> "Attached screenshot to issue #N: [link to comment]"

## Error Handling

| Situation | Response |
|-----------|----------|
| No screenshot found | "No screenshot found on Desktop in last N minutes." |
| No issue number provided | "Usage: /get-the-shot <issue-number> [age-limit]" |
| Issue doesn't exist | "Issue #N not found." |
| Git push fails | "Failed to push to gist. Check `gh auth status`." |

## Integration with Defector

When defector creates an issue and user mentions a screenshot:
1. Defector notes "screenshot provided" in issue
2. User runs `/get-the-shot <issue-number>`
3. Screenshot attached as comment

Keeps workflow async — defector doesn't block on screenshots.
