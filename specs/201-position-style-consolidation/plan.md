# Implementation Plan: Consolidate ResolvedPositionStyle and Align with Schema

**Branch**: `201-position-style-consolidation` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/201-position-style-consolidation/spec.md`

## Summary

Collapse the two drifted `ResolvedPositionStyle` interfaces (one in `@debrief/utils`, one in `@debrief/components`) into a single canonical definition in `@debrief/utils`. Type its `symbol` field via the LinkML-generated `PointShapeEnum` from `@debrief/schemas` (not a hand-typed string-literal union). Standardise on the field name `labelText` across the resolver, its tests, and all renderers. Behaviour-preserving refactor; no schema, rendering logic, or runtime-API changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict).
**Primary Dependencies**: `@debrief/utils` (canonical location for the type), `@debrief/components` (local duplicate to be removed; already depends on `@debrief/utils` per `shared/components/package.json`), `@debrief/schemas` (consumed for `PointShapeEnum`; already generated from `shared/schemas/src/linkml/common.yaml`).
**Storage**: N/A (types only; no persistent data).
**Testing**: Existing `shared/utils/tests/interval.test.ts` (vitest). Existing `shared/components/e2e/*.spec.ts` (Playwright, theme variants) cover the consumer side unchanged. No new tests required, but existing vitest assertions must be updated from `.label` → `.labelText` (5 call sites identified across `shared/utils/tests/interval.test.ts`).
**Target Platform**: Browser (webview) and Node (unit tests); monorepo packages consumed by `apps/vscode`, `apps/web-shell`, `apps/nl-demo`, `apps/spec-navigator`.
**Project Type**: Single monorepo; shared libraries under `shared/`, apps under `apps/`. The refactor is scoped to `shared/utils/` and `shared/components/` (consumer updates only in those two plus index barrels).
**Performance Goals**: N/A — same compiled output shape, same runtime values. Intent is zero runtime delta on the sample catalog (see SC-004).
**Constraints**: Constitution Article XV (strict type safety) — no `any`/`as unknown as` shortcuts to paper over the rename; constitution Article II (schema integrity) — symbol type MUST derive from the generated schema enum; CI gate (Article VI and the `CLAUDE.md` §"Before Pushing" commands) — lint, typecheck, vitest, Playwright E2E all green.
**Scale/Scope**: ~4 source files change (`shared/utils/src/types.ts`, `shared/utils/src/interval.ts`, `shared/components/src/utils/time.ts`, `shared/components/src/index.ts`) + 1 test file (`shared/utils/tests/interval.test.ts`). Exactly 1 removed interface declaration; exactly 5 renamed assertions; exactly 1 type field rename on the public interface; estimated < 60 lines of code touched in total.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution (`.specify/memory/constitution.md`, v1.2.0) articles evaluated against this refactor:

| Article | Applies? | Verdict | Notes |
|---------|----------|---------|-------|
| I. Defence-Grade Reliability | Yes | ✅ Pass | No network, no silent failures introduced. Pure type consolidation — behaviour identical on same inputs. |
| II. Schema Integrity | **Yes (central)** | ✅ Pass | The whole point: the `symbol` field moves from a hand-typed union to a schema-derived type from `@debrief/schemas`. No hand-written representation. No schema version change (no schema content modified). |
| III. Data Sovereignty | No | N/A | No data transformations, no provenance, no exports. |
| IV. Architectural Boundaries | Yes | ✅ Pass | Change is entirely inside shared TypeScript libraries. No service/frontend boundary crossings modified. No new MCP coupling. |
| V. Extensibility | Yes | ✅ Pass | Extensions that render positions consume `@debrief/utils` or `@debrief/components` — both continue to export `ResolvedPositionStyle`. No breaking change for in-repo extensions. |
| VI. Testing | Yes | ✅ Pass | Existing resolver tests are updated (not removed). CI (lint + tsc + vitest + Playwright E2E) is run per `CLAUDE.md` §"Before Pushing" before push. |
| VII. Test-Driven AI Collaboration | Yes | ✅ Pass | Acceptance criteria in spec.md (FR-001..FR-011, SC-001..SC-006) define "done"; vitest assertions are the executable spec. |
| VIII. Documentation | Yes | ✅ Pass | Spec, plan, research, data-model, quickstart committed under `specs/201-...`. No ADR required (no architectural choice being changed, only a drift being removed). |
| IX. Dependencies | Yes | ✅ Pass | Zero new dependencies. Uses existing workspace dep `@debrief/schemas` (already depended on by `@debrief/components` per `shared/components/package.json`; verified to be transitively available to `@debrief/utils` or added if not — see Phase 0 R-003). |
| X. Security | No | N/A | No secrets, no credentials, no network. |
| XI. Internationalisation | No | N/A | No user-facing strings changed. |
| XII. Community Engagement | Yes | ✅ Pass | Planning post + LinkedIn draft generated (Phase 2). |
| XIII. Contribution Standards | Yes | ✅ Pass | Single atomic commit per logical change, PR review, CI green. |
| XIV. Pre-Release Freedom | Yes | ✅ Pass | Pre-v4.0.0; field rename `label → labelText` is a permitted breaking change for any in-repo caller. Backlog explicitly scopes the rename (FR-004, FR-007). |
| XV. Strict Type Safety | **Yes (central)** | ✅ Pass | Resolves a drift that previously relied on `as` casts between mismatched unions. The new canonical type is concretely linked to the schema enum, narrowing the drift surface rather than widening it. No `any` is introduced; no `as unknown as` bridges are added. Existing `as` casts in renderers (e.g., `SymbolShape` cast in `PositionSymbolsLayer.tsx`) are either removed or verified still valid against the new, wider type. |

**Initial Gate (pre-Phase 0): PASS.** No violations, no deviations requiring justification. Complexity Tracking section left empty.

**Post-Design Gate (after Phase 1 artefacts): PASS.** The three design artefacts (research.md, data-model.md, contracts/resolved-position-style.ts, quickstart.md) together describe exactly one new type, no new dependencies, no new tests, no new workflows. None of the decisions in research.md introduce a new violation — R-001's template-literal approach keeps the type schema-derived (Article II) and concrete (Article XV), R-002 deliberately narrows scope to avoid behavioural risk (Article VI), R-003 adds no dep (Article IX), R-004/R-006 reuse existing test coverage (Article VI). Complexity Tracking remains empty.

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

This is a focused cross-package refactor. The only directories touched:

```text
shared/
├── utils/
│   └── src/
│       ├── types.ts          # CANONICAL ResolvedPositionStyle lives here
│       └── interval.ts       # resolver writes `labelText` instead of `label`
│   └── tests/
│       └── interval.test.ts  # 5 assertions renamed from `.label` to `.labelText`
└── components/
    └── src/
        ├── utils/
        │   └── time.ts       # LOCAL ResolvedPositionStyle interface DELETED; imports from @debrief/utils
        └── index.ts          # barrel re-export source updated: `from './utils/time'` → `from '@debrief/utils'` (for the type only)
```

Renderers (`shared/components/src/MapView/PositionSymbolsLayer.tsx`, `shared/components/src/TimelineGanttView/*`, etc.) already read `.labelText` and rely on the 5-shape union — no source change expected. Any renderer that proves to need an adjustment (e.g., a `switch` that only covered 3 shapes) is updated in the same PR.

**Structure Decision**: Single-project monorepo; no new packages, no new directories. Work stays within `shared/utils/` and `shared/components/`. No `apps/` or `services/` source changes are planned (the refactor is transparent to every app because the public name `ResolvedPositionStyle` is preserved on both packages' barrels).

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

Empty — no Constitution Check violations to justify.
