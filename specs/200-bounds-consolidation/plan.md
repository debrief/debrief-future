# Implementation Plan: Consolidate bounds utilities into @debrief/utils

**Branch**: `200-bounds-consolidation` (authored on harness branch `claude/specify-item-200-Tqp0d`) | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md) (v2 post-review)
**Input**: Feature specification from `/specs/200-bounds-consolidation/spec.md`

## Summary

`apps/vscode/src/utils/bounds.ts` is a ~116-line, 95%-identical copy of `shared/utils/src/bounds.ts`. The only meaningful divergence is a defensive null-geometry guard that exists only in the VS Code copy — a real behavioural drift that has been bug-fixed in one place but not the other. There is exactly one in-tree production consumer for the shared-copy symbols (`apps/vscode/src/webview/mapPanel.ts`) plus a duplicate test file. In addition, the same `mapPanel.ts` contains a second, inline bounds calculation inside `fitToSelection()` that is limited to Point + LineString and silently misses Polygon/MultiPolygon/MultiPoint/MultiLineString selections — a fourth copy of the same logic with a latent correctness bug that this work folds in and fixes.

This plan eliminates the duplication and the silent miss in one coherent change:

1. Lift the null-guard into `@debrief/utils` (strictly safer for every consumer).
2. Widen `calculateBounds`'s parameter to a structural minimum so `SafeFeature[]` flows through without `as`-casts, and funnel its untyped portion (`coordinates: unknown`) through a single explicit, reviewable narrowing gate at the function's entry point.
3. Switch `mapPanel.ts` to import from `@debrief/utils`.
4. Replace the inline bounds loop in `fitToSelection()` with a call to the consolidated `calculateBounds`, fixing the silent-miss bug.
5. Delete the VS Code-local `bounds.ts` and its duplicate test.

**Scope note**: `shared/components/src/utils/bounds.ts` is a separate, LinkML-typed `calculateBounds` with additional spatial helpers; it is explicitly **out of scope** (tracked as a separate backlog item). No new runtime dependencies, no schema changes, no new UI.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, monorepo-wide).
**Primary Dependencies**: `@debrief/utils` (target package — already published to the workspace; consumed by `apps/vscode`). No new runtime dependencies.
**Storage**: N/A — pure in-process utility.
**Testing**: vitest (`shared/utils/tests/bounds.test.ts`), `tsc --noEmit` (typecheck), ESLint, and the existing repo CI gate (`task verify`). The VS Code package's own test config re-runs against the consolidated import path after the flip.
**Target Platform**: Node.js (test runtime) and browser (VS Code webview, where `mapPanel.ts` runs). The utility is environment-neutral.
**Project Type**: Monorepo (pnpm workspaces). Affects two packages: `shared/utils` (the canonical home) and `apps/vscode` (the consumer being switched over).
**Performance Goals**: No regression vs. the existing implementations. Bounds calculation is called once per plot-open and once per "fit to selection" interaction over feature counts in the hundreds-to-low-thousands; current performance is far below any user-perceptible threshold and must remain so.
**Constraints**: (a) Behaviour-preserving on the plot-open path for every existing caller; (b) Strict type safety (Article XV) — no `any`, no double-cast patterns, an explicit narrowing gate at the widened parameter; (c) No `as`-cast at the `mapPanel.ts` call sites (FR-006); (d) `fitToSelection` must improve on the historical behaviour (honour every supported geometry type) without regressing on Point/LineString selections (FR-008).
**Scale/Scope**: ~116 lines deleted in `apps/vscode/src/utils/bounds.ts`, ~35 lines deleted in `mapPanel.ts::fitToSelection()` (the inline loop), ~10 lines changed in `shared/utils/src/bounds.ts` (parameter widened, narrowing gate added, null-guard lifted), ~60 lines of new tests in `shared/utils/tests/bounds.test.ts` (null-geometry regression + per-geometry-type assertions), two import-line changes in `mapPanel.ts`, one duplicate test file deleted. Single-PR change.

No `NEEDS CLARIFICATION` markers. All open questions from the spec's v1 review have been resolved in spec v2 and are encoded here.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Verdict | Notes |
|---------|---------|-------|
| I. Defence-Grade Reliability | ✅ Pass | Pure in-process refactor; no network, no new failure modes. Article I.3 (no silent failures) is **actively improved** — the `fitToSelection` rewrite removes an existing silent miss for Polygon/MultiPolygon/Multi* selections. |
| II. Schema Integrity | ✅ Pass (N/A for this work) | No new schema-typed data structures. The pre-existing hand-written `SafeFeature` / `GeoJSONFeature` are an Article II tripwire but predate #200 — captured as a deferred backlog item. |
| III. Data Sovereignty | ✅ Pass (N/A) | No data persistence or transformation lineage involved. |
| IV. Architectural Boundaries | ✅ Pass | Tightens the boundary it operates on: a shared utility moves from being duplicated across the frontend / shared layer to living solely in the shared layer. The frontend (`apps/vscode`) becomes a pure consumer. |
| V. Extensibility | ✅ Pass (N/A) | Internal cleanup; no extension surface changes. |
| VI. Testing | ✅ Pass | Existing `shared/utils/tests/bounds.test.ts` covers the canonical paths; this plan **adds** (a) a regression test for the null-geometry case, (b) per-geometry-type assertions covering every type the utility branches on — Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon (SC-007). The duplicate VS Code test is deleted because its coverage is subsumed. |
| VII. Test-Driven AI Collaboration | ✅ Pass | TDD ordering is formalised in research R2 (corrected from v1 plan): (1) widen parameter → (2) add failing null-geometry test → (3) lift null-guard. The per-geometry-type tests required by SC-007 are written before the `fitToSelection` call site is switched over, so the behavioural change is verified by passing assertions rather than hoped for. |
| VIII. Documentation | ✅ Pass | Spec v2 exists; this plan + research.md + quickstart.md document the change. A one-line comment in the consolidated utility anchors the narrowing gate to Article XV.5 (per FR-007). |
| IX. Dependencies | ✅ Pass | No new dependencies added or version-bumped. |
| X. Security | ✅ Pass (N/A) | No secrets, no auth, no I/O surface. |
| XI. Internationalisation | ✅ Pass (N/A) | No user-facing strings. |
| XII. Community Engagement | ✅ Pass (N/A) | Internal cleanup; backlog item is publicly tracked (#200). |
| XIII. Contribution Standards | ✅ Pass | Atomic single-purpose change; CI gate (`task verify`) must be green before push. |
| XIV. Pre-Release Freedom | ✅ Pass (N/A) | Pre-v4.0.0; no deprecation period required, but none is being asked for either. |
| XV. Strict Type Safety | ✅ Pass | This is the *reason* for FR-006 and FR-007. The widened parameter (FR-006) brings `unknown` to the function's entry; the explicit narrowing gate (FR-007, SC-009) ensures the `unknown` is converted to a typed shape before any downstream code reads it — no `any`, no double-cast. The gate is a single, named, reviewable line anchored to Article XV.5 via comment. |

**Verdict**: All gates pass. No deviations to record. Complexity Tracking section unused.

## Project Structure

### Documentation (this feature)

```text
specs/200-bounds-consolidation/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # v2 feature specification
├── research.md          # Phase 0 output — narrowing gate, null-guard placement, fitToSelection rewrite ordering
├── data-model.md        # Phase 1 output — shape of inputs/outputs + narrowing gate's typed output
├── contracts/
│   └── bounds-utility.md # Phase 1 output — exported function signatures + fitToSelection's new call contract
├── quickstart.md        # Phase 1 output — local verification steps
├── checklists/
│   └── requirements.md  # Spec quality checklist (already validated)
├── media/
│   ├── planning-post.md # Phase 2 output
│   └── linkedin-planning.md # Phase 2 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks — not by this command)
```

### Source Code (repository root)

```text
shared/
└── utils/
    ├── src/
    │   ├── bounds.ts          # CHANGED — widen parameter; add narrowing gate; lift null-guard
    │   ├── types.ts           # READ-ONLY — confirms GeoJSONFeature / SafeFeature / Bounds live here
    │   └── index.ts           # UNCHANGED — already exports the four bounds helpers from the package root
    └── tests/
        └── bounds.test.ts     # CHANGED — add null-geometry regression + per-geometry-type assertions

apps/
└── vscode/
    ├── src/
    │   ├── utils/
    │   │   └── bounds.ts      # DELETED
    │   ├── types/
    │   │   └── import.ts      # READ-ONLY — already re-exports SafeFeature as GeoJSONFeature; no change
    │   └── webview/
    │       └── mapPanel.ts    # CHANGED — (a) flip import from '../utils/bounds' to '@debrief/utils';
    │                          #           (b) replace fitToSelection()'s inline loop with calculateBounds(selectedFeatures)
    └── tests/
        └── unit/
            └── bounds.test.ts # DELETED (coverage subsumed by shared/utils/tests/bounds.test.ts)
```

**Structure Decision**: This change touches exactly two existing packages in the established monorepo layout — `shared/utils` (canonical home) and `apps/vscode` (consumer). No new packages or directories are introduced. The "single canonical implementation in `shared/utils`, frontend imports it" arrangement is the project's standard pattern for cross-cutting utilities; this work brings the bounds utility into compliance with it.

## Media Components

None — backend/infrastructure feature. The bounds utility has no DOM presence and is not a visual component. The only user-visible surface touched is the VS Code map's auto-zoom behaviour: the plot-open path is preserved unchanged (User Story 2), and the selection-zoom path improves silently (User Story 4 — previously-missed geometry types now included). Neither produces a new or modified Storybook story.

## Storybook E2E Testing

None — no interactive UI components are introduced or modified. The bounds utility renders nothing.

## VS Code Webview E2E Testing

None planned for this feature — the change is an import-path flip inside `mapPanel.ts` plus an internal method rewrite (no new panels, no new selectors, no new interactions). Existing VS Code E2E coverage of the map panel (which exercises auto-zoom on plot open) implicitly verifies that the consolidated utility behaves identically on the plot-open path.

**Note on the `fitToSelection` rewrite** (User Story 4, FR-008): the behavioural correctness for Polygon/MultiPolygon/Multi* selections is verified by **unit tests** at the canonical utility (SC-007 — each geometry type produces correct bounds in isolation). A VS Code webview E2E test for "zoom to selection on a mixed-geometry plot" would be valuable long-term but is **out of scope** for this PR because (a) no existing webview E2E test exercises the selection-zoom toolbar, so we would be building new E2E infrastructure rather than extending existing; (b) SC-008 is verified by the documented manual smoke test in quickstart.md; (c) a lint-level assertion that `fitToSelection` calls `calculateBounds` (ensuring the code path cannot silently regress) is cheaper than a full E2E.

## Complexity Tracking

> Not used — Constitution Check passed with no violations.
