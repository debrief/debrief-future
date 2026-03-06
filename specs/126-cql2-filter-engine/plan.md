# Implementation Plan: Client-Side CQL2 Filter Engine

**Branch**: `126-cql2-filter-engine` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/126-cql2-filter-engine/spec.md`

## Summary

Implement a client-side CQL2 filter engine in TypeScript that evaluates AND/OR filter expressions against STAC item arrays. Supports all 9 SRD filter types (vessel class with hierarchical taxonomy expansion, tags, author, duration buckets, title search, track names, nationalities, collection). Produces CQL2 JSON serialisation. Lives in `@debrief/components` for use by Storybook, filter bar (#127), and catalog overview.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: `cql2-filters-parser` (CQL2 parsing/serialisation, zero-dep ES module)
**Storage**: N/A (in-memory filtering of STAC item arrays)
**Testing**: vitest (existing `shared/components` test infrastructure)
**Target Platform**: Browser (Storybook, VS Code webview, web-shell)
**Project Type**: Library module within existing pnpm workspace package
**Performance Goals**: Filter 100 items in <10ms (mock data set from #125)
**Constraints**: Offline-capable, no network calls, zero side effects
**Scale/Scope**: 100 mock STAC items, 9 filter types, 1 level of OR nesting

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All filtering runs client-side, no network | PASS | Pure in-memory evaluation |
| I.4 Reproducibility | Same inputs → same results | PASS | Deterministic filtering, no randomness |
| II.1 Single source of truth | Types derived from schema | PARTIAL | `StacBrowserItem` extends `CatalogOverviewItem`; extension properties match #125 spec. Full LinkML derivation deferred to #125's schema module |
| IV.1 Services never touch UI | Filter engine returns data only | PASS | No UI rendering, pure filter function |
| VI.2 Services require unit tests | Tests for all filter types | PASS | Comprehensive vitest suite planned |
| VII.1 Tests before implementation | Test-first approach | PASS | Test files written before implementation |
| VIII.1 Specs before code | This spec exists | PASS | |
| IX.1 Minimal dependencies | One justified dependency | PASS | `cql2-filters-parser`: zero-dep, MIT, actively maintained |
| XV.1 Explicit types | All types fully annotated | PASS | Strict TypeScript, no `any` |

**Post-Phase-1 Re-check**: All gates pass. `StacBrowserItem` type is hand-authored but mirrors the #125 extension spec exactly. When #125's LinkML schema module generates TypeScript types, `StacBrowserItem` can be replaced with the generated type.

## Project Structure

### Documentation (this feature)

```text
specs/126-cql2-filter-engine/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── filter-engine.ts # TypeScript contract types
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   └── filter-engine/
│       ├── index.ts              # Public exports
│       ├── types.ts              # FilterExpression, Predicate, OrGroup, StacBrowserItem
│       ├── engine.ts             # createFilterEngine factory + evaluation
│       ├── matchers.ts           # Per-filter-type matching functions
│       ├── taxonomy.ts           # Vessel taxonomy descendant expansion
│       ├── cql2-json.ts          # CQL2 JSON serialisation
│       └── __tests__/
│           ├── engine.test.ts    # AND/OR evaluation tests
│           ├── matchers.test.ts  # Per-filter-type matcher tests
│           ├── taxonomy.test.ts  # Hierarchical expansion tests
│           └── cql2-json.test.ts # CQL2 JSON serialisation tests
└── package.json                  # Add cql2-filters-parser dependency
```

**Structure Decision**: Module within existing `@debrief/components` package. No new workspace package needed. Exported via `@debrief/components/filter-engine` subpath export.

## Media Components

None — infrastructure/library feature with no visual components.

## Storybook E2E Testing

None — no interactive UI components. The filter engine is exercised via vitest unit tests.

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No constitutional violations to justify.
