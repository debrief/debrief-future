# Implementation Plan: Unify `shared/components` bounds utilities with `@debrief/utils`

**Branch**: `219-unify-bounds-utilities` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/219-unify-bounds-utilities/spec.md`

## Summary

Delete the 215-line duplicate at `shared/components/src/utils/bounds.ts`; port its five unique helpers (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`) into `shared/utils/src/bounds.ts` (`@debrief/utils`) alongside the existing four; teach the unified `calculateBounds` to honour a pre-computed `feature.bbox` (absorbing #211); migrate the three internal consumers and the one barrel re-export; relocate the tests. After this feature, `calculateBounds` exists exactly once in the monorepo and all nine bounds helpers live in a single module whose input contract (`BoundsInputFeature`) structurally accepts `DebriefFeature`, `SafeFeature`, and `GeoJSONFeature` without casts.

## Technical Context

**Language/Version**: TypeScript 5.x (existing monorepo — no new languages; no Python edits)
**Primary Dependencies**: `@debrief/utils` (target host for unified module), `@debrief/schemas` (provides `ViewportPolygon` — already an indirect dep via `shared/components`; this feature adds the import to `@debrief/utils`), existing project toolchain (ESLint, tsc, vitest)
**Storage**: N/A — this feature is a pure-code refactor; no persistence, no schema changes
**Testing**: vitest (existing test runner for both `shared/utils/tests/` and `shared/components/src/utils/__tests__/`); no new test framework introduced. Playwright E2E for `MapView` / `StacBrowser` indirectly exercises the migrated consumers; no new E2E is authored for this feature.
**Target Platform**: Same as existing `@debrief/utils` — browser + Node (both webview and test contexts). No platform expansion.
**Project Type**: single — pnpm workspace (root-level `@debrief/utils`, `@debrief/components`, consumed by `apps/vscode`, `apps/web-shell`, `apps/loader`).
**Performance Goals**: Preserve O(n features) map-fit latency for collections carrying pre-computed `bbox`. No new performance ceilings are introduced; FR-010 forbids regression on the common path.
**Constraints**:
- MUST NOT break any existing `import { calculateBounds } from '@debrief/components'` call site (barrel preservation — FR-013).
- MUST NOT introduce `any` or `as`-casts at consumer call sites (Article XV.2).
- MUST NOT add runtime dependencies — the existing `@debrief/utils` dep graph is preserved.
- MUST NOT touch LinkML schema sources (feature is schema-agnostic — see Article II rationale below).
**Scale/Scope**: 1 file deleted (`shared/components/src/utils/bounds.ts`, 215 LOC), 1 file deleted (`shared/components/src/utils/bounds.test.ts`), 1 file grown (`shared/utils/src/bounds.ts`, +~150 LOC), 1 test file grown (`shared/utils/tests/bounds.test.ts`, +~130 LOC of migrated assertions + 1 new fast-path test), 3 consumer imports updated (`MapView.tsx`, `LeafletToolbar.tsx`, `useBrowserFilter.ts`), 1 barrel re-export path updated (`shared/components/src/index.ts`). Net delta: ~±50 LOC after consolidation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applicable | Compliance |
|---------|------------|------------|
| I — Defence-Grade Reliability | Yes — FR-019/020/021 mandate byte-identical output; no silent failure. | ✅ Pass. |
| II — Schema Integrity | Yes — feature touches code that consumes LinkML-generated types (`DebriefFeature`, `ViewportPolygon`). | ✅ Pass: no hand-written schema types are introduced; `ViewportPolygon` is consumed from `@debrief/schemas` at its canonical source. FR-018 forbids re-exporting LinkML types from the unified module. |
| III — Data Sovereignty | N/A — no data transformations, no provenance records, no storage. | ✅ Pass (trivial). |
| IV — Architectural Boundaries | Yes — `@debrief/utils` is a shared library, consumed by both services and frontends. | ✅ Pass: module remains UI-agnostic (pure functions, returns data). |
| V — Extensibility | N/A — not an extension point. | ✅ Pass (trivial). |
| VI — Testing | Yes — FR-011 and FR-014 mandate test migration + one new test. | ✅ Pass: zero net loss of assertions (SC-003); one net gain (fast-path test). |
| VII — Test-Driven AI Collaboration | Yes — acceptance scenarios in spec are executable assertions. | ✅ Pass: every FR maps to a vitest assertion or a structural grep (SC-001, SC-002). |
| VIII — Documentation | Yes — FR-017 mandates module-level documentation naming the supported type families. | ✅ Pass: quickstart.md + in-module doc comment satisfy this. |
| IX — Dependencies | Yes — `@debrief/utils` may take a new `@debrief/schemas` dep for `ViewportPolygon`. | ✅ Pass: `@debrief/schemas` is already transitively present; the addition of one typed import at a workspace-local package imposes no external-registry risk. Research R-003 documents the alternative (structural redeclaration) and its trade-offs. |
| X — Security | N/A — no secrets, no network, no classified data. | ✅ Pass (trivial). |
| XI — Internationalisation | N/A — no user-facing strings. | ✅ Pass (trivial). |
| XII — Community Engagement | Yes — planning post + LinkedIn draft are part of this feature's output. | ✅ Pass: Phase 2 produces both. |
| XIII — Contribution Standards | Yes — atomic commits, CI green. | ✅ Pass: task breakdown (generated by `/speckit.tasks`) will enforce this. |
| XIV — Pre-Release Freedom | Yes — this refactor is permitted by Article XIV (breaking changes pre-v4.0.0). | ✅ Pass — but this feature is explicitly non-breaking at call sites (FR-013, SC-006). |
| XV — Strict Type Safety | Yes — unified module's input type MUST accept three families without `any` / `as`. | ✅ Pass: the existing structural-minimum `BoundsInputFeature` already satisfies this. FR-016 pins the behaviour; research R-002 documents the verification. No new `any` introduced. The pre-computed-`bbox` fast-path MUST use typed narrowing (not `as any`) — research R-004 pins the pattern. |

**Overall gate**: ✅ **PASS** — zero violations, zero justifications needed, Complexity Tracking table remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/219-unify-bounds-utilities/
├── plan.md              # This file
├── research.md          # Phase 0 output (R-001 … R-005)
├── data-model.md        # Phase 1 output — BoundsInputFeature, Bounds, ViewportPolygon
├── quickstart.md        # Phase 1 output — how to consume the unified module
├── contracts/           # Phase 1 output — public surface of the unified module
│   └── bounds-module.md
├── checklists/
│   └── requirements.md  # From /speckit.specify — already present
└── tasks.md             # Phase 2 output (from /speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/
├── utils/
│   ├── src/
│   │   ├── bounds.ts              # ← unified module (grows from 4 to 9 public functions)
│   │   ├── types.ts               # exports Bounds (unchanged)
│   │   └── index.ts               # adds 5 new re-exports (expandBounds, isPointInBounds, bboxOverlapsViewport, viewportToBounds, filterBySpatialExtent)
│   └── tests/
│       └── bounds.test.ts         # absorbs migrated tests from shared/components + new fast-path test
└── components/
    ├── src/
    │   ├── index.ts               # barrel: keep re-exporting the 4 symbols but from @debrief/utils
    │   ├── utils/
    │   │   ├── bounds.ts          # ← DELETED by this feature
    │   │   ├── bounds.test.ts     # ← DELETED by this feature
    │   │   └── __tests__/
    │   │       └── utils.test.ts  # calculateBounds/expandBounds/isPointInBounds blocks removed (migrated to shared/utils/tests/)
    │   ├── MapView/
    │   │   ├── MapView.tsx        # ← import path updated to @debrief/utils
    │   │   └── LeafletToolbar/
    │   │       └── LeafletToolbar.tsx  # ← import path updated to @debrief/utils
    │   └── StacBrowser/
    │       └── useBrowserFilter.ts     # ← import path updated to @debrief/utils
    └── package.json              # ensure @debrief/utils dep is declared (it likely already is)
```

**Structure Decision**: This is a pure-refactor feature operating entirely inside the existing pnpm workspace. No new packages, no new directories, no new apps. The change is additive to `shared/utils/` (grows) and subtractive from `shared/components/` (shrinks). Test files follow the existing test-collocation convention of each package: `@debrief/utils` keeps tests in `shared/utils/tests/`, `@debrief/components` keeps tests in `shared/components/src/utils/__tests__/` and co-located `*.test.ts`. The `shared/components` barrel (`src/index.ts`) acts as a compatibility shim so no external consumer's import statement changes.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| — | — | — | — |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook
- [ ] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

**Storybook Link**: N/A

**None — backend/infrastructure feature.** This is a pure-code consolidation of utility functions. `MapView` and `StacBrowser` (the indirect consumers) have existing Storybook stories but their visible behaviour is explicitly unchanged by this feature (FR-019, FR-020, FR-021); bundling them as "demos of this feature" would misrepresent the work. The planning post and LinkedIn summary will therefore be text-only with a short code diff.

## Storybook E2E Testing

**None — no interactive UI components.** This feature has no UI surface of its own. The existing `MapView` and `StacBrowser` Storybook stories and E2E tests continue to exercise the migrated consumers end-to-end; no new story or E2E spec is added. SC-004 mandates `task verify` (which includes those existing E2E suites) passes on the feature branch as the regression gate.

## VS Code Webview E2E Testing

**None — no extension workflow changes.** The VS Code extension's `mapPanel.ts` already imports `calculateBounds` / `mergeBounds` from `@debrief/utils` and is **not** a consumer of `shared/components/src/utils/bounds.ts`. No extension behaviour changes; no new webview E2E test is added.

## Complexity Tracking

*Constitution Check passed with zero violations. No entries required.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Post-Design Constitution Re-check

*Re-evaluated after Phase 1 design artifacts were written.*

All 15 articles remain satisfied. Phase 1 design strengthens compliance in three places:

- **Article II (Schema Integrity)** — Research R-003 pins `ViewportPolygon` as a type-only import from `@debrief/schemas`; no redeclaration. Data-model.md §3 confirms no LinkML change.
- **Article VI / VII (Testing)** — Contract §"Contract test manifest" enumerates every test file (new / modified / deleted) with its purpose; every FR is traceable to a concrete test.
- **Article XV (Strict Type Safety)** — Research R-004 pins the `bbox` fast-path access pattern: extend `BoundsInputFeature`, use the new `isValidBboxTuple` type predicate, zero `as`, zero `any`. Contract CB-7 adds a compile-time type-test file (`bounds.types.test-d.ts`) to enforce FR-016 at CI time.

No new Complexity Tracking entries. Ready for `/speckit.tasks`.
