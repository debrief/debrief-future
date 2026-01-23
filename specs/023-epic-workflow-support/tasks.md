# Tasks: Epic Support for Speckit Workflow

**Feature**: 023-epic-workflow-support | **Branch**: `023-epic-workflow-support` | **Date**: 2026-01-23

## Overview

Implement epic support for the speckit workflow: a new `/epic` skill that breaks down large features into deliverable backlog items with `[Ex]` traceability.

## Phase 1: Infrastructure

### Task 1.1: Add Epics section to BACKLOG.md
**Status**: [ ] pending

Add the Epics table structure to BACKLOG.md between Workflow and Items sections.

**Acceptance**:
- [ ] Epics section exists with header and description
- [ ] Table has columns: ID, Title, Description, Status, Items
- [ ] Table is empty (no initial rows)
- [ ] Location is between Workflow and Items sections

**Files**: `BACKLOG.md`

---

## Phase 2: Core Skill Implementation

### Task 2.1: Create /epic skill file
**Status**: [ ] pending

Create the skill definition at `.claude/commands/epic.md` following the pattern from `/idea`.

**Acceptance**:
- [ ] File exists at `.claude/commands/epic.md`
- [ ] Has YAML frontmatter with description
- [ ] Uses `$ARGUMENTS` placeholder for user input
- [ ] Documents three input modes: text, local path, GitHub URL

**Files**: `.claude/commands/epic.md`

---

### Task 2.2: Implement input parsing section
**Status**: [ ] pending

Add parsing logic in the skill to handle text descriptions, local file paths, and GitHub URLs.

**Acceptance**:
- [ ] Skill detects input type (text vs path vs URL)
- [ ] Local paths trigger Read tool
- [ ] GitHub URLs trigger WebFetch
- [ ] Plain text used directly for analysis

**Files**: `.claude/commands/epic.md`

---

### Task 2.3: Implement Opus analysis section
**Status**: [ ] pending

Add the BA + Technical Architect analysis prompting that generates item breakdown.

**Acceptance**:
- [ ] Instructions specify dual BA/Architect role
- [ ] Requests 3-10 items per epic
- [ ] Specifies breakdown principles (vertical slices, infrastructure first, spikes early)
- [ ] Output includes: title, category, complexity, dependencies

**Files**: `.claude/commands/epic.md`

---

### Task 2.4: Implement Epic ID assignment
**Status**: [ ] pending

Add logic to scan BACKLOG.md Epics table and assign next sequential ID (E01, E02, etc.).

**Acceptance**:
- [ ] Parses existing Epics table for max ID
- [ ] Handles empty table (first epic = E01)
- [ ] Pads to 2 digits (E01 not E1)
- [ ] Error if 99+ epics (E99 max)

**Files**: `.claude/commands/epic.md`

---

### Task 2.5: Implement BACKLOG.md update section
**Status**: [ ] pending

Add logic to update BACKLOG.md with epic row and item rows.

**Acceptance**:
- [ ] Adds row to Epics table with ID, title, description, status, items list
- [ ] Adds rows to Items table with `[Ex]` prefix in description
- [ ] Items have status: proposed, no scores
- [ ] Item IDs are sequential from max existing ID

**Files**: `.claude/commands/epic.md`

---

### Task 2.6: Implement GitHub issue creation section
**Status**: [ ] pending

Add logic to create GitHub issues for each item using `gh issue create`.

**Acceptance**:
- [ ] Creates one issue per item
- [ ] Issue title includes `[Ex]` prefix
- [ ] Issue body has structured sections (Problem, Solution, Criteria)
- [ ] Captures issue URLs for backlog linking
- [ ] Handles `gh` unavailable gracefully

**Files**: `.claude/commands/epic.md`

---

### Task 2.7: Implement offline fallback
**Status**: [ ] pending

Add fallback when GitHub CLI is unavailable.

**Acceptance**:
- [ ] Detects `gh` unavailable or API failure
- [ ] Creates local files at `docs/ideas/{ID}-{slug}.md`
- [ ] Links backlog to local files instead of GitHub URLs
- [ ] Warns user about manual issue creation

**Files**: `.claude/commands/epic.md`

---

### Task 2.8: Implement summary output
**Status**: [ ] pending

Add the final report showing created epic, items, and next steps.

**Acceptance**:
- [ ] Shows epic ID and title
- [ ] Lists all items with ID, type, title, complexity
- [ ] Shows GitHub issue numbers (or local file paths)
- [ ] Includes next steps guidance

**Files**: `.claude/commands/epic.md`

---

## Phase 3: Validation

### Task 3.1: Manual test with text description
**Status**: [ ] pending

Test the `/epic` command with a plain text description.

**Evidence**:
- [ ] Screenshot of command output
- [ ] BACKLOG.md shows new epic and items
- [ ] GitHub issues created (or local fallback)

---

### Task 3.2: Manual test with local document
**Status**: [ ] pending

Test the `/epic` command with a local markdown file path.

**Evidence**:
- [ ] Document fetched and parsed
- [ ] Breakdown reflects document content
- [ ] Items properly sequenced

---

### Task 3.3: Manual test with GitHub URL
**Status**: [ ] pending

Test the `/epic` command with a GitHub URL.

**Evidence**:
- [ ] URL fetched via WebFetch
- [ ] Content parsed correctly
- [ ] Breakdown generated from remote spec

---

## Phase 4: Documentation & Media

### Task 4.1: Update quickstart.md with actual output
**Status**: [ ] pending

Update the quickstart guide with real example output from testing.

**Acceptance**:
- [ ] Example output reflects actual `/epic` behavior
- [ ] Troubleshooting section covers real edge cases

**Files**: `specs/023-epic-workflow-support/quickstart.md`

---

### Task 4.2: Finalize planning post for blog
**Status**: [ ] pending

Review and finalize the planning post content.

**Acceptance**:
- [ ] Post accurately describes implemented feature
- [ ] Link placeholder replaced or removed

**Files**: `specs/023-epic-workflow-support/media/planning-post.md`

---

## Phase 5: Integration

### Task 5.1: Create PR with all artifacts
**Status**: [ ] pending

Create pull request with skill, BACKLOG.md changes, and documentation.

**Acceptance**:
- [ ] PR title: `feat(023): Add epic workflow support`
- [ ] PR body includes summary, test evidence
- [ ] All acceptance criteria from spec satisfied
- [ ] CI passes (if applicable)

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| 1. Infrastructure | 1 | None |
| 2. Core Implementation | 8 | Tasks 2.1-2.8 are sequential (build on each other) |
| 3. Validation | 3 | 3.1, 3.2, 3.3 can run in parallel |
| 4. Documentation | 2 | 4.1, 4.2 can run in parallel |
| 5. Integration | 1 | None |

**Total**: 15 tasks
**Parallel opportunities**: Validation tests (3), Documentation (2)
