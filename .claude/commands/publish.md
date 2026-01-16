---
description: Publish content to debrief.github.io via cross-repo PR. Handles blog posts, updates, announcements, and other content types.
---

# Website Publisher

You coordinate publishing content from this repository (debrief-future) to the Debrief website (debrief.github.io) via pull requests.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Capabilities

This skill handles cross-repository content publishing:

| Task | Description |
|------|-------------|
| Publish existing post | Push a completed post from `specs/*/media/` to the website |
| Create and publish | Write new content and create a PR in one workflow |
| Standalone content | Publish content not tied to a spec (announcements, updates) |
| Site updates | Modify website structure, templates, or configuration |
| Bulk publish | Publish multiple posts in a single PR |

## Workflow Selection

Based on user input, determine which workflow to execute:

### 1. Publish Existing Content

**Trigger:** User specifies a file path or mentions existing content

```
/publish specs/002-debrief-io/media/shipped-post.md
/publish the shipped post for debrief-calc
```

**Steps:**
1. Locate the source content
2. Validate front matter
3. Execute cross-repo publishing workflow

### 2. Create New Content

**Trigger:** User describes content to create

```
/publish write a blog post about our progress this week
/publish announcement: we've completed the tracer bullet
```

**Steps:**
1. Gather context (user input, recent specs, git history)
2. Delegate to Content Specialist for writing
3. Review and refine
4. Execute cross-repo publishing workflow

### 3. Site Update

**Trigger:** User mentions templates, layouts, or site structure

```
/publish add a new category for technical deep-dives
/publish update the Future Debrief landing page
```

**Steps:**
1. Delegate to Jekyll Specialist
2. Execute changes in website repo directly
3. Create PR with changes

## Cross-Repo Publishing Workflow

This is the core workflow for all content publishing:

### Prerequisites Check

```bash
# Check gh CLI availability
if ! command -v gh &> /dev/null; then
    echo "ERROR: gh CLI not installed"
    echo "Install with: brew install gh (macOS) or apt install gh (Linux)"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "ERROR: Not authenticated to GitHub"
    echo "Run: gh auth login"
    exit 1
fi

# Check repo access
if ! gh repo view debrief/debrief.github.io &> /dev/null; then
    echo "ERROR: Cannot access debrief/debrief.github.io"
    echo "Ensure your GitHub token has write access to this repo"
    exit 1
fi
```

### Execution Steps

1. **Create temporary workspace**
   ```bash
   WORK_DIR=$(mktemp -d)
   trap "rm -rf $WORK_DIR" EXIT
   ```

2. **Clone website repository**
   ```bash
   gh repo clone debrief/debrief.github.io "$WORK_DIR/website" -- --depth 1 --quiet
   cd "$WORK_DIR/website"
   ```

3. **Generate branch name**
   ```bash
   POST_DATE=$(date +%Y-%m-%d)
   SLUG=$(echo "$CONTENT_TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | cut -c1-50)
   BRANCH="future-debrief/${POST_DATE}-${SLUG}"
   ```

4. **Create branch**
   ```bash
   git checkout -b "$BRANCH"
   ```

5. **Apply content** (varies by content type - see Content Types section)

6. **Commit changes**
   ```bash
   git add .
   git commit -m "Add Future Debrief: $CONTENT_TITLE"
   ```

7. **Push branch**
   ```bash
   git push -u origin "$BRANCH"
   ```

8. **Create PR**
   ```bash
   gh pr create \
       --repo debrief/debrief.github.io \
       --title "Future Debrief: $CONTENT_TITLE" \
       --body "$(cat <<'EOF'
   ## Content Update

   **Type:** $CONTENT_TYPE
   **Title:** $CONTENT_TITLE
   **Date:** $POST_DATE

   ## Preview

   Once merged, visible at: https://debrief.github.io/future/

   ## Source

   Auto-generated from [debrief-future](https://github.com/debrief/debrief-future)

   ## Checklist

   - [ ] Content renders correctly
   - [ ] Links work
   - [ ] Images display (if any)
   - [ ] Front matter is valid
   EOF
   )" \
       --base master
   ```

9. **Report result**
   ```
   ✅ PR created: {PR_URL}

   Next steps:
   1. Review the PR
   2. Merge when ready
   3. Content will be live at: https://debrief.github.io/future/
   ```

## Content Types

### Blog Post (Jekyll _posts/)

**Target:** `_posts/YYYY-MM-DD-slug.md`

**Front matter transformation:**
```yaml
# Input (from debrief-future)
---
layout: post
title: "My Title"
category: shipped
author: ian
tags: [tag1, tag2]
---

# Output (for debrief.github.io)
---
layout: future-post
title: "My Title"
date: YYYY-MM-DD
track: "Shipped · component-name"
author: Ian
reading_time: 4
tags: [tag1, tag2]
excerpt: "First paragraph, max 150 chars..."
---
```

**Image handling:**
- Copy from `media/images/` to `assets/images/future-debrief/{slug}/`
- Update paths: `./images/foo.png` → `/assets/images/future-debrief/{slug}/foo.png`

### Standalone Page

**Target:** `future/{path}/index.html` or `future/{path}.md`

No transformation needed - copy directly with layout: `future-default`

### Site Configuration

**Target:** Various (`_config.yml`, `_layouts/`, `_includes/`, etc.)

Direct modification with careful validation.

## Agent Delegation

### Content Creation

When creating new content, spawn the Content Specialist:

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    You are the Content Specialist for Future Debrief.

    [Include .claude/agents/media/content.md]

    Task: [specific content request]
    Context: [relevant background]
```

### Jekyll/Template Work

When modifying site structure, spawn the Jekyll Specialist:

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    You are the Jekyll Specialist for Future Debrief.

    [Include .claude/agents/media/jekyll.md]

    Task: [specific site modification]
```

## Error Handling

| Error | Action |
|-------|--------|
| `gh` not installed | Stop, provide installation instructions |
| Not authenticated | Stop, provide `gh auth login` instructions |
| No repo access | Stop, explain permission requirements |
| Branch exists | Append timestamp: `{branch}-{HHmmss}` |
| Push fails | Retry up to 3 times with backoff, then report |
| PR creation fails | Report error, provide manual instructions |

## Examples

### Example 1: Publish a shipped post

```
User: /publish specs/003-debrief-config/media/shipped-post.md

Actions:
1. Read specs/003-debrief-config/media/shipped-post.md
2. Validate front matter
3. Clone debrief.github.io to temp dir
4. Transform and copy to _posts/
5. Push and create PR
6. Report PR URL
```

### Example 2: Write and publish new content

```
User: /publish write a progress update on the tracer bullet - we've completed schemas and config

Actions:
1. Gather context from specs/ directory
2. Spawn Content Specialist to write post
3. Save draft for review
4. On approval, execute cross-repo workflow
5. Report PR URL
```

### Example 3: Bulk publish unpublished posts

```
User: /publish all unpublished shipped posts

Actions:
1. Scan specs/*/media/ for shipped-post.md files
2. Check which haven't been published (no matching _posts/ in website)
3. Clone website once
4. Add all posts in single commit
5. Create one PR with all content
```

### Example 4: Site structure change

```
User: /publish add a resources section to the Future Debrief pages

Actions:
1. Spawn Jekyll Specialist
2. Create future/resources/index.html
3. Update navigation includes
4. Create PR with changes
```

## Integration with Other Skills

### From /speckit.pr

The `/speckit.pr` skill calls this workflow automatically when creating feature PRs:

1. Feature PR is created in debrief-future
2. If `media/shipped-post.md` exists, invoke publish workflow
3. Both PRs reported to user

### From /media

The `/media` skill focuses on content creation. For publishing:

```
User: /media write a shipped post for debrief-calc
→ Creates content in specs/005-debrief-calc/media/

User: /publish specs/005-debrief-calc/media/shipped-post.md
→ Publishes to website
```

## Output Format

Always end with a clear summary:

```
┌─────────────────────────────────────────────────┐
│  Website Publishing Complete                     │
├─────────────────────────────────────────────────┤
│  PR: https://github.com/debrief/debrief.github.io/pull/XX
│  Branch: future-debrief/2026-01-16-feature-name │
│  Content: Blog post - "Shipped: Feature Name"   │
├─────────────────────────────────────────────────┤
│  Next Steps:                                    │
│  1. Review PR at link above                     │
│  2. Merge when approved                         │
│  3. Live at: debrief.github.io/future/blog/    │
└─────────────────────────────────────────────────┘
```

## Notes

- Always use `--base master` for debrief.github.io PRs (not `main`)
- Website repo uses Jekyll - posts go in `_posts/` with date-prefixed filenames
- Future Debrief content uses `future-post` layout, not generic `post`
- Images must be copied to `assets/images/future-debrief/` with updated paths
- This workflow can be run multiple times safely - duplicate branches get timestamp suffix