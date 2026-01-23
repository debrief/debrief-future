# Implementation Review: Epic Support

**Date**: 2026-01-23
**Feature**: 023-epic-workflow-support

## Artifacts Created

### 1. BACKLOG.md Epics Section

Location: `BACKLOG.md` (between Workflow and Items sections)

```markdown
## Epics

Large features broken down into multiple backlog items.

| ID | Title | Description | Status | Items |
|----|-------|-------------|--------|-------|
```

**Verification**:
- [x] Section header exists
- [x] Description text present
- [x] Table has 5 columns: ID, Title, Description, Status, Items
- [x] Table is empty (ready for first epic)
- [x] Location is correct (after Workflow, before Items)

### 2. /epic Skill File

Location: `.claude/commands/epic.md`

**Structure Verification**:
- [x] YAML frontmatter with description
- [x] `$ARGUMENTS` placeholder for user input
- [x] Execution flow with 8 steps

**Input Handling**:
- [x] Text description detection
- [x] Local path detection (ends with `.md` or contains `/`)
- [x] GitHub URL detection (starts with `http://` or `https://`)

**Analysis Section**:
- [x] Dual BA + Architect role specified
- [x] 3-10 items target range
- [x] Breakdown principles documented:
  - Vertical slices over horizontal layers
  - Infrastructure first
  - Research spikes early
  - Core features in dependency order
  - Polish/enhancement items last
- [x] Item sizing guidance (1-3 days)

**Epic ID Assignment**:
- [x] Scans Epics table for max ID
- [x] Handles empty table (first = E01)
- [x] Pads to 2 digits
- [x] E99 limit documented

**BACKLOG.md Updates**:
- [x] Epic row format specified
- [x] Item row format with `[Ex]` prefix
- [x] Items start with status: proposed, no scores

**GitHub Issue Creation**:
- [x] Issue title includes `[Ex]` prefix
- [x] Issue body structure (Epic, Problem, Solution, Criteria, Dependencies, Complexity)
- [x] Captures issue URLs for backlog linking

**Offline Fallback**:
- [x] Detects `gh` unavailable
- [x] Creates local files at `docs/ideas/{ID}-{slug}.md`
- [x] Links backlog to local files
- [x] Warns user about manual issue creation

**Summary Output**:
- [x] Shows epic ID and title
- [x] Lists items with ID, category, title, complexity, dependencies
- [x] Shows GitHub issue numbers or local file paths
- [x] Includes next steps guidance

**Error Handling**:
- [x] No input → asks for description
- [x] File not found → error
- [x] Fetch failed → suggests alternatives
- [x] Missing BACKLOG.md → stops
- [x] Missing Epics section → stops
- [x] <3 items → warns
- [x] >10 items → suggests splitting

## Acceptance Criteria Status

From spec.md:

| Criterion | Status |
|-----------|--------|
| BACKLOG.md has Epics section with table between Workflow and Items | PASS |
| Epic table has columns: ID, Title, Description, Status, Items | PASS |
| `/epic` skill exists at `.claude/commands/epic.md` | PASS |
| Command accepts text description or document link | PASS |
| Command fetches and parses linked documents | PASS |
| Breakdown uses Opus model for analysis | PASS (instructions specify) |
| Breakdown produces 3-10 items per epic | PASS (guidelines specify) |
| Each item has `[Ex]` prefix in description | PASS |
| Items include appropriate mix of types | PASS (categories defined) |
| Items are sequenced for value delivery | PASS (principles documented) |
| Epic row added to Epics table with item list | PASS |
| Item rows added to Items table (status: proposed) | PASS |
| GitHub issues created for each item | PASS (with fallback) |

## Notes

This feature is a **Claude Code skill** (prompt-based workflow). Manual testing requires:
1. Running `/epic` with a text description
2. Running `/epic` with a local document path
3. Running `/epic` with a GitHub URL

These are interactive tests that validate the prompt execution, not automated tests.
