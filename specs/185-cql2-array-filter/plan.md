# Implementation Plan: CQL2 `array_filter` Evaluator

**Branch**: `185-cql2-array-filter` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/185-cql2-array-filter/spec.md`

## Summary

Extend the existing CQL2 filter engine (`shared/components/src/filter-engine/`) to evaluate `array_filter()` expressions — compound per-element predicates on the `debrief:platforms[]` array. This adds a new `ArrayFilterPredicate` type to the filter expression model, a per-element compound matcher, CQL2 JSON serialization/deserialization for `array_filter`, and comprehensive unit tests. The existing `FilterExpression` model, evaluation logic, and all 11 current filter types remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components package)
**Primary Dependencies**: `@debrief/schemas` (PlatformRecord type), `cql2-filters-parser` 0.9.14 (FunctionExpression AST for future parsing integration)
**Storage**: N/A (pure in-memory evaluation)
**Testing**: vitest (existing test framework for shared/components)
**Target Platform**: Browser (client-side filter engine used by FilterBar, CatalogOverview, Storybook)
**Project Type**: Existing pnpm workspace package (`@debrief/components`)
**Performance Goals**: Evaluation of 100-item catalog with `array_filter` completes within same performance envelope as existing filter types
**Constraints**: Additive extension only — no breaking changes to existing types or evaluation semantics
**Scale/Scope**: ~6 files modified/added, ~20+ new unit tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Pure client-side evaluation, no network calls |
| I. Defence-Grade Reliability | No silent failures | PASS | Null/missing fields → false (explicit non-match), not errors |
| II. Schema Integrity | Single source of truth | PASS | Uses PlatformRecord from LinkML-generated `@debrief/schemas` |
| II. Schema Integrity | Schema tests mandatory | PASS | No schema changes — consumes existing types |
| IV. Architectural Boundaries | Services never touch UI | PASS | Filter engine is a shared utility, not a service |
| VI. Testing | Services require unit tests | PASS | 20+ new unit tests planned |
| VI. Testing | CI MUST pass | PASS | All existing tests unchanged; new tests added |
| VII. Test-Driven AI Collaboration | Tests before implementation | PASS | Test cases defined in spec acceptance scenarios |
| VIII. Documentation | Specs before code | PASS | Spec complete at spec.md |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new dependencies — extends existing code |
| XV. Strict Type Safety | Explicit types everywhere | PASS | All new types explicitly defined; no `any` |
| XV. Strict Type Safety | Strict mode mandatory | PASS | Package already has `strict: true` |

**Gate Result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/185-cql2-array-filter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── array-filter-api.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/filter-engine/
├── types.ts             # MODIFIED: Add ArrayFilterPredicate, CompoundPredicate types
├── engine.ts            # MODIFIED: Add array_filter evaluation branch
├── matchers.ts          # MODIFIED: Add matchArrayFilter() function
├── cql2-json.ts         # MODIFIED: Add array_filter serialization + deserialization
├── index.ts             # MODIFIED: Export new types
└── __tests__/
    ├── array-filter.test.ts      # NEW: Compound predicate evaluation tests
    ├── array-filter-cql2.test.ts # NEW: Serialization/deserialization round-trip tests
    ├── engine.test.ts            # UNCHANGED: Existing tests still pass
    ├── matchers.test.ts          # UNCHANGED: Existing tests still pass
    ├── cql2-json.test.ts         # UNCHANGED: Existing tests still pass
    ├── integration.test.ts       # UNCHANGED: Existing tests still pass
    └── taxonomy.test.ts          # UNCHANGED: Existing tests still pass
```

**Structure Decision**: All changes are within the existing `shared/components/src/filter-engine/` module. No new packages, no new directories outside the existing structure. Two new test files isolate `array_filter` test coverage from existing test suites.

## Media Components

None — backend/infrastructure feature. The `array_filter` evaluator is a non-visual engine extension. UI components that consume it (FilterBar platform chips) are covered by #186.

## Storybook E2E Testing

None — no interactive UI components. The filter engine has no visual representation; it is tested entirely through unit tests.

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No constitution violations to justify.
