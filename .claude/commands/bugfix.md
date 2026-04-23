---
description: Fast-track workflow for Bug-type backlog items. Skips specify/clarify/plan/tasks and goes straight to fix, test, PR.
handoffs:
  - label: View PR
    agent: none
    prompt: PR created successfully
    send: false
---

## User Input

```text
$ARGUMENTS
```

If the user input above is not empty, use it as the backlog item ID (e.g., `007`, `13`, or `077`). If it is empty, **ask the user** for a backlog item ID before proceeding — do NOT stop the session.

## Purpose

Bug fixes restore existing specified behavior — they don't introduce new behavior that needs discovery or planning. This command provides a fast-track workflow that skips the full speckit pipeline (specify, clarify, plan, tasks) and goes straight to: **reproduce, fix, test, PR**.

### Constitution Compatibility

Article VIII states: "Specs before code — no **significant** implementation without a written specification." A bug fix restores behaviour already defined by a prior feature's spec, so it is not a significant new implementation. The original feature's specification already defines the intended behaviour.

## Execution Flow

### Step 1: Parse Input

Extract the backlog item ID from `$ARGUMENTS`:

- Accept formats: `007`, `7`, `#007`, `#7`, `ID 007`
- Normalize to a 3-digit zero-padded string (e.g., `7` → `007`, `#12` → `012`) so it matches BACKLOG.md IDs and feature-branch/spec-dir prefixes
- ERROR if no ID provided: "Please provide a backlog item ID, e.g., `/bugfix 013`"

### Step 2: Read and Parse BACKLOG.md

1. Read `BACKLOG.md` from the repository root
2. Find the items table (starts with `| ID | Category |`)
3. Locate the row matching the requested ID
4. Extract:
   - **ID**: The item number
   - **Category**: Must be `Bug`
   - **Description**: The bug description text
   - **Complexity**: Low, Medium, or High
   - **Status**: Current status

### Step 3: Validate Item

| Check | Pass Condition | Error Message |
|-------|---------------|---------------|
| Item exists | Row found in table | "Backlog item {ID} not found in BACKLOG.md" |
| Category is Bug | Category column is `Bug` | "Item {ID} has category '{category}'. `/bugfix` is only for Bug items. Use `/speckit.start {ID}` for {category} items." |
| Not needs-interview | Status is NOT `needs-interview` | "Item {ID} needs interview first. Run `/interview` to complete requirements gathering." |
| Status is approved | Status is `approved` | "Item {ID} has status '{status}'. Only 'approved' items can be started." |
| Has description | Description is not empty or `-` | "Item {ID} has no description. Add a description to BACKLOG.md first." |

### Step 4: Confirm with User

Present the item details and ask for confirmation:

```markdown
## Bugfix Fast-Track for Item {ID}

| Field | Value |
|-------|-------|
| ID | {ID} |
| Description | {Description} |
| Complexity | {Complexity} |
| Status | {Status} → will become `implementing` |

**Fast-track workflow** (no spec/plan/tasks):
1. Create feature branch
2. Investigate and reproduce the bug
3. Implement fix with tests
4. Create PR

**Skipping**: specification, clarification, planning, task breakdown, media content, evidence artifacts.

Proceed?
```

### Step 5: Create Feature Branch

Use the existing branch creation script:

```bash
.specify/scripts/bash/create-new-feature.sh --json --number {ID} --short-name "{short-name}" "Fix: {description}"
```

- Derive `{short-name}` from the description (e.g., "Time Range and Tools panels show empty" → `fix-empty-panels`)
- Prefix branch short-name with `fix-` to distinguish from feature branches
- Parse the JSON output to get `BRANCH_NAME`

### Step 6: Update BACKLOG.md Status

Update the backlog row immediately:

- Change status from `approved` to `implementing`
- Do NOT convert description to a spec link (there is no spec)

Commit:
```
chore(backlog): mark bug {ID} as implementing (fast-track)
```

### Step 7: Investigate and Fix

This is the core work phase. The agent should:

1. **Understand the bug**: Read the description and any linked GitHub issue
2. **Locate relevant code**: Search the codebase for the affected area
3. **Reproduce** (if possible): Identify the failing condition
4. **Implement the fix**: Make the minimal change needed
5. **Add or update tests**: Ensure a regression test covers the fix
6. **Run tests**: Verify the fix works and nothing else breaks

Guidelines:
- **Minimal changes only** — fix the bug, don't refactor surrounding code
- **Tests required** — Constitution Article VI still applies
- **Atomic commits** — commit the fix and test separately or together, but keep them focused

### Step 8: Create Pull Request

Create a PR using `gh pr create`. Use the `fix()` conventional commit prefix.

**PR title format**: `fix(scope): Brief description`

**PR body format** (use HEREDOC):

```bash
gh pr create --title "fix(scope): Brief title" --body "$(cat <<'EOF'
## What was broken

[One or two sentences describing the user-visible symptom]

## Root cause

[One or two sentences explaining why it was broken]

## Fix

[Brief description of what changed and why]

## Test plan

- [ ] Regression test added/updated
- [ ] Existing tests still pass
- [ ] Manual verification: [describe steps if applicable]

Bugfix fast-track for backlog item #{ID}.
EOF
)"
```

### Step 9: Complete

After PR creation:

1. **Update BACKLOG.md**: Strike through the row and set status to `complete`
2. **Commit**: `chore(backlog): mark bug {ID} as complete`
3. **Report**:

```markdown
## Bugfix Complete

**Item**: #{ID} — {Description}
**PR**: {PR_URL}
**Branch**: {BRANCH_NAME}

### Status Flow (fast-track)
approved → implementing → complete

### What was skipped
Specification, clarification, planning, task breakdown, media content, evidence artifacts.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Item not found | ERROR with suggestion to check BACKLOG.md |
| Category is not Bug | ERROR: redirect to `/speckit.start {ID}` |
| Item is `needs-interview` | ERROR: run `/interview` first |
| Item is `proposed` | ERROR: needs approval first |
| Item already `implementing` or later | WARN: already in progress, ask if they want to continue |
| Item is complete | ERROR: "Item {ID} is already complete" |
| Tests fail after fix | Report failure, ask user for guidance |
| PR creation fails | Report error, suggest manual `gh pr create` |

## What This Command Does NOT Do

- Create spec.md, plan.md, tasks.md, or research.md
- Generate blog posts or LinkedIn content
- Collect evidence artifacts
- Spawn Content Specialist or media agents
- Create entries in the specs/ directory
- Run `/speckit.pr` or `/publish`

## Status Flow Comparison

**Full speckit pipeline** (Features, Enhancements, etc.):
```
approved → specified → clarified → planned → tasked → implementing → complete
```

**Bugfix fast-track** (Bug items only):
```
approved → implementing → complete
```
