---
description: "Task list for 201-position-style-consolidation"
---

# Tasks: Consolidate ResolvedPositionStyle and Align with Schema

**Input**: Design documents from `/specs/201-position-style-consolidation/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Tests are IN SCOPE for this feature. Every new codepath (null-override semantics, invalid-symbol guard, exhaustive-switch enforcement, enum-parity adherence) gets a unit/adherence test. Existing resolver tests are renamed (5 assertions) and extended (3 new tests) rather than replaced.

**Organization**: Tasks grouped by user story for independent testing. P1 stories (1–3) collapse into one "core type consolidation" phase because they touch the same two files atomically; P2 stories (4–7) are separate phases because they're logically independent; P3 story (8) is a final enum-parity adherence test.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that prove the feature works. Used in the PR description, shipped blog post, and project memory.

**Evidence Directory**: `specs/201-position-style-consolidation/evidence/`
**Media Directory**: `specs/201-position-style-consolidation/media/`

### Feature Type

This is a **Schema Change + Library/SDK** feature (per the Quality Rubric). Evidence must cover:

- Round-trip: LinkML → generated TypeScript → consuming TS call sites type-check.
- Library usage: code example showing the public surface (`ResolvedPositionStyle`, `PointShape`, `resolvePositionStyle`, `InvalidPointShapeError`).
- Rendering parity: position markers draw identically on the shipped sample catalog (SC-004).

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest + adherence results with YAML front matter. | After Polish CI gate |
| `evidence/usage-example.md` | TypeScript code example demonstrating the canonical import paths and the invalid-symbol error handling pattern. | After Phase 6 (US7) |
| `evidence/round-trip-evidence.md` | Round-trip proof: LinkML `PointShapeEnum` → generated TS `PointShape` → assignment test accepts 5 shapes, rejects `'star'`. | After Phase 7 (US6) |
| `evidence/grep-uniqueness.txt` | Terminal output of the grep commands verifying SC-001, SC-003, SC-007, SC-010 (one interface, no `.label` residue, one resolver, enum-parity). | After Phase 6 |
| `evidence/rendering-parity.md` | Playwright E2E summary + spot-check notes from the sample catalog render. | After Polish |
| `evidence/runtime-guard.txt` | vitest output showing `InvalidPointShapeError` thrown with the offending value + valid-set. | After Phase 6 |
| `evidence/schema-adherence.txt` | Output of the new `PointShapeEnum == MarkerSymbolEnum` adherence test. | After Phase 8 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog announcement (expanded-scope version). | Already created during `/speckit.plan` |
| `media/linkedin-planning.md` | LinkedIn planning summary. | Already created during `/speckit.plan` |
| `media/shipped-post.md` | Shipped blog post celebrating completion. | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn shipped summary. | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with evidence-linked description. | Final Polish task (`/speckit.pr`) |
| Blog PR | PR in `debrief.github.io` publishing `shipped-post.md`. | Triggered by `/speckit.pr` |

---

## Phase 1: Setup & Risk De-Risk

> **Purpose**: Confirm the preconditions the plan assumes, and time-box the one high-risk research item (R-011) before committing to its dependent work.

- [x] T001 Verify `PointShapeEnum` is present in `shared/schemas/src/generated/typescript/types.ts` (expect the enum at ~line 70 with values `circle`, `square`, `triangle`, `diamond`, `cross`). No-op if correct; regenerate via `shared/schemas` build if missing. Confirms D-001. `shared/schemas/src/generated/typescript/types.ts`
- [x] T002 [P] Verify workspace deps chain: `@debrief/components` → `@debrief/utils` → `@debrief/schemas`. Read `shared/components/package.json` and `shared/utils/package.json` and confirm the `workspace:*` entries. Confirms D-002. `shared/utils/package.json`
- [x] T003 [P] Audit existing `assertNever` helper: grep `@debrief/utils`, `@debrief/schemas`, and root `shared/` for an existing `function assertNever(value: never)` helper. If one exists, this feature reuses it (A-008); if none, it will be authored in Phase 2 (T010). Record finding in a PR-description note. `shared/utils/src/`
- [x] T004 **R-011 prototype (HIGH RISK — time-box 1 day).** Investigate the schemas build pipeline (`shared/schemas/scripts/` or `shared/schemas/package.json` scripts — inspect first). Prototype a post-process step that, after `gen-typescript` runs, rewrites `symbol: string,` → `symbol: PointShape,` in `shared/schemas/src/generated/typescript/types.ts` for the two attributes on `PositionStyle` and `PositionStyleOverride`, and injects `import type { PointShape } from '@debrief/utils';`. Commit a working proof-of-concept on a scratch branch. If no tractable mechanism is found within the time-box, raise it with the reviewer and renegotiate FR-014 before proceeding to Phase 7. Document the outcome (mechanism chosen, fallback triggered, or renegotiation needed) in `evidence/r011-prototype.md`. `shared/schemas/scripts/`
- [x] T005 [P] Capture the baseline pre-refactor state for SC-004: run `pnpm --filter @debrief/components dev` or the web-shell, open the sample catalog plot `preview/workspace/samples/local-store/` (or the equivalent STAC-backed plot), screenshot the map view at a zoom level that shows position markers with labels. Save to `specs/201-position-style-consolidation/evidence/baseline-rendering.png`. Used for before/after comparison at the Polish phase. `specs/201-position-style-consolidation/evidence/baseline-rendering.png`

**Checkpoint**: Phase 1 complete when PointShapeEnum is verified, dep chain is verified, assertNever presence is known, R-011 prototype has a tractable mechanism (or FR-014 has been renegotiated), and the baseline rendering screenshot exists.

---

## Phase 2: Foundation (Blocking Prerequisites)

> **Purpose**: Introduce the new shared primitives — `PointShape`, `InvalidPointShapeError`, `assertNever` (if not already present), and the module-level `VALID_POINT_SHAPES` Set — that every subsequent phase depends on.
>
> **⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T010 Add `assertNever` helper to `@debrief/utils` (skip if T003 found an existing one and use that instead). Exports a `function assertNever(value: never): never` that throws a descriptive error. `shared/utils/src/assert.ts`
- [x] T011 [P] Add `InvalidPointShapeError` class to `@debrief/utils`. Extends `Error`, carries `offendingValue: string` and `validShapes: readonly string[]` fields; message includes both. Per `contracts/resolved-position-style.ts`. `shared/utils/src/errors.ts`
- [x] T012 Add `PointShape` type alias to `@debrief/utils`: `export type PointShape = \`${PointShapeEnum}\`;` imported from `@debrief/schemas`. Placed alongside the existing `ResolvedPositionStyle` declaration in `types.ts`. Per R-001 and R-010. `shared/utils/src/types.ts`
- [x] T013 Add module-level `VALID_POINT_SHAPES` Set to `shared/utils/src/interval.ts` (R-009): `const VALID_POINT_SHAPES = new Set<string>(Object.values(PointShapeEnum));`. Declared once at module scope, used by the runtime guard in Phase 6. `shared/utils/src/interval.ts`
- [x] T014 [P] Update `@debrief/utils` barrel export in `shared/utils/src/index.ts`: export `PointShape` (type), `InvalidPointShapeError` (value + type), `assertNever` (value). Preserve existing exports. `shared/utils/src/index.ts`
- [x] T015 [P] [test] Write unit test for `assertNever` — asserts it throws when given an unreachable value cast as `never`. Used by FR-016. `shared/utils/tests/assert.test.ts`
- [x] T016 [P] [test] Write unit test for `InvalidPointShapeError` — asserts construction preserves `offendingValue` and `validShapes`, and the message includes both. `shared/utils/tests/errors.test.ts`
- [x] T017 Run `pnpm --filter @debrief/utils build && pnpm --filter @debrief/utils test` to confirm Phase 2 primitives compile and pass. No file change.

**Checkpoint**: `@debrief/utils` exports `PointShape`, `InvalidPointShapeError`, `assertNever`, and has a module-level `VALID_POINT_SHAPES` Set available for Phase 6's guard. All new primitives have passing unit tests.

### Parallel Example

```bash
# T011, T014, T015, T016 can all run in parallel after T010, T012, T013 land.
Task: "Add InvalidPointShapeError class to @debrief/utils"       # T011
Task: "Update @debrief/utils barrel export"                      # T014
Task: "Unit test for assertNever helper"                         # T015
Task: "Unit test for InvalidPointShapeError class"               # T016
```

---

## Phase 3: User Stories 1–3 — Core Type Consolidation (Priority: P1)

**Goal**: Collapse the two drifted `ResolvedPositionStyle` interfaces into one canonical definition with the schema-derived `symbol` field and the renamed `labelText` field. Covers US1, US2, and US3 atomically.

**Independent Test**:
- `grep -rn 'interface ResolvedPositionStyle' shared/` returns exactly 1 match (in `shared/utils/src/types.ts`).
- `grep -rn '\.label\b' shared/utils/ apps/ | grep -v node_modules` returns zero matches on a `ResolvedPositionStyle`-typed value.
- `pnpm -r typecheck` passes.
- `pnpm --filter @debrief/utils test` passes (existing 10 tests + renamed 5 assertions).

### Tests for Phase 3 (TDD — write & fail before implementation) ⚠️

- [x] T020 [P] [test] [US1] [US3] Rename 5 existing `.label` assertions to `.labelText` in the existing tests (lines 121, 151, 186, 202, 314). Run the suite and confirm these **fail** against the current (unchanged) production code — this is TDD. `shared/utils/tests/interval.test.ts`
- [x] T021 [P] [test] [US2] Add a vitest compile-time assertion that a string literal `'diamond'` is assignable to `ResolvedPositionStyle.symbol` (i.e., the symbol union includes all 5 schema values). Today this FAILS because the utils-side interface has only 3 values. `shared/utils/tests/interval.test.ts`
- [x] T022 [P] [test] [US3] Add a `@ts-expect-error` fixture in a `.test-d.ts` or inline test asserting that `result.label` on a `ResolvedPositionStyle` is a type error. Today this FAILS because the field is still named `label`. `shared/utils/tests/interval.test.ts`

### Implementation for Phase 3

- [x] T023 [US1] [US2] [US3] Update `ResolvedPositionStyle` interface in `shared/utils/src/types.ts`: change `symbol` from `'circle' | 'square' | 'triangle'` to `PointShape` (imported from the same file); change `label: string | null` to `labelText: string | null`. Do NOT keep a backward-compat `label` alias. Satisfies FR-001, FR-003, FR-004. `shared/utils/src/types.ts`
- [x] T024 [US1] [US3] Update the resolver `resolvePositionStyle` in `shared/utils/src/interval.ts`: rename the local `label` variable to `labelText` throughout (lines 125, 147, 153, 161); rename the returned object key `label` to `labelText` (line 161); update docstring if present. Leave override-cascade logic unchanged (Phase 4 handles the null-semantics tightening). Satisfies FR-005. `shared/utils/src/interval.ts`
- [x] T025 [US1] [US3] Update the type re-export in `shared/utils/src/interval.ts:16` — `ResolvedPositionStyle` is already re-exported from this file; no change. Verify the resolver return type annotation (`): ResolvedPositionStyle`) still resolves correctly. `shared/utils/src/interval.ts`
- [x] T026 [US1] Run `pnpm --filter @debrief/utils test` and verify T020/T021/T022 tests now PASS. Run `pnpm --filter @debrief/utils typecheck` — expect 0 errors.
- [x] T027 [US1] Grep sweep for stale `.label` reads on `ResolvedPositionStyle`-typed values: `grep -rn '\.label\b' shared/utils/ apps/` — manually inspect each match and confirm none of them is on a `ResolvedPositionStyle` value. Satisfies FR-007 / SC-003.

**Checkpoint**: Phase 3 complete when (a) one interface declaration remains in `shared/utils/src/types.ts`, (b) all utils-side tests pass against the new shape, (c) `pnpm -r typecheck` passes. At this point the components-side still has its own duplicate — that is Phase 4's job.

### Parallel Example

```bash
# Phase 3 TDD tests all land in the same file but can be authored in one commit.
# After T023 + T024 land, T026 and T027 are mechanical verification steps.
Task: "Rename 5 `.label` → `.labelText` assertions"   # T020
Task: "Add 5-shape symbol assignability test"        # T021
Task: "Add @ts-expect-error for .label read"         # T022
```

---

## Phase 4: User Story 4 — Single Resolver Implementation (Priority: P2)

**Goal**: Delete the components-side duplicate of `resolvePositionStyle` / `computeAllPositionStyles`. Adopt the components-side override-null semantics (R-007 / FR-013) in the surviving utils-side implementation. Make `@debrief/components` re-export the unified functions.

**Independent Test**:
- `grep -rn 'export function resolvePositionStyle' shared/` returns exactly 1 match. Same for `computeAllPositionStyles`.
- A unit test pinning the new null-override semantics passes.
- `pnpm --filter @debrief/components typecheck` and `pnpm --filter @debrief/components test` pass.
- Existing Playwright E2E on `PositionSymbolsLayer` passes (rendering parity).

### Tests for Phase 4 (TDD) ⚠️

- [x] T030 [P] [test] [US4] Add vitest test "null override field leaves default untouched": construct an override with `show_symbol: null`, pass through `resolvePositionStyle`, assert the result's `showSymbol` matches `defaultStyle.show_symbol` (not `null`). Repeat for `show_label: null`, `symbol: null`, `label: null`. Today this FAILS because utils-side uses `!== undefined` which lets `null` through. `shared/utils/tests/interval.test.ts`

### Implementation for Phase 4

- [x] T031 [US4] Tighten override-cascade checks in `shared/utils/src/interval.ts` from `!== undefined` to `!== undefined && !== null` for all four override fields (`show_symbol`, `symbol`, `show_label`, `label` — lines 137, 140, 143, 146 in the current file). Satisfies FR-013 / R-007. `shared/utils/src/interval.ts`
- [x] T032 [US4] Delete the local `interface ResolvedPositionStyle` declaration from `shared/components/src/utils/time.ts` (lines ~249–254). Add `import type { ResolvedPositionStyle, PointShape } from '@debrief/utils';` at the top of the file. Satisfies FR-002. `shared/components/src/utils/time.ts`
- [x] T033 [US4] Delete the local `export function resolvePositionStyle(...)` body (lines ~268–317) from `shared/components/src/utils/time.ts`. Replace with a re-export: `export { resolvePositionStyle } from '@debrief/utils';`. Satisfies FR-012. `shared/components/src/utils/time.ts`
- [x] T034 [US4] Delete the local `export function computeAllPositionStyles(...)` body (lines ~329–368) from `shared/components/src/utils/time.ts`. Replace with `export { computeAllPositionStyles } from '@debrief/utils';`. Satisfies FR-012. `shared/components/src/utils/time.ts`
- [x] T035 [US4] Update `shared/components/src/index.ts:108-111` barrel export: change the re-export source of `resolvePositionStyle` and `computeAllPositionStyles` from `./utils/time` to `@debrief/utils`; change the type re-export `ResolvedPositionStyle` source from `./utils/time` to `@debrief/utils`; additionally export `PointShape` (type), `InvalidPointShapeError` (value), `assertNever` (value). Satisfies FR-010. `shared/components/src/index.ts`
- [x] T036 [US4] Verify no other file in `shared/components/` imports `ResolvedPositionStyle` from `./utils/time` directly (bypassing the barrel). `grep -rn "from.*utils/time" shared/components/` — any hit that imports `ResolvedPositionStyle` must be rewritten to import from `@debrief/utils`. `shared/components/src/`
- [x] T037 [US4] Run `pnpm --filter @debrief/components typecheck` and `pnpm --filter @debrief/components test` — expect 0 errors and all tests pass. The existing components tests (including `position-symbols.test.ts`) must pass unmodified because the resolver's public signature is unchanged.
- [x] T038 [US4] Grep verification for SC-007: `grep -rn "export function resolvePositionStyle" shared/` returns exactly 1 match. Same for `computeAllPositionStyles`. Capture output to a scratch file for later inclusion in `evidence/grep-uniqueness.txt`.

**Checkpoint**: Phase 4 complete when one resolver implementation survives and the components package re-exports it under the same names. All existing component tests still pass; the new null-semantics test passes.

### Parallel Example

```bash
# After T031 lands in interval.ts, T032/T033/T034/T035 can proceed in parallel
# because T032/T033/T034 all touch shared/components/src/utils/time.ts sequentially
# but T035 is in a different file, so:
Task: "Delete interface + functions from time.ts (sequential in same file)"   # T032→T033→T034
Task: "Update shared/components/src/index.ts barrel export"                   # T035 [P]
```

---

## Phase 5: User Story 5 — Exhaustive-Switch Coverage (Priority: P2)

**Goal**: Replace the hand-typed `SymbolShape` alias in the map renderer with the canonical `PointShape`. Add `assertNever` default branches to `svgPathForShape` and to the render-loop switch in `PositionSymbolsLayer.tsx` so that a new schema shape breaks the build until every renderer handles it.

**Independent Test**:
- `grep -rn 'SymbolShape' shared/components/` returns zero matches.
- Adding a mock 6th value to `PointShape` in a scratch test fixture causes `tsc --noEmit` to report errors in `PositionSymbolsLayer.tsx` (verifies SC-008).
- Existing `position-symbols.test.ts` passes with updated imports.

### Tests for Phase 5 (TDD) ⚠️

- [x] T040 [P] [test] [US5] Add a negative-typecheck fixture in `shared/components/src/MapView/__tests__/position-symbols-exhaustive.test-d.ts` (or similar `.test-d.ts` file): uses a `@ts-expect-error`-style assertion that mocks a widened `PointShape` (e.g., `type PointShape = 'circle' | ... | 'cross' | 'star';`) and asserts that `svgPathForShape` and the render-loop switch do NOT accept the widened type without a new branch. Today this test does not exist; the renderer switches silently accept unknown shapes. `shared/components/src/MapView/__tests__/position-symbols-exhaustive.test-d.ts`
- [x] T041 [P] [test] [US5] Update the existing `position-symbols.test.ts` import from `import type { SymbolShape } from '../PositionSymbolsLayer';` to `import type { PointShape } from '@debrief/utils';` (or from `@debrief/components` — same type). Rename any type annotation `shapes: SymbolShape[]` to `shapes: PointShape[]`. This test should still PASS against the current production code today (because `SymbolShape` and the proposed `PointShape` have identical value sets) — after the rename lands in T042, it will pass on the new shape. `shared/components/src/MapView/__tests__/position-symbols.test.ts`

### Implementation for Phase 5

- [x] T042 [US5] In `shared/components/src/MapView/PositionSymbolsLayer.tsx`: delete the local `export type SymbolShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';` (line ~18). Replace with `import type { PointShape } from '@debrief/utils';` at the top of the file. Rename every `SymbolShape` type reference in function signatures (`svgPathForShape(shape: SymbolShape, ...)` at line ~42, 79; `getRadiusForShape(shape: SymbolShape): number` at line ~279; any intermediate `shape as SymbolShape` cast at line ~207) to use `PointShape`. `shared/components/src/MapView/PositionSymbolsLayer.tsx`
- [x] T043 [US5] In the same file, locate the `switch (shape)` in `svgPathForShape` (starts at line ~43). Add a `default: return assertNever(shape);` branch (import `assertNever` from `@debrief/utils` at the top). Remove any existing fall-through that returns an empty string for unknown shapes (the `'circle'` case is handled explicitly by the caller — confirm the caller logic doesn't depend on the empty-string sentinel for 'circle'; if it does, add `case 'circle': return '';` explicitly before the default). Satisfies FR-016 first branch. `shared/components/src/MapView/PositionSymbolsLayer.tsx`
- [x] T044 [US5] In the same file, locate the render-loop switch that chooses between `CircleMarker` and SVG-path `Marker` (starts at line ~208). Currently the code uses an `if (shape === 'circle' || !shape)` fallthrough. Refactor to an exhaustive `switch (shape)` with explicit cases for `'circle'`, `'square'`, `'triangle'`, `'diamond'`, `'cross'`, and a `default: return assertNever(shape);`. The renderer bodies for each case may share a helper — keep the visual output identical (SC-004). Satisfies FR-016 second branch. `shared/components/src/MapView/PositionSymbolsLayer.tsx`
- [x] T045 [US5] Confirm no other file under `shared/components/src/MapView/` declares a hand-typed shape union: `grep -rn "'circle'.*'square'.*'triangle'" shared/components/src/`. Any hit outside `PositionSymbolsLayer.tsx` is out of scope for this feature but must be logged (for a follow-up) if found. `shared/components/src/MapView/`
- [x] T046 [US5] Run `pnpm --filter @debrief/components typecheck && pnpm --filter @debrief/components test` — expect all tests passing (including the new T040 negative fixture and the T041 renamed import). Run `pnpm --filter @debrief/components build` to confirm the renderer still bundles. No file change.
- [x] T047 [US5] Manual dry-run of the negative-typecheck fixture: temporarily add a 6th value `'star'` to the mocked `PointShape` in T040's test file, run `tsc --noEmit` at the components-package root, verify errors point at `PositionSymbolsLayer.tsx` (svgPathForShape and render-loop switch). Revert the test fixture. Records the evidence for SC-008.

**Checkpoint**: Phase 5 complete when `SymbolShape` is deleted, both renderer switches have `assertNever` default branches, and the negative-typecheck test confirms the build breaks on an unhandled shape.

---

## Phase 6: User Story 7 — Explicit Failure on Invalid Runtime Shape (Priority: P2)

**Goal**: Wire up the runtime guard. The resolver throws `InvalidPointShapeError` when an override's `symbol` is not in `PointShape`. The renderer catches the error, logs via `LogService` (or equivalent), and does not silently substitute a default shape for the offending position. Closes the Article I.3 silent-failure gap pre-dating this feature.

**Independent Test**:
- `resolvePositionStyle(..., { symbol: 'star' }, ...)` throws `InvalidPointShapeError` with the offending value + valid set in its message.
- Rendering a track whose one override has an invalid symbol logs via `LogService` and does not crash the rest of the track's rendering.
- No position gets a silent default-shape substitution on invalid input.

### Tests for Phase 6 (TDD) ⚠️

- [x] T050 [P] [test] [US7] Add vitest test: "resolver throws InvalidPointShapeError on unknown symbol". Construct an override with `symbol: 'star'`, call `resolvePositionStyle`, assert it throws `InvalidPointShapeError` with `err.offendingValue === 'star'` and `err.validShapes` containing all 5 current values. Today this FAILS because no guard exists. `shared/utils/tests/interval.test.ts`
- [x] T051 [P] [test] [US7] Add vitest test: "resolver accepts all 5 valid shapes without throwing". Parameterised test over `['circle', 'square', 'triangle', 'diamond', 'cross']`. Should pass even before the guard is added (regression guard for the valid path). `shared/utils/tests/interval.test.ts`
- [x] T052 [P] [test] [US7] Add vitest test on `PositionSymbolsLayer` consumption: mock `computeAllPositionStyles` to throw `InvalidPointShapeError`, render the component, assert a `LogService` mock was called with the error context, and assert the component did not crash (React Error Boundary not triggered; the rest of the render tree still exists). Today this FAILS because no try/catch exists around the call. `shared/components/src/MapView/__tests__/position-symbols-error.test.tsx`

### Implementation for Phase 6

- [x] T053 [US7] Add the runtime guard to `resolvePositionStyle` in `shared/utils/src/interval.ts`. Before the line that reads `symbol = override.symbol` (around line 141 in the pre-refactor file — may have shifted after Phase 3/4), check `if (!VALID_POINT_SHAPES.has(override.symbol)) throw new InvalidPointShapeError(override.symbol, [...VALID_POINT_SHAPES]);`. Import `InvalidPointShapeError` from `./errors.js` and `VALID_POINT_SHAPES` must already exist at module scope (T013). Satisfies FR-015. `shared/utils/src/interval.ts`
- [x] T054 [US7] Determine the LogService integration surface from the existing codebase: find how `PositionSymbolsLayer` or its parent currently reports errors (is there a LogService prop? A global provider?). Grep `shared/components/src/MapView/` and `@debrief/session-state` for `LogService` usage. Record the chosen integration point (prop, provider, or direct import) in `evidence/logservice-integration.md`. This informs T055's implementation. `shared/components/src/MapView/`
- [x] T055 [US7] Wrap the `computeAllPositionStyles(...)` call in `PositionSymbolsLayer.tsx:136-145` (inside the `useMemo`) in a `try/catch`. On `InvalidPointShapeError`, call the LogService integration chosen in T054 with the error's `offendingValue`, `validShapes`, and the current `featureId`. Set `resolvedStyles` to `[]` (empty) for the catch branch so the rest of the track does not render with stale-or-invalid styles. Satisfies FR-018. `shared/components/src/MapView/PositionSymbolsLayer.tsx`
- [x] T056 [US7] Run `pnpm --filter @debrief/utils test && pnpm --filter @debrief/components test` — expect T050/T051/T052 to now PASS.
- [x] T057 [US7] Capture evidence: run the three new tests with `--reporter=verbose` and save the output to `specs/201-position-style-consolidation/evidence/runtime-guard.txt`. Shows the thrown error message format and the LogService call. `specs/201-position-style-consolidation/evidence/runtime-guard.txt`

**Checkpoint**: Phase 6 complete when the resolver guards against invalid shapes with a typed error, the renderer catches and logs without crashing, and three new tests pin the behaviour. Constitution Article I.3 gap closed.

---

## Phase 7: User Story 6 — Schema-Typed Override Inputs (Priority: P2, CONTINGENT)

**Goal**: Narrow `PositionStyle.symbol` and `PositionStyleOverride.symbol` in `shared/schemas/src/generated/typescript/types.ts` from `string` to `PointShape`, via a post-process step in the schemas build. Replace the hand-typed `VALID_SYMBOLS` tuple in `applySymbolStyle.ts` with the schema-derived equivalent.

**CONTINGENCY**: Tasks T060–T063 depend on T004 (the R-011 prototype in Phase 1) confirming a tractable post-process mechanism. If the prototype failed, T060–T063 are SKIPPED, FR-014 is demoted to a follow-up backlog item, and only T064–T067 (the `applySymbolStyle.ts` cleanup, which does not depend on the narrowing) proceed in this feature.

**Independent Test**:
- `grep 'symbol: string' shared/schemas/src/generated/typescript/types.ts` returns zero matches for `PositionStyle` and `PositionStyleOverride` (but may still match other attributes out of scope for this feature).
- A `@ts-expect-error` fixture asserting `PositionStyleOverride = { symbol: 'star' }` is rejected.
- MCP tool `apply-symbol-style`'s `inputSchema.properties.symbol.enum` contains exactly the 5 current PointShapeEnum values.

### Tests for Phase 7 (TDD) ⚠️

- [x] T060 [P] [test] [US6] Add `@ts-expect-error` fixture: a caller that sets `PositionStyleOverride = { symbol: 'star' }` must be a tsc error after narrowing. Without narrowing, tsc accepts (because the field is `string`). `shared/schemas/tests/types-narrowing.test-d.ts`
- [x] T061 [P] [test] [US6] Add vitest test for `applySymbolStyle.ts`: assert that `toolDefinition.inputSchema.properties.symbol.enum` equals `Object.values(PointShapeEnum)` (5 strings, same order). Today this passes trivially because `VALID_SYMBOLS` happens to match; after refactor it is structurally pinned. `apps/vscode/tests/unit/applySymbolStyle.test.ts`

### Implementation for Phase 7

- [x] T062 [US6] Implement the schemas-build post-process step based on the mechanism chosen in T004's prototype (e.g., a Node script in `shared/schemas/scripts/narrow-enum-attrs.mjs` that runs after `gen-typescript` as part of the `build` npm script). The script MUST: (a) read `shared/schemas/src/generated/typescript/types.ts`; (b) for each attribute whose LinkML `range` is `PointShapeEnum` (`PositionStyle.symbol`, `PositionStyleOverride.symbol`, and any other if extant), rewrite `symbol: string,` → `symbol: PointShape,`; (c) inject `import type { PointShape } from '@debrief/utils';` at the top of the generated types file (or fall back to a local hand-written module per R-011 if circular imports bite); (d) be idempotent (running twice produces the same output). `shared/schemas/scripts/narrow-enum-attrs.mjs`
- [x] T063 [US6] Wire the post-process step into the schemas build: update `shared/schemas/package.json` scripts so that `pnpm --filter @debrief/schemas build` runs `gen-typescript` *then* the narrowing script. Also wire into any CI `regenerate-schemas` workflow. Confirm the step runs in the existing `task verify` pipeline. `shared/schemas/package.json`
- [x] T064 [US6] Regenerate the schemas: `pnpm --filter @debrief/schemas build`. Inspect `shared/schemas/src/generated/typescript/types.ts` — confirm `PositionStyle.symbol: PointShape,` and `PositionStyleOverride.symbol: PointShape,` lines; confirm `import type { PointShape } from '@debrief/utils';` is present at top. Run `pnpm -r typecheck` — expect 0 errors (the narrowing is structurally compatible with all existing call sites because every value they assign is a valid `PointShape`). `shared/schemas/src/generated/typescript/types.ts`
- [x] T065 [US6] Refactor `apps/vscode/src/tools/track/styling/applySymbolStyle.ts`: delete lines 10–11 (`const VALID_SYMBOLS = [...] as const; type SymbolType = typeof VALID_SYMBOLS[number];`). Add imports: `import { PointShapeEnum } from '@debrief/schemas'; import type { PointShape } from '@debrief/utils';`. Declare a module-level `const VALID_SYMBOLS = Object.values(PointShapeEnum);` (or inline the `Object.values` call in the `inputSchema` literal — pick one for readability). Retype every `SymbolType` reference to `PointShape`. The MCP tool's `inputSchema.properties.symbol.enum` references the new array. `apps/vscode/src/tools/track/styling/applySymbolStyle.ts`
- [x] T066 [US6] Run the existing `apps/vscode/tests/unit/applySymbolStyle.test.ts` plus the new T061 assertion. Expect all tests pass. Then do a manual MCP-tool registration dry-run: load the tool definition, inspect the JSON schema enum field, confirm it matches the 5-shape list.
- [x] T067 [US6] Capture round-trip evidence: write `specs/201-position-style-consolidation/evidence/round-trip-evidence.md` showing (a) `PointShapeEnum` in `shared/schemas/src/linkml/common.yaml`, (b) the generated TypeScript enum + narrowed attribute, (c) a consuming call site that type-checks on `{ symbol: 'diamond' }` and fails on `{ symbol: 'star' }`. Satisfies the Schema Change feature-type evidence requirement. `specs/201-position-style-consolidation/evidence/round-trip-evidence.md`

**Checkpoint**: Phase 7 complete when (contingent path) the generator output narrows correctly and `applySymbolStyle.ts` is schema-derived, OR (fallback path) the narrowing is deferred to a backlog item and only `applySymbolStyle.ts` uses `PointShape` for its TS typing while the JSON schema's enum is still manually listed.

---

## Phase 8: User Story 8 — Enum-Parity Adherence Test (Priority: P3)

**Goal**: Add a schema adherence test that asserts `PointShapeEnum.permissible_values.keys() == MarkerSymbolEnum.permissible_values.keys()`. Closes the drift surface via test, not via deletion — respects the prior ADR from feature #091.

**Independent Test**:
- New adherence test passes against current schema.
- Artificially adding a value to one enum causes the test to fail with a clear message.

### Tests for Phase 8 (this IS the test) ⚠️

- [x] T070 [US8] [test] Locate where schema adherence tests live (`shared/schemas/tests/adherence/`? `shared/schemas/tests/`? Check existing layout first via `ls shared/schemas/tests/`). Add a new test file `enum-parity.test.py` (Python, matching the language of existing adherence tests — if existing tests are TypeScript, use the same). The test loads the LinkML schema via `linkml-runtime` (or reads `shared/schemas/src/linkml/common.yaml` directly as YAML) and asserts `set(schema.enums['PointShapeEnum'].permissible_values.keys()) == set(schema.enums['MarkerSymbolEnum'].permissible_values.keys())`. Failure message names the mismatched values on each side. Satisfies FR-017 / R-012 / SC-010. `shared/schemas/tests/adherence/enum-parity.test.py`
- [x] T071 [US8] Run the new test alone: `pytest shared/schemas/tests/adherence/enum-parity.test.py -v`. Expect PASS against the current schema (both enums currently hold the same 5 values).
- [x] T072 [US8] Manually perturb: temporarily add a `hexagon` permissible value to `PointShapeEnum` in `shared/schemas/src/linkml/common.yaml`, regenerate schemas (`pnpm --filter @debrief/schemas build`), re-run the adherence test — expect FAIL with a message naming `hexagon`. Revert the perturbation. Captures SC-010 working-as-intended evidence.
- [x] T073 [US8] Capture output to `specs/201-position-style-consolidation/evidence/schema-adherence.txt`: both the passing run (happy path) and a screenshot/paste of the failing-run message (from T072's perturbation). `specs/201-position-style-consolidation/evidence/schema-adherence.txt`

**Checkpoint**: Phase 8 complete when the new adherence test is committed, passes on current schema, and demonstrably catches drift (evidence captured).

---

## Phase 9: Polish & Cross-Cutting Concerns

> **Purpose**: CI gate, grep sweeps, evidence collection, runtime parity verification, media content, and PR creation.

### Final Verification

- [x] T080 Run the full `task verify` pipeline (lint + typecheck + unit tests + Playwright E2E) per `CLAUDE.md` §"Before Pushing". All four steps must be green. If `task` is not available in the environment, run the fallback 4-command sequence. Satisfies FR-011 / SC-005.
- [x] T081 Grep sweep for SC-001/SC-003/SC-007/SC-010 acceptance. Run and capture to `specs/201-position-style-consolidation/evidence/grep-uniqueness.txt`:
  - `grep -rn 'interface ResolvedPositionStyle' shared/` — expect 1 match.
  - `grep -rn 'export function resolvePositionStyle' shared/` — expect 1 match.
  - `grep -rn 'export function computeAllPositionStyles' shared/` — expect 1 match.
  - `grep -rn '\.label\b' shared/utils/ apps/` — expect zero matches on a `ResolvedPositionStyle`-typed value (non-ResolvedPositionStyle hits listed with a "not relevant" comment).
  - `grep -rn 'SymbolShape' shared/components/` — expect zero matches.
  - `grep -rn 'MarkerSymbolEnum' shared/schemas/src/linkml/` — expect 1 match (the enum definition itself; 17B path).
  `specs/201-position-style-consolidation/evidence/grep-uniqueness.txt`

### Rendering Parity (SC-004)

- [x] T082 Run `pnpm --filter @debrief/web-shell dev` (or the equivalent preview harness), open the same sample catalog plot screenshotted in T005, capture a new screenshot at the same zoom. Save to `specs/201-position-style-consolidation/evidence/after-rendering.png`. `specs/201-position-style-consolidation/evidence/after-rendering.png`
- [x] T083 Run the existing Playwright E2E suites: `pnpm --filter '!@debrief/web-shell' test` then `cd apps/web-shell && node run-playwright.mjs`. Capture test counts (passed/failed/skipped) for the test-summary. **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — use `@sparticuz/chromium` via `run-playwright.mjs`.
- [x] T084 [P] Side-by-side compare `baseline-rendering.png` (from T005) and `after-rendering.png` (from T082). Document findings in `specs/201-position-style-consolidation/evidence/rendering-parity.md`: same symbols at same positions, same label text. Flag any visual delta for investigation. `specs/201-position-style-consolidation/evidence/rendering-parity.md`

### Evidence Collection (REQUIRED)

- [x] T085 Capture test summary using template `.specify/templates/evidence/test-summary-template.md` in `specs/201-position-style-consolidation/evidence/test-summary.md`. MUST include YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body documents: the 5 renamed assertions, 3 new resolver tests (null semantics, invalid symbol, valid-shape parametric), 1 negative-typecheck fixture (assertNever), 2 new renderer tests (PointShape rename, InvalidPointShapeError catch), 1 new applySymbolStyle test, 1 new schema adherence test, 1 unit test each for `assertNever` + `InvalidPointShapeError`. `specs/201-position-style-consolidation/evidence/test-summary.md`
- [x] T086 Create usage demonstration in `specs/201-position-style-consolidation/evidence/usage-example.md`. Shows: (a) canonical imports from `@debrief/utils` and `@debrief/components`; (b) consuming `ResolvedPositionStyle` in an exhaustive `switch (symbol)` with `assertNever` default; (c) handling `InvalidPointShapeError` via `try/catch`; (d) applying the resolver to a track with interval rules + overrides. Based on `quickstart.md`. `specs/201-position-style-consolidation/evidence/usage-example.md`

### Media Content

- [x] T087 Create shipped blog post in `specs/201-position-style-consolidation/media/shipped-post.md`. Use the Content Specialist agent (`.claude/agents/media/content.md`). Follows the Shipped Post template: What We Built, Screenshots (baseline + after), Lessons Learned (R-011's prototype risk, scope expansion from Low → Medium, reviewer-pushback pattern), What's Next (backlog #206 broader enum audit). `specs/201-position-style-consolidation/media/shipped-post.md`
- [x] T088 [P] Create LinkedIn shipped summary in `specs/201-position-style-consolidation/media/linkedin-shipped.md`. 150–200 words, strong hook (the silent-failure-before/explicit-error-after angle), `[LINK]` placeholder, no emojis, British English. `specs/201-position-style-consolidation/media/linkedin-shipped.md`

### PR Creation

- [x] T089 Create PR and publish blog: run `/speckit.pr`. This task MUST run last. It: creates the feature PR in `debrief/debrief-future` with evidence-linked description; publishes `media/shipped-post.md` to `debrief/debrief.github.io` via cross-repo PR. Dependencies: **all tasks T001–T088 must be complete**.

**Checkpoint**: Phase 9 complete when the full verification pipeline is green, grep sweeps confirm all structural SCs, rendering parity is documented, shipped media content is drafted, and the PR is open. Feature ready for review and merge.

---

## Dependencies

### Phase-Level Dependencies

```
Phase 1 (Setup & R-011 prototype) ──┐
                                    ▼
Phase 2 (Foundation primitives) ────┬──► Phase 3 (Core type, P1) ──► Phase 4 (Resolver consolidation, P2)
                                    │                                         │
                                    │                                         ▼
                                    │                                    Phase 5 (Exhaustive switch, P2)
                                    │                                         │
                                    │                                         ▼
                                    │                                    Phase 6 (Runtime guard, P2)
                                    │                                         │
                                    │    ┌────────────────────────────────────┘
                                    ▼    ▼
                              Phase 7 (Schema-typed inputs, P2, CONTINGENT on T004)
                                    │
                                    ▼
Phase 8 (Enum-parity test, P3) ─────┴──► Phase 9 (Polish → PR)
```

**Hard ordering**:

- **Phase 1 → Phase 2**: T004's prototype outcome determines whether Phase 7 is viable. Phase 2 can start in parallel with T004 (T004 is time-boxed to 1 day; T010–T017 can happen alongside because the foundation primitives are independent of the narrowing mechanism).
- **Phase 2 → Phase 3**: `PointShape`, `InvalidPointShapeError`, and `VALID_POINT_SHAPES` must exist before the resolver and renderer can reference them.
- **Phase 3 → Phase 4**: The canonical interface in `@debrief/utils` must exist before the components-side duplicate is deleted (otherwise the components barrel has nothing to re-export).
- **Phase 3 → Phase 5**: `PointShape` must exist before `SymbolShape` can be renamed to it.
- **Phase 4 → Phase 6**: The runtime guard change is made to the surviving resolver, so Phase 4 must collapse the resolvers first.
- **Phase 5 || Phase 6**: These can run in parallel once Phase 4 is done (different files, independent concerns).
- **Phases 3–6 → Phase 7**: The narrowing of generator output depends on `PointShape` existing and the guard being in place (the guard is the behavioural safety net; narrowing is the structural one).
- **Phase 8 is mostly independent**: the adherence test only depends on the schemas package existing. It can run as soon as Phase 1 is complete.
- **Phase 9 depends on all others**.

### Task-Level Critical Path

```
T001 → T002 → T003 → T004 (CRITICAL — risk gate)
                      │
                      ├─► T005 (baseline screenshot, parallel)
                      │
                      └─► T010 → T012 → T013 (foundation sequential in same files)
                                 │
                                 ├─► T011, T014, T015, T016 [P]
                                 │
                                 ▼
                              T017 (checkpoint)
                                 │
                                 ▼
                        T020 → T023 → T024 → T026 → T027
                                                    │
                                 ┌──────────────────┴──────────────────┐
                                 ▼                                     ▼
                           T030 → T031 → T032 → T033 → T034     (Phase 5)
                                                         │       T040 → T042 → T043 → T044 → T046
                                                         │                                    │
                                                         └────► T050 → T053 → T054 → T055 ────┘
                                                                                     │
                                                                                     ▼
                                                        (R-011 success?)        T056 → T057
                                                             │                       │
                                                             ▼                       │
                                                        T060 → T062 → T064 → T065 ──┤
                                                                                     ▼
                                                                                T070 → T073
                                                                                     │
                                                                                     ▼
                                                                                T080 → ... → T089
```

### Within-Phase Parallel Opportunities

- **Phase 1**: T002, T003, T005 are `[P]` relative to T001/T004.
- **Phase 2**: T011, T014, T015, T016 are `[P]` after T010/T012/T013 land.
- **Phase 3**: T020, T021, T022 (all in the same test file but non-conflicting) can be authored in one commit; T023 and T024 touch different files, so either order.
- **Phase 4**: T032/T033/T034 are sequential (same file); T035 is `[P]` (different file).
- **Phase 5**: T040 and T041 are `[P]` (different files); T042–T044 are sequential (same file).
- **Phase 6**: T050/T051/T052 are `[P]` (different files); T053/T054/T055 are partly serial but T054 is a research task that can happen in parallel with T053.
- **Phase 7**: T060 and T061 are `[P]`.
- **Phase 8**: T070 and its manual perturbation (T072) are sequential; T073 evidence is after both.
- **Phase 9**: T081, T082, T084, T085, T086, T087, T088 can largely parallelise; T089 (`/speckit.pr`) runs last.

### Cross-Story Independence

- Phases 4, 5, 6, 7, 8 can be merged and shipped **independently of each other** once Phase 3 has landed, because each addresses a separate acceptance criterion. If the R-011 prototype stalls, Phase 7 can be skipped without blocking the rest.

---

## Implementation Strategy

### Incremental Delivery

Each phase ends in a green CI run; each phase is independently merge-eligible in principle (though we'll merge the whole feature together for this refactor). The preferred path:

1. **Day 1 — Phase 1 (risk gate)**: T004's R-011 prototype gets the full day. If it succeeds, Phase 7 proceeds; if not, FR-014 is renegotiated with the reviewer before any implementation commits. T001/T002/T003/T005 happen in parallel or opportunistically.
2. **Day 2 — Phase 2 (foundation)**: New primitives land with their unit tests. This is the first "green checkpoint".
3. **Day 3 — Phase 3 (core type, P1)**: The three P1 stories ship together as one atomic commit touching types.ts + interval.ts + interval.test.ts.
4. **Day 4 — Phases 4 and 5 (resolver consolidation + exhaustive switch, P2)**: Either in sequence or in parallel by two people. Both must complete before Phase 6.
5. **Day 5 — Phase 6 (runtime guard, P2)**: The silent-failure fix. Includes LogService integration research (T054) and the renderer try/catch (T055).
6. **Day 6 — Phase 7 (schema-typed inputs, P2, contingent)**: If R-011 succeeded, the narrowing post-process ships. Otherwise, only T065–T066 (`applySymbolStyle` cleanup) ship.
7. **Day 7 — Phase 8 + Phase 9 (P3 + Polish)**: Adherence test, full verification, evidence collection, shipped media content, PR creation.

Total estimate: **~1 week of focused work** for a single developer, assuming R-011 doesn't block.

### Parallel Team Strategy

With two developers:

- **Dev A**: Phase 1 → Phase 2 → Phase 3 → Phase 4 (the core change path).
- **Dev B**: Starts on Phase 8 (independent of all others) while Dev A works on Phases 1–3; then takes Phase 5 while Dev A takes Phase 6; then takes Phase 7 while Dev A starts the Polish phase.

### If R-011 Fails

If T004 cannot find a tractable post-process mechanism within the 1-day time-box:

1. Report back to the reviewer with the specific obstacle.
2. Renegotiate FR-014: demote to a follow-up feature; log in BACKLOG.md.
3. Skip tasks T060, T062, T063, T064, T067 entirely.
4. Keep T061 (MCP inputSchema assertion) and T065/T066 (`applySymbolStyle.ts` retype) — these don't depend on the narrowing.
5. Update spec.md SC-002/SC-006 scope to reflect the partial narrowing (only `ResolvedPositionStyle.symbol` is narrow; the schema input types stay `string`).
6. Flag this prominently in the shipped-post and PR description.

### Commit Strategy

- One commit per task or per logical group (e.g., T020+T021+T022 together as "TDD: add failing tests for core type consolidation").
- Commit messages tie back to FR/SC IDs explicitly, e.g., `refactor(201): FR-012 consolidate resolver implementations`.
- Rebase into a smaller atomic-commit set before the PR is opened (T089).

---

## Notes

- `[P]` tasks touch different files and have no dependencies — safe to run concurrently.
- `[test]` tasks are TDD-style where practical — write the failing test before the production change lands.
- `[US1]`/`[US2]`/... labels tie tasks to user stories for traceability.
- Every new codepath has at least one test (no silent codepaths — Article I.3).
- The `/speckit.pr` task MUST be the final task; it creates the PR and the cross-repo blog PR.
- Avoid: touching out-of-scope enums (Article IX — dependencies are liabilities), hand-typing any new shape union anywhere, adding `any` or `unknown as` casts to paper over type friction (Article XV).
