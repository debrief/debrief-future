# Implementation Plan: Document vscrui as Standard Component Library

**Branch**: `031-vscrui-component-library` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/031-vscrui-component-library/spec.md`

## Summary

Create documentation establishing vscrui as the standard React component library for all VS Code webview-based UIs in the Debrief project. This is a documentation-only deliverable: one markdown file in `shared/components/` plus a cross-reference in `ARCHITECTURE.md`. vscrui replaces the deprecated Microsoft VS Code Webview UI Toolkit and provides native-looking React components for webviews.

## Technical Context

**Language/Version**: Markdown (documentation only)
**Primary Dependencies**: N/A (no code dependencies)
**Storage**: N/A
**Testing**: Manual review — verify all 10 functional requirements are addressed
**Target Platform**: Documentation consumed by developers
**Project Type**: single
**Performance Goals**: N/A
**Constraints**: Document must be discoverable from ARCHITECTURE.md; must cover offline bundling requirement
**Scale/Scope**: 1 markdown file + 1 ARCHITECTURE.md update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Document specifies offline bundling (FR-007) |
| II. Schema Integrity | Schema tests mandatory | N/A | No schemas in this feature |
| III. Data Sovereignty | Provenance always | N/A | No data transformation |
| IV. Architectural Boundaries | Services never touch UI | N/A | Documentation only |
| V. Extensibility | No vendor lock-in | PASS | vscrui is open source, replaceable |
| VI. Testing | Tests required | N/A | Documentation only — manual verification |
| VII. Test-Driven AI | Definition of done first | PASS | FR-001–FR-010 define acceptance |
| VIII. Documentation | Specs before code | PASS | This spec/plan precedes implementation |
| IX. Dependencies | Minimal, vetted | PASS | vscrui is the sole UI dependency, justified |
| X. Security | No secrets in code | N/A | Documentation only |
| XI. Internationalisation | I18N from the start | N/A | No user-facing strings in this deliverable |
| XII. Community Engagement | Public by default | PASS | Documentation is public |
| XIII. Contribution Standards | Atomic commits | PASS | Single logical change |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/031-vscrui-component-library/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # N/A for documentation feature
    └── README.md
```

### Source Code (repository root)

```text
shared/
└── components/
    └── vscrui.md        # Primary deliverable

ARCHITECTURE.md          # Updated with cross-reference
```

**Structure Decision**: Documentation-only feature. Single file in `shared/components/` per FR-008, with a reference added to `ARCHITECTURE.md` per SC-004.

## Media Components

None — documentation/infrastructure feature. No visual components or Storybook stories.

## Complexity Tracking

No constitution violations to justify.
