# Implementation Plan: Kind discriminator for TimelineEntry

**Branch**: `208-timeline-entry-kind` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/208-timeline-entry-kind/spec.md`

## Summary

Replace feature 176's *visual-category-as-semantic-gate* snapshot detection (`resolveToolCategory(entry.toolName).category === 'snapshot'`) with a proper PROV-sourced `kind` discriminator on `TimelineEntry`. Add an optional `activity_type` field to the LinkML `LogEntry` schema; project it onto the `TimelineEntry.kind` closed union (`'snapshot' | 'tool' | 'tune'`) in the VS Code host. Migrate the single semantic-gate call site (`LogEntry.tsx` line 114) to read `entry.kind === 'snapshot'`. Leave visual-category-based *rendering* (icons, colour chips) unchanged. Ship with unit tests for the projection fallback and a drift test asserting no residual semantic uses of `ToolCategory === 'snapshot'`.

This is a small, bounded tech-debt refactor that unblocks three future features (snapshot button, tune marker, manual rationale entries) without emitting any new entry kinds itself.

## Technical Context

**Language/Version**: TypeScript 5.x (components + VS Code host); LinkML >= 1.7.0 (schema); Python 3.11 (schema generation, adherence tests)
**Primary Dependencies**: `@debrief/components` (TimelineEntry type + LogPanel), `@debrief/schemas` (generated LogEntry types), `@debrief/session-state` (LogEntry runtime type), LinkML `gen-typescript` + `gen-pydantic`
**Storage**: N/A (type-surface + schema-surface change; no data writes)
**Testing**: vitest (unit — TS); pytest (Python schema adherence); Playwright/Storybook E2E (LogPanel visual regression)
**Target Platform**: VS Code extension host + browser (Storybook, web-shell, code-server webview)
**Project Type**: Existing monorepo — pnpm workspace (TS) + uv workspace (Python). No new packages.
**Performance Goals**: No performance-relevant change. Type-only at the hot path; field population is a single property copy per entry.
**Constraints**: Zero visible regression in LogPanel (FR-004 / SC-003); no new runtime dependency (FR-007); fallback projection must not throw for legacy records (FR-006).
**Scale/Scope**: ~6 files touched: 1 LinkML schema, 2 generated-type regenerations, 1 TS projection (`logPanelView.ts`), 1 TS consumer (`LogEntry.tsx`), 1 type file (`types.ts`), plus unit tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Offline; explicit failure mode | ✅ Pass | FR-006 mandates an explicit fallback (`'tool'`) with a unit test; no silent failure. Offline unchanged. |
| II. Schema Integrity | Adding optional `activity_type` to LinkML LogEntry | ✅ Pass | LinkML remains single source of truth; Pydantic + TypeScript regenerated via existing `gen-*` tooling. Adherence tests (golden fixtures, round-trip, structural comparison) run against the new schema. Pre-release (XIV) so no schema version bump required. |
| III. Data Sovereignty | Provenance always; immutable audit trail | ✅ Pass | New field is **additive** and **optional** on LogEntry; existing PROV records remain valid. No field is removed, no record is rewritten. Provenance lineage preserved. |
| IV. Architectural Boundaries | Services never touch UI | ✅ Pass | `activity_type` is a semantic field on the PROV schema (service-domain). UI consumes it via the host projection (`toTimelineEntry`). Visual category remains in the UI layer (`resolveToolCategory`) and drives only rendering. |
| V. Extensibility | Closed-union discriminator | ✅ Pass | Future entry kinds are added by extending the enum in one place (LinkML + TS union); exhaustiveness checks at each switch force consumer updates. |
| VI. Testing | Unit + adherence + E2E | ✅ Pass | Unit test for projection fallback; LinkML adherence tests for the new enum; existing Storybook + code-server E2E re-run to validate SC-003. |
| VII. Test-Driven AI Collaboration | Acceptance criteria + checklist | ✅ Pass | Spec has 5 measurable SCs and a requirements checklist (all green). |
| VIII. Documentation | Specs before code; ADR for the discriminator decision | ✅ Pass | Spec exists; this plan documents the design. A short ADR-style entry goes into `docs/project_notes/decisions.md` at PR time noting the activity_type semantic separation from ToolCategory. |
| IX. Dependencies | No new deps | ✅ Pass | FR-007 explicitly forbids new runtime deps; plan adds none. |
| X. Security | No secrets | ✅ Pass | N/A. |
| XI. Internationalisation | User-facing strings | ✅ Pass | No new user-facing strings; the existing `manualCheckpointLabel` string is unchanged (its gating condition changes, not the string itself). |
| XII. Community Engagement | Planning post | ✅ Pass | Phase 2 generates `media/planning-post.md` + LinkedIn summary. |
| XIII. Contribution Standards | Atomic commits | ✅ Pass | Will split into: (a) schema + regen, (b) type + projection, (c) consumer migration + tests. |
| XIV. Pre-Release Freedom | Schema evolution | ✅ Pass | Optional field; legacy records pass validation unchanged. |
| XV. Strict Type Safety | Closed union, exhaustiveness | ✅ Pass | `'snapshot' \| 'tool' \| 'tune'` is explicit. Switches/branches over the union are forced to be exhaustive (SC-004). No `any`. |

**Gate result**: All applicable articles pass. No violations to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/208-timeline-entry-kind/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify output)
├── media/               # Phase 2 output (/speckit.plan command)
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Created by /speckit.tasks (not this command)
```

### Source Code (repository root)

Files touched by this feature, in existing monorepo layout:

```text
shared/
├── schemas/
│   └── src/
│       └── linkml/
│           └── log-entry.yaml                         # EDIT: add optional `activity_type` enum field
│   └── src/
│       └── generated/                                 # REGENERATED: Pydantic + TypeScript + JSON Schema
│           ├── pydantic/…
│           └── typescript/types.ts
└── components/
    └── src/
        └── LogPanel/
            ├── types.ts                               # EDIT: add `TimelineEntryKind` union + `kind?` on TimelineEntry
            └── LogEntry.tsx                          # EDIT: migrate `isSnapshot` to read `entry.kind === 'snapshot'`
            └── __tests__/
                └── LogEntry.test.tsx                # EDIT: add kind-based isSnapshot test

apps/
└── vscode/
    └── src/
        └── views/
            └── logPanelView.ts                       # EDIT: populate `kind` in `toTimelineEntry` with fallback
            └── __tests__/ (new or existing)          # ADD: unit test for projection fallback to 'tool'

services/                                              # NO CHANGE
tests/                                                 # Existing Playwright suites re-run unchanged
```

**Structure Decision**: Existing monorepo layout. No new packages, directories, or generators. The schema-regeneration step uses the existing `linkml-gen-*` invocations already wired into the build. No new test harnesses required.

## Media Components

This feature does not introduce or significantly change any visual component. The LogPanel's rendered output is required to remain unchanged (FR-004 / SC-003); any visible difference is a regression. There is no new Storybook story to bundle for blog demos.

**None — backend/infrastructure refactor** (type-surface + schema-surface change).

## Storybook E2E Testing

No new Storybook stories. The existing LogPanel stories (which cover the snapshot-boundary separator and manual-checkpoint placeholder rendering) are re-run unchanged in CI and must continue to pass. No new test files required.

**None — no new interactive UI components.** Existing LogPanel stories serve as regression coverage for SC-003.

## VS Code Webview E2E Testing

No new extension workflows. The existing `tests/e2e/test-log-panel.spec.ts` suite is currently `test.describe.fixme(...)` pending issue #143 (per backlog item #210); its reactivation is out of scope for this feature. Any indirectly-affected E2E suites (e.g. any webview test that touches LogPanel rendering) continue to pass.

**None — no extension workflow changes.** If the existing log-panel suite is un-skipped by a future feature, it will exercise the migrated code path incidentally.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Complexity tracking not required.
