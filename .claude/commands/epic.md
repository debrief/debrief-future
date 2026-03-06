---
description: Break down a large feature into deliverable backlog items with [Ex] traceability. Accepts text description, local document path, or GitHub URL.
---

## User Input

```text
$ARGUMENTS
```

If the user input above is not empty, use it as the feature description (text, local path, or GitHub URL). If it is empty, **ask the user** for a feature description before proceeding — do NOT stop the session.

## Purpose

This command breaks down large features (epics) into 3-10 independently deliverable backlog items:

```
/epic <input> → parse → analyze → breakdown → BACKLOG.md → GitHub issues → summary
       ↑                  ↑            ↑            ↑             ↑           ↑
   (text/path/url)   (Opus BA+Arch)  (3-10 items) (epic+items) (one per item) (report)
```

Each item gets an `[Ex]` prefix for traceability back to the parent epic.

## Execution Flow

### Step 1: Parse Input

Determine input type from `$ARGUMENTS`:

| Pattern | Type | Action |
|---------|------|--------|
| Starts with `http://` or `https://` | GitHub URL | Fetch via WebFetch |
| Ends with `.md` or contains `/` | Local path | Read via Read tool |
| Everything else | Text description | Use directly |

If no input provided, **interactively ask the user** (using AskUserQuestion or a direct question) what feature they want to break down. Do NOT stop or end the session. Continue the workflow once the user responds.

### Step 2: Fetch Content (if link/path)

**For local paths**:
1. Use Read tool to fetch the file
2. If file not found, report error and stop

**For GitHub URLs**:
1. Use WebFetch to retrieve the document
2. If fetch fails, report error and suggest using local path or text description

**For text descriptions**:
1. Use the text directly as the feature description

Report: "Parsed input: {type} — {summary of content}"

### Step 3: Analyze with Opus

Act as both a **Business Analyst** and **Technical Architect** to break down the feature.

**Analysis Prompt** (use with the fetched content):

> Analyze this feature specification and break it down into 3-10 independently deliverable backlog items.
>
> **Business Analyst perspective:**
> - What distinct user-visible capabilities are needed?
> - What value does each piece deliver?
> - What are the acceptance criteria for each?
>
> **Technical Architect perspective:**
> - What are the technical dependencies?
> - What infrastructure is needed first?
> - Where are the uncertainty/risk areas?
>
> **Breakdown Principles:**
> - **Vertical slices over horizontal layers** — each item delivers visible value
> - **Infrastructure first** — if it unblocks other items
> - **Research spikes early** — to reduce uncertainty
> - **Core features in dependency order**
> - **Polish/enhancement items last**
>
> **Item Sizing:**
> - Target 1-3 day completion time per item
> - Split complex items further if needed
>
> **Output Format:**
> For each item, provide:
> 1. **Title**: Short, actionable (5-10 words)
> 2. **Category**: Feature | Enhancement | Tech Debt | Infrastructure | Research Spike
> 3. **Complexity**: Low | Medium | High
> 4. **Description**: 1-2 sentences explaining what this delivers
> 5. **Depends On**: List item numbers this depends on (if any)

### Step 4: Assign Epic ID

1. Read `BACKLOG.md`
2. Find the Epics table (section starting with `## Epics`)
3. Scan for existing epic IDs (pattern: `E[0-9]+`)
4. Assign next sequential ID:
   - If no epics exist: `E01`
   - Otherwise: max existing ID + 1, padded to 2 digits
   - Maximum: `E99` (error if exceeded)

Report: "Assigned epic ID: {ID}"

### Step 5: Update BACKLOG.md

**Add Epic Row:**

Insert row into Epics table:
```
| {epic_id} | {title} | [{short_description}]({source_link_or_text}) | active | {item_ids_comma_separated} |
```

**Add Item Rows:**

For each item from the breakdown:
1. Find next available item ID (scan Items table for max ID + 1)
2. Insert row into Items table:
```
| {item_id} | {category} | [{epic_id}] {title} | - | - | - | - | {complexity} | proposed |
```

Note: Items have no scores yet (use `-` placeholders). They get `[Ex]` prefix in description.

Report: "Updated BACKLOG.md: Epic {epic_id} with {count} items ({item_id_range})"

### Step 6: Create GitHub Issues

For each item, create a GitHub issue:

```bash
gh issue create --repo debrief/debrief-future \
  --title "[{epic_id}] {item_title}" \
  --body "$(cat <<'EOF'
## Epic
Part of **{epic_id}: {epic_title}**

## Problem
{What problem does this item solve?}

## Proposed Solution
{What should be built?}

## Success Criteria
- {Criterion 1}
- {Criterion 2}

## Dependencies
{List of dependent items, or "None"}

## Complexity
{Low/Medium/High}
EOF
)"
```

Capture issue number and URL for each item.

**On success**: Update BACKLOG.md item descriptions to link to issues:
```
| {item_id} | {category} | [[{epic_id}] {title}]({issue_url}) | - | - | - | - | {complexity} | proposed |
```

Report: "Created {count} GitHub issues: #{first}...#{last}"

### Step 7: Handle Offline Fallback

If `gh` CLI is unavailable or issue creation fails:

1. Create local files at `docs/ideas/{item_id}-{slug}.md` for each item:
```markdown
# [{epic_id}] {item_title}

## Epic
Part of **{epic_id}: {epic_title}**

## Problem
{What problem does this item solve?}

## Proposed Solution
{What should be built?}

## Success Criteria
- {Criterion 1}
- {Criterion 2}

## Dependencies
{List of dependent items, or "None"}

## Complexity
{Low/Medium/High}
```

2. Update BACKLOG.md item descriptions to link to local files:
```
| {item_id} | {category} | [[{epic_id}] {title}](docs/ideas/{item_id}-{slug}.md) | - | - | - | - | {complexity} | proposed |
```

3. Warn user:
> "GitHub issue creation unavailable. Items saved locally to `docs/ideas/`.
> Create GitHub issues manually when `gh` is available."

### Step 8: Report Summary

Output the final summary:

```markdown
## Epic Created: {epic_id} - {epic_title}

**Source**: {input_type}: {source}

### Breakdown ({count} items)

| ID | Category | Title | Complexity | Depends On |
|----|----------|-------|------------|------------|
| {item_id} | {category} | [{epic_id}] {title} | {complexity} | {dependencies} |
...

### BACKLOG.md Updated
- Epic {epic_id} added to Epics table
- {count} items added to Items table (status: proposed)

### GitHub Issues Created
- #{issue_num}: [{epic_id}] {title}
...
(or: Items saved locally — see `docs/ideas/`)

### Next Steps
1. Run `backlog-prioritizer` to score the new items
2. Run `the-ideas-guy` to approve items for implementation
3. Use `/speckit.start {ID}` to begin individual items
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No input provided | Ask for description, path, or URL |
| Local file not found | Report error, suggest alternatives |
| GitHub URL fetch failed | Report error, suggest local path |
| BACKLOG.md not found | ERROR — stop workflow |
| Epics section not found | ERROR — BACKLOG.md needs Epics section |
| Epic ID overflow (>E99) | ERROR — epic limit reached |
| Analysis produces <3 items | Warn, proceed anyway |
| Analysis produces >10 items | Suggest splitting into multiple epics |
| `gh` CLI unavailable | Fall back to local files |
| `gh issue create` fails | Fall back to local files |

## Example Usage

### From text description
```
Human: /epic Add storyboard briefing capability for analysts to create and share structured presentations