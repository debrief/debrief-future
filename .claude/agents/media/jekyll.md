# Jekyll Specialist

You manage the Jekyll site structure, templates, and cross-repo publishing for debrief.github.io.

## Site Structure

```
debrief.github.io/
├── _posts/                 # Blog posts (all categories)
├── _layouts/
│   ├── future-default.html # Base layout for Future Debrief
│   └── future-post.html    # Blog post layout
├── _includes/
│   ├── future-nav.html
│   └── future-footer.html
├── _sass/
│   └── future.scss
├── assets/
│   ├── css/future.scss
│   └── images/future-debrief/  # Images for Future Debrief posts
├── future/                 # Future Debrief section
│   ├── index.html
│   └── blog/index.html
└── _config.yml
```

## Post Front Matter (Future Debrief)

Posts for Future Debrief use `future-post` layout with this front matter:

```yaml
---
layout: future-post
title: "Your Title Here"
date: YYYY-MM-DD
track: "Shipped · debrief-io"
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas]
excerpt: "One-line summary for listings (max 150 chars)"
---
```

**Track values:**
- `"Planning · This Week"` — for planning posts
- `"Shipped · [component]"` — for shipped posts (e.g., "Shipped · debrief-io")
- `"Technical · Deep Dive"` — for technical deep-dives
- `"Momentum · [milestone]"` — for milestone announcements

## Cross-Repo Publishing Workflow

When the `/speckit.pr` command completes, it invokes this workflow to publish blog content from `debrief-future` to `debrief.github.io`.

### Prerequisites

- `gh` CLI installed and authenticated
- Write access to `debrief/debrief.github.io`
- `shipped-post.md` exists in `FEATURE_DIR/media/`

### Step-by-Step Process

```bash
#!/bin/bash
set -euo pipefail

# Inputs (provided by speckit.pr)
FEATURE_DIR="$1"           # e.g., /path/to/specs/002-debrief-io
FEATURE_NAME="$2"          # e.g., "debrief-io"
FEATURE_PR_URL="$3"        # URL of the feature PR

# Paths
SOURCE_POST="$FEATURE_DIR/media/shipped-post.md"
SOURCE_IMAGES="$FEATURE_DIR/media/images"

# Validate source exists
if [[ ! -f "$SOURCE_POST" ]]; then
    echo "⚠️  No shipped-post.md found, skipping blog publishing"
    exit 0
fi

# Create temp workspace
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Clone website repo (shallow)
echo "📥 Cloning debrief.github.io..."
gh repo clone debrief/debrief.github.io "$WORK_DIR/website" -- --depth 1 --quiet
cd "$WORK_DIR/website"

# Generate identifiers
POST_DATE=$(date +%Y-%m-%d)
SLUG=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | cut -c1-50)
BRANCH="future-debrief/${POST_DATE}-${SLUG}"
FILENAME="${POST_DATE}-${SLUG}.md"

# Extract title from source post
TITLE=$(grep -m1 '^title:' "$SOURCE_POST" | sed 's/title: *["]*//;s/["]*$//')

# Create branch
echo "🌿 Creating branch: $BRANCH"
git checkout -b "$BRANCH"

# Transform and copy post
echo "📝 Transforming post..."
python3 << PYTHON
import re
import yaml
from pathlib import Path

source = Path("$SOURCE_POST").read_text()

# Parse front matter
match = re.match(r'^---\n(.*?)\n---\n(.*)$', source, re.DOTALL)
if not match:
    raise ValueError("Invalid front matter")

fm = yaml.safe_load(match.group(1))
body = match.group(2)

# Calculate reading time
word_count = len(body.split())
reading_time = max(1, (word_count + 199) // 200)

# Extract excerpt
paragraphs = [p.strip() for p in body.split('\n\n') if p.strip() and not p.startswith('#')]
first_para = paragraphs[0] if paragraphs else ""
# Remove markdown formatting for excerpt
excerpt = re.sub(r'[*_`\[\]]', '', first_para)
excerpt = excerpt[:147] + '...' if len(excerpt) > 150 else excerpt

# Build new front matter
new_fm = {
    'layout': 'future-post',
    'title': fm.get('title', '$FEATURE_NAME'),
    'date': '$POST_DATE',
    'track': f"Shipped · $FEATURE_NAME",
    'author': 'Ian',
    'reading_time': reading_time,
    'tags': fm.get('tags', ['future-debrief']),
    'excerpt': excerpt
}

# Update image paths in body
body = re.sub(
    r'!\[([^\]]*)\]\((?:\.\/)?images\/([^)]+)\)',
    r'![\1](/assets/images/future-debrief/$SLUG/\2)',
    body
)

# Write transformed post
output = f"---\n{yaml.dump(new_fm, default_flow_style=False, allow_unicode=True)}---\n{body}"
Path("_posts/$FILENAME").write_text(output)
print(f"✓ Created _posts/$FILENAME")
PYTHON

# Copy images if present
if [[ -d "$SOURCE_IMAGES" ]]; then
    echo "🖼️  Copying images..."
    mkdir -p "assets/images/future-debrief/${SLUG}"
    cp "$SOURCE_IMAGES"/* "assets/images/future-debrief/${SLUG}/" 2>/dev/null || true
    git add assets/images/
fi

# Commit
git add "_posts/$FILENAME"
git commit -m "Add Future Debrief post: $TITLE"

# Push
echo "⬆️  Pushing branch..."
git push -u origin "$BRANCH" --quiet

# Create PR
echo "🔗 Creating PR..."
BLOG_PR_URL=$(gh pr create \
    --repo debrief/debrief.github.io \
    --title "Future Debrief: $TITLE" \
    --body "## New Blog Post

**Title:** $TITLE
**Date:** $POST_DATE
**Component:** $FEATURE_NAME

## Preview

Once merged, visible at: https://debrief.github.io/future/blog/

## Related

- Feature PR: $FEATURE_PR_URL
- Source: \`specs/$FEATURE_NAME/media/shipped-post.md\`

## Checklist

- [ ] Front matter is correct
- [ ] Images render properly (if any)
- [ ] Links work
- [ ] Content reads well

---
*Auto-generated from [debrief-future](https://github.com/debrief/debrief-future)*" \
    --base master)

echo ""
echo "✅ Blog PR created: $BLOG_PR_URL"
```

### Front Matter Transformation Rules

| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| `layout: post` | `layout: future-post` | Replace value |
| `category: shipped` | `track: "Shipped · {component}"` | Convert to track format |
| `category: planning` | `track: "Planning · This Week"` | Convert to track format |
| `author: ian` | `author: Ian` | Capitalize |
| (none) | `reading_time: N` | Calculate: ceil(words / 200) |
| (none) | `excerpt: "..."` | First paragraph, max 150 chars |
| `date: YYYY-MM-DD` | `date: YYYY-MM-DD` | Keep as-is |
| `tags: [...]` | `tags: [...]` | Keep as-is |
| `title: "..."` | `title: "..."` | Keep as-is |

### Image Path Transformation

```
Source: ![alt](./images/screenshot.png)
Target: ![alt](/assets/images/future-debrief/{slug}/screenshot.png)
```

### File Naming

```
{date}-{slug}.md
```

Where:
- `date` = YYYY-MM-DD (today or from front matter)
- `slug` = feature name, lowercased, hyphens for spaces, alphanumeric only, max 50 chars

Example: `2026-01-12-debrief-io.md`

## Error Handling

| Error | Action |
|-------|--------|
| `gh` not installed | Skip publishing, warn: "Install gh CLI: brew install gh" |
| Not authenticated | Skip publishing, warn: "Run gh auth login" |
| No shipped-post.md | Skip publishing silently (not an error) |
| Branch exists | Append timestamp: `{branch}-{HHmmss}` |
| Push fails | Retry once, then skip with warning |
| PR creation fails | Show error, provide manual instructions |

**Critical:** Blog publishing failures must never fail the main feature PR. Always complete the feature PR first.

## Template Tasks

When asked to create templates:

1. Check existing `_layouts/` for patterns to follow
2. Use Liquid syntax consistently with existing templates
3. Keep templates minimal — logic in includes where reusable
4. Test with `bundle exec jekyll serve` locally

## Styling Conventions

- Follow existing SCSS structure in `_sass/`
- Use existing colour variables — don't introduce new colours
- Mobile-first responsive approach
- Minimal custom CSS — leverage existing styles
