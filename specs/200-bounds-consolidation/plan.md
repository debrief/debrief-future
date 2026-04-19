# Implementation Plan: Consolidate bounds utilities into @debrief/utils

**Branch**: `200-bounds-consolidation` (authored on harness branch `claude/specify-item-200-Tqp0d`) | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/200-bounds-consolidation/spec.md`

## Summary

`apps/vscode/src/utils/bounds.ts` is a ~116-line, 95%-identical copy of `shared/utils/src/bounds.ts`. The only meaningful divergence is a defensive null-geometry guard that exists only in the VS Code copy — a real behavioural drift that has been bug-fixed in one place but not the other. There is exactly one in-tree production consumer (`apps/vscode/src/webview/mapPanel.ts`) plus a duplicate test file. This plan eliminates the duplication by lifting the null-guard into `@debrief/utils`, widening `calculateBounds`'s parameter to a structural minimum so `SafeFeature[]` flows through without casts, switching `mapPanel.ts` to import from `@debrief/utils`, and deleting the VS Code-local copy and its duplicate test. No new dependencies, no public API changes, no UI changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, monorepo-wide)
**Primary Dependencies**: `@debrief/utils` (target package — already published to the workspace; consumed by `apps/vscode`). No new runtime dependencies.
**Storage**: N/A — pure in-process utility.
**Testing**: vitest (`shared/utils/tests/bounds.test.ts`), `tsc --noEmit` (typecheck), ESLint, and the existing repo CI gate (`task verify`). VS Code extension's own test config also re-runs against the consolidated import path.
**Target Platform**: Node.js (test runtime) and browser (VS Code webview, where `mapPanel.ts` runs). The utility is environment-neutral.
**Project Type**: Monorepo (pnpm workspaces). Affects two packages: `shared/utils` (the canonical home) and `apps/vscode` (the consumer being switched over).
**Performance Goals**: No regression vs. the existing implementations. Bounds calculation is called once per import / per "fit to bounds" interaction over feature counts in the hundreds-to-low-thousands; current performance is far below any user-perceptible threshold and must remain so.
**Constraints**: (a) Behaviour-preserving for every existing caller (no thrown exception where there wasn't one before, no different bounds where there weren't different bounds before). (b) Must not introduce `any`/`Any` (Constitution Article XV). (c) No `as`-casts at the new call site in `mapPanel.ts` (FR-006).
**Scale/Scope**: ~116 lines deleted, ~5 lines changed (null-guard added, parameter type widened, two import lines flipped), one duplicate test file deleted, one new regression test added. Single-PR change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Verdict | Notes |
|---------|---------|-------|
| I. Defence-Grade Reliability | ✅ Pass | Pure in-process refactor; no network, no new failure modes. The null-guard is strictly safer for every existing caller (no caller relies on `calculateBounds` throwing on a null geometry — `mapPanel.ts` never wrapped it in a try/catch). |
| II. Schema Integrity | ✅ Pass (N/A) | No schema changes; LinkML is untouched. |
| III. Data Sovereignty | ✅ Pass (N/A) | No data persistence or transformation lineage involved. |
| IV. Architectural Boundaries | ✅ Pass | The change tightens the boundary it operates on: a shared utility moves from being duplicated across the frontend / shared layer to living solely in the shared layer. The frontend (`apps/vscode`) becomes a pure consumer. |
| V. Extensibility | ✅ Pass (N/A) | Internal cleanup; no extension surface changes. |
| VI. Testing | ✅ Pass | Existing `shared/utils/tests/bounds.test.ts` already covers the canonical paths; this plan **adds** a regression test for the null-geometry case (the behaviour previously exclusive to the VS Code copy). The duplicate VS Code test is deleted because its coverage is now subsumed. |
| VII. Test-Driven AI Collaboration | ✅ Pass | The new null-geometry regression test is written **before** the null-guard is lifted into `@debrief/utils`, so the guard's correctness is verified by a failing-then-passing test (TDD). |
| VIII. Documentation | ✅ Pass | Spec exists; this plan + research.md + quickstart.md document the change. No user-facing docs are affected (no behaviour change for users). |
| IX. Dependencies | ✅ Pass | No new dependencies added or version-bumped. One internal dependency edge (`apps/vscode → @debrief/utils`) is reused; no new edge created. |
| X. Security | ✅ Pass (N/A) | No secrets, no auth, no I/O surface. |
| XI. Internationalisation | ✅ Pass (N/A) | No user-facing strings. |
| XII. Community Engagement | ✅ Pass (N/A) | Internal cleanup; backlog item is publicly tracked (#200). |
| XIII. Contribution Standards | ✅ Pass | Atomic single-purpose change; CI gate (`task verify`) must be green before push. |
| XIV. Pre-Release Freedom | ✅ Pass (N/A) | Pre-v4.0.0; no deprecation period required, but none is being asked for either. |
| XV. Strict Type Safety | ✅ Pass | This article is the *reason* for FR-006: the call-site reconciliation must work without `as`-casts and without `any`. The chosen approach (parameter widening to a structural minimum — see research.md) is purely structural and introduces zero `any`. |

**Verdict**: All gates pass. No deviations to record. The Complexity Tracking section is not used.

## Project Structure

### Documentation (this feature)

```text
specs/200-bounds-consolidation/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already authored)
├── research.md          # Phase 0 output — null-guard placement, type-reconciliation choice
├── data-model.md        # Phase 1 output — shape of inputs/outputs touched
├── contracts/
│   └── bounds-utility.md # Phase 1 output — exported function signatures (canonical)
├── quickstart.md        # Phase 1 output — local verification steps
├── checklists/
│   └── requirements.md  # Spec quality checklist (already authored)
└── tasks.md             # Phase 2 output (created by /speckit.tasks — not by this command)
```

### Source Code (repository root)

```text
shared/
└── utils/
    ├── src/
    │   ├── bounds.ts          # CHANGED — lift null-guard into calculateBounds; widen input type
    │   ├── types.ts           # READ-ONLY — confirms GeoJSONFeature/SafeFeature live here
    │   └── index.ts           # UNCHANGED — already exports the four bounds helpers
    └── tests/
        └── bounds.test.ts     # CHANGED — add regression test for null-geometry feature

apps/
└── vscode/
    ├── src/
    │   ├── utils/
    │   │   └── bounds.ts      # DELETED
    │   ├── types/
    │   │   └── import.ts      # READ-ONLY — already re-exports SafeFeature as GeoJSONFeature
    │   └── webview/
    │       └── mapPanel.ts    # CHANGED — flip import from '../utils/bounds' to '@debrief/utils'
    └── tests/
        └── unit/
            └── bounds.test.ts # DELETED (coverage subsumed by shared/utils/tests/bounds.test.ts)
```

**Structure Decision**: This change touches exactly two existing packages in the established monorepo layout — `shared/utils` (canonical home) and `apps/vscode` (consumer). No new packages or directories are introduced. The "single canonical implementation in `shared/utils`, frontend imports it" arrangement is the project's standard pattern for cross-cutting utilities; this work brings the bounds utility into compliance with it.

## Media Components

None — backend/infrastructure feature. This is a non-user-facing refactor of an internal utility. No new visual components, no significant visual change, no Storybook story is created or modified. The only user-visible surface is the VS Code map's existing auto-zoom behaviour, which is preserved unchanged (covered by the spec's User Story 2 acceptance scenarios and by the manual smoke test in quickstart.md).

## Storybook E2E Testing

None — no interactive UI components are introduced or modified. The bounds utility has no DOM presence and renders no stories.

## VS Code Webview E2E Testing

None — no extension workflow changes. The change is import-path-only inside `mapPanel.ts`; no new panels, no new selectors, no new interactions. Existing VS Code E2E coverage of the map panel (which exercises auto-zoom on plot open) implicitly verifies that the consolidated utility behaves identically.

If the existing VS Code E2E suite does not already exercise an "open a plot containing at least one feature with a missing/null geometry" scenario, that gap is **not** introduced by this change and is out of scope here. The null-geometry behaviour is verified at the unit-test layer in `shared/utils/tests/bounds.test.ts` (per the new regression test added by this plan), which is the appropriate location for a pure utility's behavioural guarantee.

## Complexity Tracking

> Not used — Constitution Check passed with no violations.
