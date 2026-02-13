---
description: Show epic progress dashboard and identify the next item to work on. Accepts epic ID (e.g., E02).
---

## User Input

```text
$ARGUMENTS
```

You **MUST** have an epic ID provided (e.g., `E01`, `E02`, `e03`, or just `01`).

## Purpose

This command provides an epic-level workflow view — a progress dashboard that shows where an epic stands and which item to work on next. It reads all state from BACKLOG.md (no context accumulation across sessions) so you can re-run it cheaply after completing each item.

```
/epic.backlog E02 → parse → read BACKLOG.md → gather items → resolve deps → dashboard → next item
```

## Execution Flow

### Step 1: Parse Epic ID

Extract the epic ID from `$ARGUMENTS`:

- Accept formats: `E01`, `e01`, `01`, `1`, `E1`
- Normalize to uppercase with zero-padding: `E01`, `E02`, etc.
- ERROR if no ID provided:
  > "Please provide an epic ID, e.g., `/epic.backlog E02`"

### Step 2: Read BACKLOG.md — Find Epic

1. Read `BACKLOG.md`
2. Find the **Epics** table (section starting with `## Epics`)
3. Locate the row matching the normalized epic ID
4. Extract: **Title**, **Description**, **Status**, **Items** (comma-separated item IDs)

ERROR if epic not found:
> "Epic {ID} not found in BACKLOG.md. Available epics: {list of existing IDs}"

### Step 3: Gather Item Details

For each item ID listed in the epic's Items column:

1. Find the item's row in the **Items** table
2. Extract: **ID**, **Category**, **Description**, **V/M/A scores**, **Total**, **Complexity**, **Status**
3. Parse **dependencies** from description: look for `requires #xxx` or `(requires #nnn, #mmm)` patterns
4. Parse **title** from description: extract link text or plain text before any `—` or dependency markers

Build a structured list of items with their details.

### Step 4: Resolve Dependencies

For each item with dependencies:

1. Look up each dependency's status in BACKLOG.md (the dependency may be outside the epic)
2. Mark each dependency as:
   - **met** if status is `complete`
   - **unmet** if status is anything else
3. An item is **ready** when:
   - Its status is `approved` AND
   - ALL dependencies are met (status `complete`)

### Step 5: Display Progress Dashboard

Output a dashboard showing epic progress:

```markdown
## Epic {ID}: {Title}

**Status**: {epic_status} | **Progress**: {complete_count}/{total_count} items ({percentage}%)

### Items by Status

#### Complete ({count})
{For each complete item: "- ~~#{id}~~ — {title}"}

#### Implementing ({count})
{For each implementing item: "- **#{id}** — {title} ({complexity})"}

#### Ready to Start ({count})
{For each ready item: "- #{id} — {title} ({complexity}, score: {total}) — all dependencies met"}

#### Blocked ({count})
{For each blocked item: "- #{id} — {title} — waiting on: {unmet_dep_ids_with_statuses}"}

#### Not Yet Approved ({count})
{For each proposed/needs-interview item: "- #{id} — {title} (status: {status})"}
```

**Grouping rules:**
- **Complete**: status is `complete` (show struck through)
- **Implementing**: status is `implementing`, `tasked`, `planned`, `specified`, or `clarified`
- **Ready to Start**: status is `approved` AND all dependencies met
- **Blocked**: status is `approved` BUT has unmet dependencies
- **Not Yet Approved**: status is `proposed` or `needs-interview`

Omit any group that has zero items.

### Step 6: Recommend Next Item

After the dashboard, provide a clear **Next Action** section:

**Case 1: Items are ready to start**

If multiple items are ready, recommend the highest-scored one:

```markdown
### Next Action

**#{id}** — {title}
- Complexity: {complexity}
- Score: {total} (V:{v} M:{m} A:{a})
- Dependencies: {dep_list_with_checkmarks}

→ Run `/speckit.start {id}` to begin this item.
```

If there are other ready items, list them:

```markdown
Also ready: #{id2} ({title2}, score: {total2}), #{id3} ({title3}, score: {total3})
```

**Case 2: Items are in progress but none ready**

```markdown
### Next Action

Currently implementing: **#{id}** — {title}
No additional items can be started — blocked by in-progress work.

Re-run `/epic.backlog {epic_id}` when #{id} completes.
```

**Case 3: All items complete**

```markdown
### Epic Complete!

All {count} items in {epic_id} are complete.
Consider updating the epic status in BACKLOG.md from `{current_status}` to `complete`.
```

**Case 4: Items exist but none are approved**

```markdown
### Next Action

No approved items to start. Current statuses: {status_summary}

To move forward:
1. Run `backlog-prioritizer` to score unscored items
2. Run `the-ideas-guy` to approve scored items
3. Then re-run `/epic.backlog {epic_id}`
```

**Case 5: All approved items are blocked by dependencies**

```markdown
### Next Action

All approved items are blocked by unmet dependencies:

{For each blocked item:}
- **#{id}** waiting on: #{dep} ({dep_status})

Focus on completing the blocking items first, then re-run `/epic.backlog {epic_id}`.
```

### Step 7: Summary Statistics

End with a compact summary line:

```markdown
---
{epic_id} — {complete}/{total} complete | {implementing} implementing | {ready} ready | {blocked} blocked
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No input provided | Show usage: `/epic.backlog E02` |
| Epic ID not found | List available epic IDs from BACKLOG.md |
| BACKLOG.md not found | ERROR — stop workflow |
| Epics section not found | ERROR — BACKLOG.md needs Epics section |
| Item ID in epic not found in Items table | Warn: "Item #{id} listed in epic but not found in Items table" and skip it |
| Dependency item not in BACKLOG.md | Warn: "Dependency #{id} not found — treating as unmet" |
| Epic has no items listed | "Epic {ID} has no items yet. Use `/epic` to break it down." |

## Example Usage

```
Human: /epic.backlog E02