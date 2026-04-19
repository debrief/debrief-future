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

A user opens a plot in the VS Code extension. The map panel auto-zooms to fit the loaded features exactly as it did before consolidation — including the case where some features in the collection have no geometry (which previously triggered a null-guard only present in the VS Code copy). No regression is visible to the end user.

**Why this priority**: The VS Code map's zoom-to-bounds is the only in-tree production consumer of the duplicated utility. If consolidation regressed it, the user-facing impact would be immediate: a thrown exception, a blank map, or the wrong viewport on import. This is the gating behavioural guarantee for the cleanup.

**Independent Test**: With the change in place, open a sample plot in the VS Code extension preview and confirm the map auto-zooms to the feature extent. Repeat with a feature collection that contains at least one feature whose `geometry` is null/missing — the map must still auto-zoom to the bounds of the remaining features without throwing.

**Acceptance Scenarios**:

1. **Given** a feature collection where every feature has a valid geometry, **When** the map panel calculates bounds via the consolidated utility, **Then** it returns the same bounding box that the VS Code-local utility would have returned before this change.
2. **Given** a feature collection where one or more features have a missing/null geometry, **When** the map panel calculates bounds via the consolidated utility, **Then** the offending features are skipped silently and bounds are computed from the rest (no exception, same result the VS Code-local utility produced).
3. **Given** a feature collection where every feature lacks a usable geometry, **When** the map panel calculates bounds, **Then** the utility returns `null` and the map panel handles that gracefully (consistent with current behaviour).

### User Story 3 — VS Code feature types pass through without casts or type errors (Priority: P2)

A developer working in `apps/vscode` passes the VS Code feature array (whose element type derives from `SafeFeature`) into the consolidated `calculateBounds` and the code type-checks cleanly without `as`-casts or local re-aliasing. The shared utility accepts the input shape that real consumers actually have, and the untyped portion of that shape (`coordinates: unknown`) is narrowed through an explicit, reviewable gate at the utility's entry point rather than silently laundered.

**Why this priority**: Without this, the consolidation forces every caller to add type-laundering boilerplate, which is exactly the smell the original duplication arose from. Resolving the input-type mismatch is what makes "import from `@debrief/utils`" a sustainable answer rather than a temporary one. The explicit narrowing gate is what makes the widened input type constitutional (Article XV.5 forbids untyped data entering application code without a typed-model boundary).

**Independent Test**: After consolidation, `apps/vscode/src/webview/mapPanel.ts` imports `calculateBounds` and `mergeBounds` from `@debrief/utils` and passes its existing feature array directly into them. The VS Code package's type-check (`tsc --noEmit`) passes with no new errors and no new `as`-casts at the call site. A code reviewer inspecting the utility's source can point to a single, named narrowing step that turns untyped coordinate data into typed coordinate data before any other code sees it.

**Acceptance Scenarios**:

1. **Given** the consolidated utility's input type, **When** the VS Code map panel passes its feature array (whose element type derives from `SafeFeature`) into `calculateBounds`, **Then** the call type-checks without an explicit cast at the call site.
2. **Given** the consolidated codebase, **When** the VS Code package runs its type-check, **Then** no new type errors are introduced compared to the pre-change baseline.
3. **Given** the consolidated utility's source, **When** a reviewer reads the function that handles each feature's coordinates, **Then** there is exactly one explicit narrowing step (visibly named or commented) that converts the untyped `coordinates` input into a typed shape before the per-geometry-type branches run — no `as unknown as X` chain, no `any` escape hatch.

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
