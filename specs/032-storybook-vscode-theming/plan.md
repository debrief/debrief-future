# Implementation Plan: Document Storybook VS Code Theming Setup

**Branch**: `032-storybook-vscode-theming` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/032-storybook-vscode-theming/spec.md`

## Summary

Create a comprehensive documentation file (`docs/storybook-vscode-theming.md`) that explains the three-layer theming architecture (CSS tokens → VS Code adapter → ThemeProvider), provides token and mapping reference tables extracted from source files, and includes a step-by-step guide for adding new themed components. Update `CLAUDE.md` to reference the new document.

## Technical Context

**Language/Version**: Markdown (documentation only — no code implementation)
**Primary Dependencies**: N/A (reads existing source files for reference content)
**Storage**: N/A
**Testing**: Manual review — verify tables match source files (`tokens.css`, `vsCodeAdapter.ts`)
**Target Platform**: Developer documentation (human and AI consumers)
**Project Type**: single
**Performance Goals**: N/A
**Constraints**: Documentation must be accurate to current codebase; no code changes beyond CLAUDE.md
**Scale/Scope**: Two files: one new markdown doc, one single-line edit to CLAUDE.md

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Documentation only, no runtime impact |
| II. Schema Integrity | Schema tests mandatory | N/A | No schema changes |
| III. Data Sovereignty | Provenance always | N/A | No data transformation |
| IV. Architectural Boundaries | Services never touch UI | N/A | No code changes |
| VI. Testing | Services require unit tests | N/A | No service code |
| VII. Test-Driven AI | Definition of done first | PASS | Acceptance criteria defined in spec |
| VIII. Documentation | Specs before code | PASS | Spec exists; this IS the documentation task |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/032-storybook-vscode-theming/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Source file inventory and content extraction
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
docs/
└── storybook-vscode-theming.md   # NEW — main deliverable

CLAUDE.md                          # MODIFY — add Key Documents reference
```

**Structure Decision**: No source code directories needed. This is a pure documentation task producing one new markdown file and one single-line edit.

## Media Components

None — documentation/infrastructure feature with no visual components.

## Complexity Tracking

No violations to justify.
