# Tasks: Unify `shared/components` bounds utilities with `@debrief/utils`

**Feature**: 219-unify-bounds-utilities
**Branch**: `219-unify-bounds-utilities`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/bounds-module.md](./contracts/bounds-module.md)

## Evidence Requirements

**Evidence Directory**: `specs/219-unify-bounds-utilities/evidence/`
**Media Directory**: `specs/219-unify-bounds-utilities/media/`

### Planned Artifacts

This is a **Library/SDK + Schema-adjacent** feature (code-refactor touching LinkML-typed inputs). Evidence targets the library-code rubric: test summary, usage example, and before/after code samples proving consolidation. No UI screenshots — no visible UI surface changes (FR-019 / FR-020 / FR-021 forbid any observable change at consumers).

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest pass/fail summary for `shared/utils/tests/bounds.test.ts` + `bounds.types.test-d.ts`, with counts of migrated vs. net-new assertions. Uses template from `.specify/templates/evidence/test-summary-template.md`. | After all Phase 3–5 tests pass |
| `evidence/usage-example.md` | Minimal `calculateBounds` call with `DebriefFeature[]` + `SafeFeature[]` + `GeoJSONFeature[]`, showing each one type-checks and produces correct output. Includes a fast-path / slow-path side-by-side. | After Phase 5 complete |
| `evidence/before-after.md` | Three file-diff fragments: (a) before/after `shared/utils/src/bounds.ts` public surface, (b) deleted `shared/components/src/utils/bounds.ts` summary (LOC, function count), (c) `shared/components/src/index.ts` barrel diff showing zero consumer-visible rename. | After Phase 6 evidence-collection step |
| `evidence/consolidation-metrics.md` | Ledger: single-canonical-implementation count (SC-001/SC-002 grep output), consumer-churn count (SC-006 grep output), test-assertion-delta (SC-003). | After all Phase 3–5 tests pass |
| `evidence/dep-graph-check.md` | Output of `pnpm why @debrief/utils` from `shared/schemas/` confirming no cycle introduced by the new `@debrief/schemas` dep (R-003). | After Phase 1 T006 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog post — **already created during `/speckit.plan`** | ✅ Complete |
| `media/linkedin-planning.md` | LinkedIn planning summary — **already created during `/speckit.plan`** | ✅ Complete |
| `media/shipped-post.md` | Shipped blog post celebrating consolidation + fast-path ship | During Phase 6 (Polish) |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | During Phase 6 (Polish) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + media | Final task (Phase 6) |
| Blog PR | PR in `debrief.github.io` publishing the shipped post | Triggered by `/speckit.pr` |

## Phase 1: Setup

**Goal**: Prepare `@debrief/utils` to host the five migrated helpers. Add the type-only dep on `@debrief/schemas`, confirm no package-cycle is created, and create evidence directories.

- [ ] T001 Add `"@debrief/schemas": "workspace:*"` to the `dependencies` block of `shared/utils/package.json` (per research R-003 — enables the `ViewportPolygon` type import). File: `shared/utils/package.json`
- [ ] T002 Run `pnpm install` at repo root to refresh the workspace lockfile after T001. No file edit — but captures output for T006.
- [ ] T003 [P] Create evidence directory stub `specs/219-unify-bounds-utilities/evidence/.gitkeep` so subsequent evidence tasks have a target path. File: `specs/219-unify-bounds-utilities/evidence/.gitkeep`
- [ ] T004 [P] Confirm `shared/components/package.json` already declares `"@debrief/utils": "workspace:*"` in `dependencies` (not just `peerDependencies` / transitive). If missing, add it — barrel re-export of `@debrief/utils` symbols requires an explicit dep. File: `shared/components/package.json`
- [ ] T005 [P] Verify `shared/utils/src/index.ts` currently has a clean barrel shape that can absorb 5 new re-exports without reorganisation. Read-only inspection; no edit. File: `shared/utils/src/index.ts`
- [ ] T006 Generate dep-cycle check evidence: run `pnpm why @debrief/utils` from `shared/schemas/` and confirm no reverse edge exists; capture output in `specs/219-unify-bounds-utilities/evidence/dep-graph-check.md`. File: `specs/219-unify-bounds-utilities/evidence/dep-graph-check.md`

**Parallel within Phase 1**: `[T003, T004, T005]` can run concurrently after T002. T006 depends on T001–T002 (dep must be installed).

**Phase-1 gate**: `pnpm install` succeeds; `pnpm --filter @debrief/utils build` still succeeds (no type regressions from adding the dep edge).

## Phase 2: Foundation

**Goal**: Land the type-system plumbing every user story depends on — the extended `BoundsInputFeature` shape, the new `isValidBboxTuple` narrowing helper, and the `ViewportPolygon` type import. These are **internal** changes (module-private) that prepare the unified module for the five migrated helpers without yet changing any external behaviour.

- [ ] T007 [test] Write failing test asserting `isValidBboxTuple([NaN, 0, 10, 10])` returns `false`, `isValidBboxTuple([0, 0, 10, 10])` returns `true`, `isValidBboxTuple([1, 2, 3])` returns `false` (length check), `isValidBboxTuple('not-an-array')` returns `false`, and `isValidBboxTuple(null)` returns `false`. This test MUST fail at T007 (helper not yet implemented). File: `shared/utils/tests/bounds.test.ts`
- [ ] T008 Extend `BoundsInputFeature` in `shared/utils/src/bounds.ts` to include `bbox?: Bounds | null | undefined`. Confirm the top-of-file JSDoc explains *why* (R-004: lets fast-path read `feature.bbox` without an `as`-cast). File: `shared/utils/src/bounds.ts`
- [ ] T009 Implement the private `isValidBboxTuple(value: unknown): value is Bounds` narrowing helper in `shared/utils/src/bounds.ts`. Per R-002: returns `true` iff `Array.isArray(value) && value.length >= 4 && [0,1,2,3].every(i => Number.isFinite(value[i]))`. No `as`, no `any`. File: `shared/utils/src/bounds.ts`
- [ ] T010 Re-run T007 tests — MUST now pass. No file edit; this is a verification task against T009.
- [ ] T011 Add `import type { ViewportPolygon } from '@debrief/schemas';` near the top of `shared/utils/src/bounds.ts` (used later in Phase 3 by `viewportToBounds`). Confirm `tsc --noEmit` on `shared/utils/` still succeeds. File: `shared/utils/src/bounds.ts`
- [ ] T012 Add the top-of-file module doc comment block per FR-017: name the three supported external feature-type families (`DebriefFeature`, `SafeFeature`, `GeoJSONFeature`) and state that the input type is a structural minimum so the module remains decoupled from the LinkML `DebriefFeature` schema. File: `shared/utils/src/bounds.ts`

**Parallel within Phase 2**: None — each task either edits `shared/utils/src/bounds.ts` directly or gates on a prior edit there.

**Phase-2 gate**: `pnpm --filter @debrief/utils test` and `pnpm --filter @debrief/utils typecheck` pass. All nine existing helpers still produce byte-identical output on the existing test suite (no regression). T007's new tests pass.

## Phase 3: User Story 1 — Single canonical bounds module (P1)

**Story goal** (from spec.md): A developer can import every bounds-related helper from a single package (`@debrief/utils`) and get consistent behaviour regardless of feature-type family. Delete the duplicate at `shared/components/src/utils/bounds.ts`; migrate the five helpers and their tests; update the three direct consumers; preserve the `@debrief/components` barrel.

**Independent test criterion**: Delete `shared/components/src/utils/bounds.ts` and run `task verify` — all previously-passing tests (MapView, LeafletToolbar, StacBrowser) continue to pass; the `@debrief/components` barrel still re-exports the four expected symbols.

### Tests (migrate + new type-level)

- [ ] T013 [test] Copy the `viewportToBounds` / `bboxOverlapsViewport` / `filterBySpatialExtent` describe blocks verbatim from `shared/components/src/utils/bounds.test.ts` into `shared/utils/tests/bounds.test.ts`; update imports to `../src/bounds.js` or equivalent. Per research R-005 — verbatim copy, zero rewriting. File: `shared/utils/tests/bounds.test.ts`
- [ ] T014 [test] Copy the `calculateBounds` / `expandBounds` / `isPointInBounds` describe blocks from `shared/components/src/utils/__tests__/utils.test.ts` into `shared/utils/tests/bounds.test.ts`. Drop any assertions that duplicate coverage already present in `shared/utils/tests/bounds.test.ts` (e.g. plain `calculateBounds` Point/LineString tests already present there). Document per R-005: "T013/T014 drop N duplicates" in task comments. File: `shared/utils/tests/bounds.test.ts`
- [ ] T015 [test] Tests migrated in T013/T014 MUST fail at this point (the helpers they exercise do not yet exist on `@debrief/utils`). This is the RED phase. Verification task — no file edit.

### Migrate helpers

- [ ] T016 Port `expandBounds(bounds, paddingPercent = 0.1)` from `shared/components/src/utils/bounds.ts` into `shared/utils/src/bounds.ts`. Preserve the signature and body byte-for-byte (FR-002 / EB-1/EB-2/EB-3). Export from the module. File: `shared/utils/src/bounds.ts`
- [ ] T017 Port `isPointInBounds(lon, lat, bounds)` from `shared/components/src/utils/bounds.ts` into `shared/utils/src/bounds.ts`. Preserve signature and body byte-for-byte (FR-003 / PIB-1..3). File: `shared/utils/src/bounds.ts`
- [ ] T018 Port `bboxOverlapsViewport(itemBbox, viewportBbox)` from `shared/components/src/utils/bounds.ts` into `shared/utils/src/bounds.ts`, preserving antimeridian-handling logic byte-for-byte (FR-004 / BOV-1..6). File: `shared/utils/src/bounds.ts`
- [ ] T019 Port `viewportToBounds(viewport: ViewportPolygon)` from `shared/components/src/utils/bounds.ts` into `shared/utils/src/bounds.ts`. Preserve object-form `{ longitude, latitude }` coordinate handling and the `Math.min(...lons)` spread pattern (FR-005 / VTB-1..4). File: `shared/utils/src/bounds.ts`
- [ ] T020 Port `filterBySpatialExtent<T extends { bbox: Bounds | null }>(items, viewportBbox)` from `shared/components/src/utils/bounds.ts` into `shared/utils/src/bounds.ts`, preserving the generic constraint exactly (FR-006 / FBSE-1..3). File: `shared/utils/src/bounds.ts`
- [ ] T021 Add the five new exports (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`) to the `shared/utils/src/index.ts` barrel. File: `shared/utils/src/index.ts`
- [ ] T022 Re-run the test suite: all tests migrated in T013/T014 MUST pass (GREEN phase). No file edit.

### Migrate consumers

- [ ] T023 [P] Update `shared/components/src/MapView/MapView.tsx` — change `import { calculateBounds, expandBounds } from '../utils/bounds'` (or similar) to `import { calculateBounds, expandBounds } from '@debrief/utils'`. Where `calculateBounds` is passed a `DebriefFeatureCollection`, unwrap to `.features` at the call site (contract CB-7 caveat). File: `shared/components/src/MapView/MapView.tsx`
- [ ] T024 [P] Update `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` — change the `expandBounds` import to `from '@debrief/utils'`. File: `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T025 [P] Update `shared/components/src/StacBrowser/useBrowserFilter.ts` — change the `viewportToBounds` / `bboxOverlapsViewport` imports to `from '@debrief/utils'`. File: `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T026 Update the `shared/components/src/index.ts` barrel: replace the `from './utils/bounds'` re-exports (`calculateBounds`, `bboxOverlapsViewport`, `filterBySpatialExtent`, `viewportToBounds`) with `from '@debrief/utils'` re-exports. Do NOT re-export `expandBounds` or `isPointInBounds` — per contract §"Barrel re-export". File: `shared/components/src/index.ts`

### Delete duplicate

- [ ] T027 Delete `shared/components/src/utils/bounds.ts` (215 LOC, 6 helpers all now hosted on `@debrief/utils`). File: `shared/components/src/utils/bounds.ts` — DELETED
- [ ] T028 Delete `shared/components/src/utils/bounds.test.ts` (its assertions absorbed by T013). File: `shared/components/src/utils/bounds.test.ts` — DELETED
- [ ] T029 Edit `shared/components/src/utils/__tests__/utils.test.ts`: remove the `calculateBounds` / `expandBounds` / `isPointInBounds` describe blocks (absorbed by T014). Leave any unrelated assertions in the file intact. File: `shared/components/src/utils/__tests__/utils.test.ts`

### Verification

- [ ] T030 Run `pnpm --filter @debrief/components test` — all tests pass without reference to the deleted `bounds.ts`. No file edit.
- [ ] T031 Run `pnpm --filter @debrief/utils test` — all tests pass including the newly-migrated blocks. No file edit.
- [ ] T032 Run repo-wide grep `grep -rn "from '.*/utils/bounds'" shared/ apps/ services/` and confirm zero matches outside `shared/utils/` itself (FR-015). No file edit — verification.
- [ ] T033 Run `task verify` (lint + typecheck + unit + E2E) and confirm green (FR-020 / FR-021 regression gate — MapView fit-to-selection and StacBrowser spatial filter continue producing identical output).

**Parallel within Phase 3**: `[T023, T024, T025]` — three consumer updates edit disjoint files. All other tasks are sequential (they share `shared/utils/src/bounds.ts` or gate on prior green tests).

**Checkpoint**: At end of Phase 3, Story 1 is independently deliverable. `calculateBounds` exists exactly once in the repo (SC-001, SC-002) and zero external consumer imports changed (SC-006). Phase 3 alone could ship; Phases 4 and 5 are additive.

## Phase 4: User Story 2 — Pre-computed `bbox` fast-path (P2)

**Story goal** (from spec.md): When `calculateBounds` receives features carrying a valid pre-computed `feature.bbox`, it honours the bbox and skips the per-feature coordinate walk. Preserves O(n features) map-fit latency for STAC-style collections and absorbs backlog #211.

**Independent test criterion**: Pass an array where each feature has `bbox` and `geometry.coordinates` describing mutually-inconsistent extents; the result matches the `bbox`-derived extent (proving the fast-path was taken, not the slow coordinate walk).

### Tests first (RED)

- [ ] T034 [test] Add a new `describe('calculateBounds — pre-computed bbox fast-path', ...)` block to `shared/utils/tests/bounds.test.ts` covering (per contract CB-4 / CB-5): (a) valid `bbox = [0, 0, 5, 5]` with inconsistent `geometry.coordinates = [[-100, -100]]` → result is `[0, 0, 5, 5]` (fast-path taken); (b) mixed array — some features with valid bbox, some without — correct merged extent; (c) `bbox = [NaN, 0, 10, 10]` → fall back to coordinate walk (no throw); (d) `bbox = [1, 2, 3]` (length < 4) → fall back; (e) `bbox = null` → fall back; (f) `bbox = undefined` → fall back. Tests MUST fail at this point. File: `shared/utils/tests/bounds.test.ts`
- [ ] T035 [test] Confirm the common-path regression test (no `bbox` anywhere in the input) still passes — this guards FR-010 / CB-6. No file edit — verification that the previously-green tests from Phase 3 T031 remain green.

### Implement fast-path

- [ ] T036 Modify the `calculateBounds` body in `shared/utils/src/bounds.ts`: inside the `for (const feature of features)` loop, after the `null`-geometry guard, add a branch: `if (feature.bbox !== undefined && feature.bbox !== null && isValidBboxTuple(feature.bbox)) { /* merge bbox into accumulator, then continue */ }`. The branch uses ONLY typed field access — no `as`, no `any`, leverages the extended `BoundsInputFeature` shape from T008. Per R-004. File: `shared/utils/src/bounds.ts`
- [ ] T037 Run T034 tests — MUST now pass (GREEN). No file edit.
- [ ] T038 Run the complete `pnpm --filter @debrief/utils test` suite — all tests (existing + migrated in Phase 3 + new fast-path in T034) pass. No file edit.

### Consumer verification (no code changes expected)

- [ ] T039 Run `task verify` — MapView `fitToSelection` on a `DebriefFeatureCollection` whose features carry pre-computed `bbox` produces identical visual output as before (FR-020 regression guard). No file edit.
- [ ] T040 Run `pnpm --filter @debrief/utils lint` — specifically confirm zero new `any` / `as` occurrences in `shared/utils/src/bounds.ts` (Article XV compliance). No file edit — verification.

**Parallel within Phase 4**: None — all tasks serialise on edits to `shared/utils/src/bounds.ts` or on its tests.

**Checkpoint**: At end of Phase 4, Story 2 is independently deliverable and closes backlog #211. The fast-path is proven by test to take precedence over coordinate walk; common-path behaviour is unchanged.

## Phase 5: User Story 3 — Feature-type reconciliation documented and non-breaking (P3)

**Story goal** (from spec.md): A developer reading the unified module can tell which feature-type families it accepts (`DebriefFeature`, `SafeFeature`, `GeoJSONFeature`), and can pass any of them without type errors. Produces no new runtime behaviour — only compile-time guarantees + documentation.

**Independent test criterion**: A `.test-d.ts` file with `expectTypeOf` assertions compiles successfully, proving all three families assign to `calculateBounds`'s input type without casts (FR-016 / contract CB-7).

### Compile-time type tests

- [ ] T041 [test] Create `shared/utils/tests/bounds.types.test-d.ts` with `expectTypeOf` assertions (using `vitest`'s built-in `expectTypeOf` or `vite-plugin-typescript-test-files` equivalent — mirror whatever convention is in use elsewhere in `shared/utils/tests/`; if none exists, use plain `// @ts-expect-error` / satisfies-pattern assertions). Cover: (a) `DebriefFeature[]` assigns to `calculateBounds` parameter; (b) `SafeFeature[]` assigns; (c) `GeoJSONFeature[]` assigns; (d) `BoundsInputFeature[]` assigns; (e) a FeatureCollection-like `{ features: DebriefFeature[] }` does NOT assign (contract CB-7 caveat — callers unwrap). File: `shared/utils/tests/bounds.types.test-d.ts`
- [ ] T042 Run `pnpm --filter @debrief/utils typecheck` — T041's file compiles without errors. Verification — no file edit.

### Documentation

- [ ] T043 Confirm the module doc block written in T012 still correctly lists the three supported families and explains the structural-minimum rationale (per FR-017). Amend if Phase 4's fast-path edits displaced any text. File: `shared/utils/src/bounds.ts`
- [ ] T044 [P] Verify that `shared/utils/src/bounds.ts` does NOT re-export `DebriefFeature`, `SafeFeature`, `GeoJSONFeature`, or `ViewportPolygon` (FR-018 guard). Verification task — run `grep -E 'export (type )?(DebriefFeature|SafeFeature|GeoJSONFeature|ViewportPolygon)' shared/utils/src/bounds.ts` and confirm zero matches. File: `shared/utils/src/bounds.ts`

### Consumer type-check (no code changes expected)

- [ ] T045 Run `pnpm -r typecheck` — confirms that `MapView`, `LeafletToolbar`, `useBrowserFilter`, and every downstream consumer of `@debrief/components` barrel still type-checks without the introduction of `as` or `any` at consumer call sites (FR-016 / SC-006 regression guard). No file edit.

**Parallel within Phase 5**: `[T044]` is a verification-only task and runs concurrently with T043's edit of the same file (serialise against T043 if T043 actually edits; otherwise `[T043, T044]` can share the phase).

**Checkpoint**: At end of Phase 5, Story 3 is independently deliverable. The type contract is enforced by a compile-time test file — silent regressions (e.g. a future edit that narrows the input type and breaks `SafeFeature` pass-through) will now fail CI.

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Capture evidence, produce shipped-post media, and create the feature PR. No new code lands in this phase.

### Evidence Collection

- [ ] T046 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) in `specs/219-unify-bounds-utilities/evidence/test-summary.md`. YAML front matter MUST include: `feature: 219-unify-bounds-utilities`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body MUST include: vitest pass counts for `shared/utils/tests/bounds.test.ts` + `shared/utils/tests/bounds.types.test-d.ts`, count of migrated-verbatim vs. net-new assertions (per R-005 ledger), and key scenarios verified (SC-001 through SC-007). File: `specs/219-unify-bounds-utilities/evidence/test-summary.md`
- [ ] T047 Create usage demonstration in `specs/219-unify-bounds-utilities/evidence/usage-example.md` showing: (a) minimal `calculateBounds` import + call on `DebriefFeature[]`, (b) same call on `SafeFeature[]`, (c) same call on `GeoJSONFeature[]`, (d) fast-path example (features carrying `bbox`) side-by-side with slow-path (no `bbox`). Each example shows expected output comment. File: `specs/219-unify-bounds-utilities/evidence/usage-example.md`
- [ ] T048 [P] Capture before/after file-diff evidence in `specs/219-unify-bounds-utilities/evidence/before-after.md`: (a) before/after `shared/utils/src/bounds.ts` public surface (4 → 9 exports), (b) deleted `shared/components/src/utils/bounds.ts` summary (LOC, function count), (c) `shared/components/src/index.ts` barrel diff proving zero consumer-visible rename. File: `specs/219-unify-bounds-utilities/evidence/before-after.md`
- [ ] T049 [P] Capture consolidation metrics in `specs/219-unify-bounds-utilities/evidence/consolidation-metrics.md`: output of `grep -rn "export function calculateBounds\|export const calculateBounds" shared/ apps/ services/` (SC-002, expect 1 match), output of `grep -rn "from '.*/utils/bounds'" shared/ apps/ services/` (SC-001/FR-015, expect 0 matches outside `shared/utils/`), and consumer-churn count (SC-006, expect 0 external-consumer import changes). File: `specs/219-unify-bounds-utilities/evidence/consolidation-metrics.md`

### Media Content

- [ ] T050 Spawn Content Specialist via Task tool (agent definition at `.claude/agents/media/content.md`) to create the shipped blog post at `specs/219-unify-bounds-utilities/media/shipped-post.md`. Provide context: feature name + goal, what was built (9 helpers consolidated, fast-path absorbed, 215 LOC deleted, zero consumer churn), lessons learned (structural subtyping as the workaround for three-family reconciliation; fast-path is strictly additive), what's next (backlog items #212 LinkML-generated SafeFeature/GeoJSONFeature and #214 drift-prevention remain independent). File: `specs/219-unify-bounds-utilities/media/shipped-post.md`
- [ ] T051 [P] Create LinkedIn shipped summary at `specs/219-unify-bounds-utilities/media/linkedin-shipped.md` — 150–200 words, strong hook (not "we consolidated bounds utilities"), link placeholder `{{BLOG_POST_URL}}`, 2–3 tags max. File: `specs/219-unify-bounds-utilities/media/linkedin-shipped.md`

### PR Creation

- [ ] T052 Create PR and publish blog: run `/speckit.pr`. This task MUST run last. It depends on all Phase 1–6 evidence, media, and code tasks being complete; creates the feature PR in `debrief-future` and publishes `shipped-post.md` to `debrief.github.io`.

**Parallel within Phase 6**: `[T048, T049]` can run concurrently after T046/T047 (both edit new files). `[T050, T051]` can run concurrently after evidence is collected. T052 MUST run last.

**Task T052 must run last. It depends on all evidence and media tasks being complete.**

## Dependencies

### Phase-level dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation: type plumbing)
    ↓
Phase 3 (US1: migrate helpers + delete duplicate)  ─── independently shippable
    ↓
Phase 4 (US2: fast-path)                           ─── independently shippable (additive)
    ↓
Phase 5 (US3: compile-time type tests + docs)       ─── independently shippable (additive)
    ↓
Phase 6 (Polish: evidence + media + PR)
```

### Story-level order

**Story 1 (P1) → Story 2 (P2) → Story 3 (P3)** is the recommended delivery sequence but not strictly mandatory:

- **Story 1 (Phases 1–3)** is a prerequisite — Stories 2 and 3 operate on the unified module Story 1 creates.
- **Story 2 (Phase 4)** adds the fast-path to the unified module. Story 3 does not depend on Story 2 being complete, but running Story 2 first keeps the type-test (T041) writing against the final public behaviour.
- **Story 3 (Phase 5)** can be deferred to a follow-up PR if the team wants to split delivery; FR-016 is still enforced at runtime by structural subtyping even without T041.

### Task-level critical edges

- **T002 → T006**: dep-install must complete before `pnpm why` check.
- **T007 → T009 → T010**: test-first pattern for `isValidBboxTuple` (RED → implement → GREEN).
- **T008 + T009 → T011**: `BoundsInputFeature` extension + narrowing helper must land before `ViewportPolygon` import to avoid transient compile errors.
- **T011 → T019**: `viewportToBounds` port relies on the `ViewportPolygon` import.
- **T013/T014 → T015 (RED) → T016–T020 (implement) → T022 (GREEN)**: full TDD loop for the five migrated helpers.
- **T016–T020 → T021**: barrel updates must follow function implementations.
- **T021 → T023/T024/T025**: consumers can only import from `@debrief/utils` once the symbols exist there.
- **T023/T024/T025 + T026 → T027/T028/T029**: the delete MUST happen after every consumer has migrated (otherwise build breaks).
- **T027 → T032**: grep verification runs against the post-delete tree.
- **T008 (extended `BoundsInputFeature`) → T036**: fast-path branch can only be implemented after the shape extension.
- **T036 → T040**: lint verification runs against the completed fast-path code.
- **T046–T051 → T052**: PR creation runs last.

### External dependencies (blocked/blocks)

- **Absorbs**: backlog item #211 (pre-computed bbox fast-path). This feature closes it — reviewer closes #211 at merge.
- **Does not depend on**: #212 (LinkML-generated `SafeFeature`/`GeoJSONFeature`) — R-001 documents the sidestep.
- **Does not interact with**: #214 (drift-prevention lint — already shipped; covers `apps/*/src/utils/bounds.ts` only).

### File-level edit concurrency

| File | Edited by tasks | Notes |
|------|-----------------|-------|
| `shared/utils/src/bounds.ts` | T008, T009, T011, T012, T016, T017, T018, T019, T020, T036, T043 | Heavy serialisation point — single author per run |
| `shared/utils/src/index.ts` | T021 | Single touch |
| `shared/utils/tests/bounds.test.ts` | T007, T013, T014, T034 | Serial; each task appends a describe block |
| `shared/utils/tests/bounds.types.test-d.ts` | T041 | New file |
| `shared/components/src/index.ts` | T026 | Single touch |
| `shared/components/src/MapView/MapView.tsx` | T023 | `[P]` with T024/T025 |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` | T024 | `[P]` with T023/T025 |
| `shared/components/src/StacBrowser/useBrowserFilter.ts` | T025 | `[P]` with T023/T024 |
| `shared/components/src/utils/bounds.ts` | T027 (delete) | |
| `shared/components/src/utils/bounds.test.ts` | T028 (delete) | |
| `shared/components/src/utils/__tests__/utils.test.ts` | T029 (edit — remove blocks) | |

## Implementation Strategy

### Incremental delivery

This feature is **sliceable into three independently-shippable PRs** if the team prefers smaller review units, or **one PR** if the team prefers to land everything atomically. The recommended default is **one PR** because the three stories share a single file (`shared/utils/src/bounds.ts`) and splitting would create merge-conflict overhead disproportionate to the review benefit.

| Slice option | Contents | LOC touched | Reviewable in |
|--------------|----------|-------------|---------------|
| A — Atomic (default) | Phases 1–6 in one PR | ~350 LOC | ~30 min |
| B — Two-PR split | PR1: Phases 1–3 (migration). PR2: Phases 4–6 (fast-path + type tests + polish). | ~200 + ~150 LOC | ~20 min each |
| C — Three-PR split | PR1: P1 (migration). PR2: P2 (fast-path). PR3: P3 (type tests) + polish. | ~200 + ~80 + ~70 LOC | ~15 min each |

**Recommendation**: Slice A unless review load is a concern. Slice B is the fallback if the reviewer wants to land the migration without the behavioural addition of the fast-path.

### TDD loop (RED → GREEN)

Every code task has a test-first counterpart. The Phase 3 migration uses verbatim test copies (R-005) rather than authored-fresh assertions — preserving FR-019's byte-identical-output guarantee without risk of assertion drift.

| TDD pair | RED task | GREEN task |
|----------|----------|------------|
| `isValidBboxTuple` | T007 | T009 (verified by T010) |
| Migrated helpers | T013, T014, T015 | T016–T020 (verified by T022) |
| Fast-path | T034 | T036 (verified by T037) |
| Type-level contract | T041 | (implicit — already enforced by T008's `BoundsInputFeature` extension) |

### Parallel opportunities

- **Phase 1**: T003, T004, T005 run concurrently after T002 (disjoint files, all optional sanity checks).
- **Phase 3**: T023, T024, T025 — three consumer updates on disjoint files. Most valuable parallelism in the feature.
- **Phase 6**: T048/T049 (evidence files) and T050/T051 (media files) run concurrently in pairs.

All other tasks serialise on edits to `shared/utils/src/bounds.ts` or gate on prior green tests.

### Constitution-check mid-flight

Two points in the implementation where Constitution compliance MUST be re-verified before proceeding:

1. **After T036** (fast-path implementation): T040 enforces Article XV — zero new `any` / `as` in `shared/utils/src/bounds.ts`. If T040 fails, roll back T036 and re-implement using the extended `BoundsInputFeature` shape (per R-004).
2. **After T033** (Phase 3 regression gate): If `task verify` fails — in particular if any MapView or StacBrowser E2E test fails — the fix is NOT to adjust the unified module's behaviour. The fix is to adjust the consumer call site that relies on the deprecated `DebriefFeatureCollection` input form (contract CB-7 caveat). FR-019 forbids behavioural changes to the module.

### Rollback-safety points

Three "cliffs" where the feature is in a partially-landed state with build implications:

- **After T021 (barrel updated) but before T023–T025 (consumers migrated)**: build is still green because consumers still import from `../utils/bounds`. Safe interrupt.
- **After T023–T025 (consumers migrated) but before T027 (delete)**: both copies exist; `@debrief/components` has duplicate re-exports (one from local, one from `@debrief/utils`). **Unsafe** — barrel re-exports would conflict. T026 MUST complete in the same commit as T027 to avoid this.
- **After T027 (delete) but before T032 (grep verification)**: any missed consumer reference would have failed T030 / T031 first. T032 is a belt-and-braces check; failing T032 rolls back to T027's diff.

### Definition of done for the feature

All of the following MUST be true before T052 (PR creation) runs:

1. ✅ `task verify` passes on the feature branch (SC-004).
2. ✅ `grep` evidence confirms one `calculateBounds` implementation (SC-001, SC-002).
3. ✅ `grep` evidence confirms zero consumer-visible import changes outside the three migrated files + barrel (SC-006).
4. ✅ Test summary ledger shows zero net loss of assertions + one net gain (the fast-path test) (SC-003).
5. ✅ `specs/219-unify-bounds-utilities/evidence/` contains all five planned artefacts.
6. ✅ `specs/219-unify-bounds-utilities/media/shipped-post.md` + `linkedin-shipped.md` exist.
7. ✅ No new Complexity Tracking entries added to plan.md during implementation.
