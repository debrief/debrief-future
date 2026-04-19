# Feature Specification: Consolidate bounds utilities into @debrief/utils

**Feature Branch**: `200-bounds-consolidation` (authored on harness branch `claude/specify-item-200-Tqp0d`)
**Created**: 2026-04-19
**Status**: Draft (v2 — post `/speckit.review`)
**Input**: User description: "item 200 from the backlog — Consolidate bounds utilities into @debrief/utils."

<!-- Skeleton. Each section below is a placeholder to be filled in sequentially. -->

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single canonical bounds utility for the generic-GeoJSON call sites (Priority: P1)

A developer maintaining the platform searches the monorepo for `calculateBounds` to fix a bug or extend behaviour in code that works on generic GeoJSON feature arrays (the shape produced by the import pipeline and the shape the VS Code map panel consumes). Today they find two near-identical implementations — one in `@debrief/utils` and one in `apps/vscode/src/utils/` — with subtle behavioural drift (the VS Code copy carries a null-guard the shared copy lacks). After this change there is exactly one implementation for this family of call sites, in `@debrief/utils`, and both the VS Code map panel and any future generic-GeoJSON consumer import from there.

**Why this priority**: Drift between the two copies has already produced a real behavioural divergence (the null-guard). Every additional day the duplication exists is another opportunity for a fix to land in only one place. This is the core intent of the backlog item.

**Scope note**: `shared/components/src/utils/bounds.ts` is a **separate** `calculateBounds` implementation that operates on LinkML-typed `DebriefFeature` arrays and carries additional spatial helpers (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`). It is legitimately different from the generic-GeoJSON utility covered here (different input type, different behaviour, larger helper surface), and is out of scope for this work. A separate backlog item tracks its consolidation (see "Out of Scope" below).

**Independent Test**: Search the monorepo for definitions of `calculateBounds` and `mergeBounds` on generic-GeoJSON inputs; exactly one match per symbol must exist under `shared/utils/`. The file `apps/vscode/src/utils/bounds.ts` and its dedicated unit test must be absent.

**Acceptance Scenarios**:

1. **Given** the consolidated codebase, **When** a developer greps the monorepo for `export function calculateBounds` under `shared/utils/` and `apps/`, **Then** exactly one definition is returned, located under `shared/utils/`.
2. **Given** the consolidated codebase, **When** a developer greps the monorepo for `export function mergeBounds`, **Then** exactly one definition is returned, located under `shared/utils/`. (`mergeBounds` only ever existed in the generic-GeoJSON family; the `shared/components` utility does not export it.)
3. **Given** the consolidated codebase, **When** the monorepo is listed for files matching `apps/vscode/**/bounds.ts` and `apps/vscode/**/bounds.test.ts`, **Then** no matches are returned.

### User Story 2 — VS Code map auto-zoom continues to work (Priority: P1)

*TODO*

### User Story 3 — VS Code feature types pass through without casts or type errors (Priority: P2)

*TODO*

### User Story 4 — `fitToSelection` honours every geometry type (Priority: P2)

*TODO*

### Edge Cases

*TODO*

## Requirements *(mandatory)*

### Functional Requirements

*TODO*

### Key Entities

*TODO*

## Success Criteria *(mandatory)*

### Measurable Outcomes

*TODO*

## Assumptions

*TODO*

## Out of Scope

*TODO*

## Notes

*TODO — including the supersede note for `origin/200-bounds-consolidation` (commits `b55c1d7e`, `38c2170c`).*
