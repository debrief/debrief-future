# Implementation Plan: needs-interview Status for Backlog Workflow

**Branch**: `019-needs-interview-status` | **Date**: 2026-01-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-needs-interview-status/spec.md`

## Summary

Add a `needs-interview` status to the backlog workflow, allowing quick idea capture with deferred detailed requirements gathering. The feature introduces a `--defer` flag to `/idea`, creates a new `/interview` command for batch processing, and adds validation to prevent premature specification of incomplete items.

## Technical Context

**Language/Version**: Markdown (Claude Code command files)
**Primary Dependencies**: Claude Code skill system, GitHub CLI (`gh`) for issue updates
**Storage**: BACKLOG.md (existing file), no new storage
**Testing**: Manual acceptance testing per spec scenarios
**Target Platform**: Claude Code CLI (all supported platforms)
**Project Type**: Workflow enhancement (documentation only)
**Performance Goals**: N/A - human-interactive workflow
**Constraints**: Offline-capable (Constitution I.1), no external API calls
**Scale/Scope**: 4 files modified/created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | **PASS** | All operations are local file edits |
| I.3 | No silent failures | **PASS** | Commands report status explicitly |
| III.4 | Data stays local | **PASS** | No telemetry or external calls |
| VII | Test-Driven AI | **PASS** | Acceptance scenarios defined in spec |
| VIII.1 | Specs before code | **PASS** | Spec completed before plan |

**No violations. No justifications required.**

## Project Structure

### Documentation (this feature)

```text
specs/019-needs-interview-status/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Status and entity definitions
├── quickstart.md        # Phase 1: Getting started guide
└── tasks.md             # Phase 2: Task breakdown (from /speckit.tasks)
```

### Source Code (repository root)

```text
Changes required:
├── BACKLOG.md                           # Add needs-interview to workflow docs
├── .claude/commands/
│   ├── idea.md                          # Add --defer flag handling
│   ├── interview.md                     # NEW: Process deferred items
│   └── speckit.start.md                 # Reject needs-interview items
```

**Structure Decision**: This is a workflow enhancement, not application code. All changes are to markdown documentation files that define Claude Code behavior.

## Media Components

*None - workflow/infrastructure feature with no visual components.*

This feature modifies Claude Code commands (markdown skill files). There are no UI components, Storybook stories, or visual elements to bundle for blog demos.

## Complexity Tracking

> No constitution violations to justify. Implementation is minimal and well-scoped.

| Aspect | Complexity | Notes |
|--------|------------|-------|
| Files touched | 4 | BACKLOG.md + 3 command files |
| New concepts | 1 | `needs-interview` status |
| Dependencies | 0 | Uses existing patterns |
| Risk level | Low | Additive changes only |
