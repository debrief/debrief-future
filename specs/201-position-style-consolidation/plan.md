# Implementation Plan: Consolidate ResolvedPositionStyle and Align with Schema

**Branch**: `201-position-style-consolidation` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/201-position-style-consolidation/spec.md`

## Summary

Collapse the two drifted `ResolvedPositionStyle` interfaces (one in `@debrief/utils`, one in `@debrief/components`) into a single canonical definition in `@debrief/utils`, published as a template-literal union over `PointShapeEnum` (not a hand-typed string-literal union). Standardise on the field name `labelText`. **Following `/speckit.review` (2026-04-18), the scope now also includes**: consolidating the two near-duplicate resolver implementations into one with explicit null-override semantics (FR-012, FR-013); adding a runtime guard against invalid shape values that throws `InvalidPointShapeError` (FR-015); requiring exhaustive `assertNever` default branches in the map renderer switches (FR-016); narrowing the schema-generated `PositionStyle.symbol` / `PositionStyleOverride.symbol` fields from `string` to `PointShape` via a post-process step in the schemas build (FR-014); and reconciling `MarkerSymbolEnum` with `PointShapeEnum` by pinning their value-set equality via a schema adherence test (FR-017 option 17B per R-012).

Expected outcome: zero rendering-behaviour change on the shipped sample catalog (SC-004); every drift surface in the marker-shape codepath closed from LinkML down to the VS Code tool parameter. Effort is now Medium, not Low.

## Technical Context

**Language/Version**: TypeScript 5.x (strict); LinkML >= 1.7.0 (schema YAML edit in FR-017); Python 3.11 (only if the FR-014 post-process step is implemented in Python — the existing schemas build scripts should be inspected first; Node/TypeScript is equally acceptable).
**Primary Dependencies**: `@debrief/utils` (canonical location for the type, the resolver, `PointShape`, `InvalidPointShapeError`, `assertNever`), `@debrief/components` (local duplicate interface + resolver functions to be removed; already depends on `@debrief/utils`), `@debrief/schemas` (consumed for `PointShapeEnum`; its generator output is post-processed per FR-014).
**Storage**: N/A (types and runtime validation only; no persistent data).
**Testing**: Existing `shared/utils/tests/interval.test.ts` (vitest) gets 5 `.label` → `.labelText` renames plus 3 new unit tests (null-override semantics, invalid-symbol throw, exhaustive-switch negative check). Existing `shared/components/src/MapView/__tests__/position-symbols.test.ts` gets its import updated (`SymbolShape` → `PointShape`) plus 1 new test asserting `assertNever` triggers on an unreachable value. Existing `shared/components/e2e/*.spec.ts` (Playwright, theme variants) provide unchanged parity coverage for SC-004. One new schema adherence test pins `PointShapeEnum` and `MarkerSymbolEnum` value-set equality.
**Target Platform**: Browser (webview) and Node (unit tests, schemas build scripts); monorepo packages consumed by `apps/vscode`, `apps/web-shell`, `apps/nl-demo`, `apps/spec-navigator`.
**Project Type**: Single monorepo; shared libraries under `shared/`, apps under `apps/`. The refactor touches `shared/utils/`, `shared/components/`, `shared/schemas/` (LinkML + generated output + build-script + adherence tests), and `apps/vscode/src/tools/track/styling/`.
**Performance Goals**: The invalid-symbol guard runs per-position-with-override on render-critical paths. Target: O(1) lookup via module-level `Set<string>` (see R-009). No regression on the 10k-position-track scenario.
**Constraints**: Constitution Article XV (strict type safety) — no `any`/`as unknown as` shortcuts; Article II (schema integrity) — symbol types at every layer derive from `PointShapeEnum`; Article I.3 (no silent failures) — the invalid-symbol path MUST be loud (throw + log, not silent default); Article IV (thick services / thin frontends) — the resolver throws; the renderer catches and displays; Article VI (testing) — every new codepath has a unit test and the CI gate is green before push.
**Scale/Scope**: ~13 production source files + 3 schema/generated files + 4 spec files + ~4 new tests ≈ **24 total artefacts** touched or added. Estimated **200–300 LOC** of source code change (up from ~60 in the original Low-complexity plan). One high-risk research item (R-011 — generator post-process mechanism) may gate FR-014 and trigger renegotiation before `tasks.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution (`.specify/memory/constitution.md`, v1.2.0) articles evaluated against this refactor:

| Article | Applies? | Verdict | Notes |
|---------|----------|---------|-------|
| I. Defence-Grade Reliability | **Yes (central, post-expansion)** | ✅ Pass | No network introduced. Article I.3 ("no silent failures"): the pre-existing silent-fallback path for invalid runtime symbols is now explicitly addressed — FR-015 throws `InvalidPointShapeError`; FR-018 has the renderer catch + log + non-crash. Without this feature, a JSON with `symbol: "star"` draws a circle and the user never knows. |
| II. Schema Integrity | **Yes (central)** | ✅ Pass | Every layer's `symbol` type derives from `PointShapeEnum`: `ResolvedPositionStyle.symbol` (FR-003), `PositionStyle.symbol` and `PositionStyleOverride.symbol` via post-process (FR-014), map renderer switches (FR-016), VS Code tool parameter (no FR — see plan.md §"Source Code"), LinkML enum reconciliation (FR-017). Schema content itself only gets the adherence-test addition (R-012 / 17B); no existing permissible values change. |
| III. Data Sovereignty | No | N/A | No data transformations, no provenance, no exports. |
| IV. Architectural Boundaries | Yes | ✅ Pass | Change is entirely inside shared TypeScript libraries. No service/frontend boundary crossings modified. No new MCP coupling. |
| V. Extensibility | Yes | ✅ Pass | Extensions that render positions consume `@debrief/utils` or `@debrief/components` — both continue to export `ResolvedPositionStyle`. No breaking change for in-repo extensions. |
| VI. Testing | **Yes (expanded)** | ✅ Pass | Existing resolver tests are updated (not removed). **New tests** added for: null-override semantics (R-007), invalid-symbol throw (R-008), exhaustive-switch negative-typecheck (FR-016), `MarkerSymbolEnum`/`PointShapeEnum` value-set equality (R-012). Full CI gate (lint + tsc + vitest + Playwright E2E + schema adherence) is run per `CLAUDE.md` §"Before Pushing" before push. |
| VII. Test-Driven AI Collaboration | Yes | ✅ Pass | Acceptance criteria in spec.md (FR-001..FR-011, SC-001..SC-006) define "done"; vitest assertions are the executable spec. |
| VIII. Documentation | Yes | ✅ Pass | Spec, plan, research, data-model, quickstart committed under `specs/201-...`. No ADR required (no architectural choice being changed, only a drift being removed). |
| IX. Dependencies | Yes | ✅ Pass | Zero new dependencies. Uses existing workspace dep `@debrief/schemas` (already depended on by `@debrief/components` per `shared/components/package.json`; verified to be transitively available to `@debrief/utils` or added if not — see Phase 0 R-003). |
| X. Security | No | N/A | No secrets, no credentials, no network. |
| XI. Internationalisation | No | N/A | No user-facing strings changed. |
| XII. Community Engagement | Yes | ✅ Pass | Planning post + LinkedIn draft generated (Phase 2). |
| XIII. Contribution Standards | Yes | ✅ Pass | Single atomic commit per logical change, PR review, CI green. |
| XIV. Pre-Release Freedom | Yes | ✅ Pass | Pre-v4.0.0; field rename `label → labelText` is a permitted breaking change for any in-repo caller. Backlog explicitly scopes the rename (FR-004, FR-007). |
| XV. Strict Type Safety | **Yes (central)** | ✅ Pass | Resolves a drift that previously relied on `as` casts between mismatched unions. The new canonical type is concretely linked to the schema enum, narrowing the drift surface rather than widening it. No `any` is introduced; no `as unknown as` bridges are added. Existing `as` casts in renderers (e.g., `SymbolShape` cast in `PositionSymbolsLayer.tsx`) are either removed or verified still valid against the new, wider type. |

**Initial Gate (pre-Phase 0, pre-expansion): PASS.** No violations.

**Post-Design Gate (after Phase 1 artefacts, pre-`/speckit.review`): PASS.** The three design artefacts described exactly one new type, no new dependencies, no new tests, no new workflows.

**Post-Review Gate (after `/speckit.review` scope expansion, 2026-04-18): PASS with one high-risk dependency flagged.**

- All Constitution articles re-evaluated against the expanded scope. No new violations introduced; Article I.3 (no silent failures) is *resolved* rather than created by the expansion (FR-015 + FR-018); Article II (schema integrity) gains teeth (FR-014 narrows input types, FR-017 reconciles enums).
- The single risk remaining is **R-011**: the FR-014 narrowing mechanism has not been prototyped. If no tractable approach is found, FR-014 is renegotiated *before* `tasks.md` is generated — explicit renegotiation, not silent deletion. Until the prototype succeeds, FR-014 counts as a contingent requirement. Noted in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/201-position-style-consolidation/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify)
├── research.md          # Phase 0 output (/speckit.plan)
├── data-model.md        # Phase 1 output (/speckit.plan)
├── quickstart.md        # Phase 1 output (/speckit.plan)
├── contracts/
│   └── resolved-position-style.ts  # TypeScript reference of the canonical shape
├── checklists/
│   └── requirements.md  # Quality checklist (/speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

Cross-package refactor. Following the `/speckit.review` scope expansion, the plan now touches:

```text
shared/
├── utils/
│   ├── src/
│   │   ├── types.ts          # CANONICAL ResolvedPositionStyle + PointShape alias + InvalidPointShapeError + assertNever
│   │   ├── interval.ts       # CANONICAL resolver: writes `labelText`; filters `null` overrides (R-007);
│   │   │                     # VALIDATES override.symbol against module-level Set (R-009); throws InvalidPointShapeError
│   │   └── index.ts          # barrel adds: PointShape, InvalidPointShapeError, assertNever
│   └── tests/
│       └── interval.test.ts  # 5 assertion renames + 3 NEW tests (null semantics, invalid-symbol throw, assertNever)
├── components/
│   └── src/
│       ├── utils/
│       │   └── time.ts       # DELETE local ResolvedPositionStyle AND local resolvePositionStyle/computeAllPositionStyles;
│       │                     # keep only calculateTimeExtent/parseTime/formatTime/etc.
│       ├── index.ts          # barrel re-exports ResolvedPositionStyle + resolvers + PointShape + InvalidPointShapeError from @debrief/utils
│       └── MapView/
│           ├── PositionSymbolsLayer.tsx  # rename SymbolShape → PointShape; add assertNever default branches to svgPathForShape AND the render-loop switch
│           └── __tests__/
│               └── position-symbols.test.ts  # import PointShape (not SymbolShape); new test for assertNever
└── schemas/
    ├── src/
    │   └── linkml/
    │       └── common.yaml   # R-012/FR-017: MarkerSymbolEnum kept; adherence test pins equality
    ├── scripts/              # NEW OR EXISTING: post-process step that narrows PositionStyle.symbol and
    │                          # PositionStyleOverride.symbol from `string` to `PointShape` (FR-014 / R-011)
    ├── src/generated/typescript/types.ts  # regenerated output — symbol fields on PositionStyle and PositionStyleOverride narrowed
    └── tests/
        └── adherence/        # NEW test: PointShapeEnum.values === MarkerSymbolEnum.values

apps/vscode/
└── src/tools/track/styling/
    └── applySymbolStyle.ts   # replace VALID_SYMBOLS tuple + SymbolType with PointShape (imported from @debrief/utils);
                              # MCP inputSchema.properties.symbol.enum derived via Object.values(PointShapeEnum)
```

**Structure Decision**: Single-project monorepo; no new packages, no new directories. Work spans `shared/utils/`, `shared/components/`, `shared/schemas/` (LinkML + generated + scripts + adherence tests), and `apps/vscode/src/tools/track/styling/`. The public export name `ResolvedPositionStyle` is preserved on both `@debrief/utils` and `@debrief/components` barrels (FR-010), and the public signatures of `resolvePositionStyle` / `computeAllPositionStyles` are unchanged — only their internal override-null semantics and the new invalid-symbol error path change behaviour. The MCP tool parameter surface (`apps/vscode/.../applySymbolStyle.ts`) has identical permissible values as today (5 shapes), so no consumer-visible change.

**File count**: ~13 production files + 3 schema/generated files + 4 spec files + 4 new test files ≈ 24 artefacts touched or added.

## Media Components

None — this is a type-consolidation / tech-debt refactor with no new or changed visual components. Existing `PositionSymbolsLayer.stories.tsx` (if present in Storybook) is unaffected; no new story is introduced.

**Inclusion Criteria Applied**:
- [ ] New visual component — no
- [ ] Significant visual change — no
- [ ] Interactive demo adds narrative value — no

**Bundleability Verified**: N/A

**Storybook Link**: N/A

## Storybook E2E Testing

None — no new interactive UI components. Existing Storybook E2E coverage for `PositionSymbolsLayer` (and any other consumer) continues to exercise the rendering path against the unchanged behavioural contract; no new `.spec.ts` file is created.

**Testing Strategy**: rely on existing Storybook E2E and vitest unit coverage to catch any accidental regression.

**Test File Location**: N/A

**Theme Variant URLs**: N/A

## VS Code Webview E2E Testing

None — no extension workflow changes. The VS Code extension imports `@debrief/components`/`@debrief/utils` by name; the public API names are preserved (FR-010). Existing webview E2E tests provide regression coverage; no new workflow spec is added.

**Testing Strategy**: rely on existing `tests/e2e/*.spec.ts` to confirm that track rendering in the webview remains identical after the refactor.

**Test File Location**: N/A

**Infrastructure**: unchanged.

## Complexity Tracking

No Constitution Check violations to justify. One scope-expansion item needs an explicit risk note:

| Item | Why added | Simpler alternative rejected because |
|------|-----------|--------------------------------------|
| FR-014 (narrow `PositionStyle.symbol` / `PositionStyleOverride.symbol` in generated TypeScript) | Root-cause fix for the hand-typed-union drift. Without narrowing, every producer of a PositionStyleOverride must either trust callers, run the runtime guard (FR-015), or hand-type its own union — which re-creates the problem we're trying to kill. | (1) "Hand-edit the generated file" — breaks the `generated/` invariant. (2) "Modify `gen-typescript` upstream" — out of our control. (3) "Drop out of auto-gen for these two attributes" — selective manual handling is a maintenance trap. (4) "Live with `string`" — accepted as the fallback if R-011 fails, but would leave the refactor half-done. |
| FR-017 adherence-test (R-012 / 17B) instead of 17A enum removal | Respects feature #091's prior architectural decision (`specs/091-tool-parameter-context-menus/research.md` RQ-7) that `MarkerSymbolEnum` is semantically distinct from `PointShapeEnum`. Pins value-set equality via test rather than by unilateral deletion. | "Just delete `MarkerSymbolEnum`" would overturn a prior ADR without conversation with its stakeholders — not appropriate mid-refactor. |
