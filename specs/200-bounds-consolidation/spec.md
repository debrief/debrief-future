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

A user selects one or more features on the VS Code map and invokes "zoom to selection". Today, the map zooms correctly only when the selected features are Points or LineStrings — selections that contain Polygon, MultiPoint, MultiLineString, or MultiPolygon features are silently under-represented (the map zooms to the Point/LineString subset and ignores the rest, or fails to zoom if the selection contains no Point/LineString). After this change, "zoom to selection" honours every geometry type the consolidated utility supports.

**Why this priority**: The VS Code map panel already contains a second, inline bounds calculation in `fitToSelection()` that is limited to Point and LineString and silently skips everything else — a fourth copy of the "compute bounds from features" logic, with a latent correctness bug. Once the consolidated utility exists, retiring this inline copy is a one-line replacement that fixes the silent miss at the same time. Folding it into this PR is cheaper than capturing it as a separate follow-up, and aligns with the constitution's "no silent failures" principle (Article I.3).

**Why P2 (not P1)**: The silent miss is a pre-existing bug that the backlog text did not explicitly scope into #200. We are choosing to fix it here because the cost is marginal, but the primary goal of this work (retiring the duplicate utility) succeeds even if this user story were cut. P1 stories gate the PR; P2 completes it.

**Independent Test**: With the change in place, open a plot in the VS Code extension that contains a mix of geometry types (at minimum one Polygon or MultiPolygon feature and one Point or LineString feature). Select a feature of every type represented in the plot, one type at a time, and invoke "zoom to selection". The map must zoom to a viewport that tightly contains each selected feature's extent — regardless of its geometry type.

**Acceptance Scenarios**:

1. **Given** a selection containing only Point and LineString features, **When** the user invokes "zoom to selection", **Then** the map zooms to a viewport that contains every selected feature — identical to the behaviour users see today.
2. **Given** a selection containing one or more Polygon features, **When** the user invokes "zoom to selection", **Then** the map zooms to a viewport that contains the full extent of every selected Polygon (today, selected Polygons contribute nothing and are silently missed).
3. **Given** a selection containing one or more MultiPolygon features, **When** the user invokes "zoom to selection", **Then** the map zooms to a viewport that contains the union of all polygons in every selected MultiPolygon (today, selected MultiPolygons contribute nothing).
4. **Given** a selection containing one or more MultiPoint or MultiLineString features, **When** the user invokes "zoom to selection", **Then** the map zooms to a viewport that contains the union of all sub-elements (today, selected Multi* features contribute nothing).
5. **Given** a selection containing at least one feature whose `geometry` is null, **When** the user invokes "zoom to selection", **Then** that feature is skipped silently and the map zooms to the remaining selected features — no exception, no empty-selection fallback triggered unless every selected feature lacks a usable geometry.
6. **Given** an empty selection, **When** the user invokes "zoom to selection", **Then** the existing early-return behaviour is preserved (no change in map viewport).

### Edge Cases

- A feature's `geometry` is `null` or `undefined` → that feature is skipped; the rest of the collection still contributes to the bounds. (This was the null-guard exclusive to the VS Code copy and must be preserved in the consolidated utility — see User Story 2.)
- The feature array is empty → utility returns `null`; callers must continue to handle `null` exactly as they do today (for the import-path caller, the VS Code map falls back to the existing `currentPlot.bbox`; for the selection caller, `fitToSelection` retains its existing early-return).
- Every feature in the array has unusable geometry (null, missing, or a coordinate set that produces no usable lon/lat pair) → utility returns `null`; same behaviour as today.
- One of the bounds inputs to `mergeBounds` is `null` → the other bounds is returned unchanged (existing behaviour, preserved).
- A feature has a supported geometry type with malformed coordinates (e.g. a Point whose coordinates array has fewer than two numeric elements, or a numeric value that is `NaN`) → the malformed coordinate is skipped silently at the explicit narrowing step; the feature still contributes any other well-formed coordinates it has. (This matches the current behaviour of both pre-change copies. The narrowing step is the point at which "skipped silently" becomes "skipped deliberately and reviewably" — see User Story 3.)
- A feature has a geometry type the utility does not branch on (e.g. `GeometryCollection`, which is valid GeoJSON) → that feature contributes nothing to the bounds, same as today. This is a pre-existing limitation; it is not introduced or fixed by this work. If it becomes visible to users, it is a separate defect to file.
- The user's selection contains only features whose geometry types all happen to be unsupported or null → `fitToSelection` ends up with `null` bounds and must handle that without breaking the viewport (unchanged-viewport fallback is acceptable and matches the empty-selection case).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For the family of call sites that operate on **generic GeoJSON feature arrays** (i.e. not the LinkML-typed `DebriefFeature` consumers of `shared/components`), the monorepo MUST contain exactly one implementation of `calculateBounds` and exactly one implementation of `mergeBounds`, both exported from `@debrief/utils`.
- **FR-002**: The consolidated `calculateBounds` MUST skip any feature whose `geometry` is missing, `null`, or `undefined` rather than throw. This preserves, for every consumer, the null-guard behaviour that was previously exclusive to the VS Code copy.
- **FR-003**: The local copy at `apps/vscode/src/utils/bounds.ts` MUST be removed.
- **FR-004**: The duplicate test file at `apps/vscode/tests/unit/bounds.test.ts` MUST be removed; equivalent coverage MUST be present in `shared/utils/tests/bounds.test.ts`. That coverage MUST include a regression test for the preserved null-geometry behaviour (FR-002).
- **FR-005**: `apps/vscode/src/webview/mapPanel.ts` MUST import `calculateBounds` and `mergeBounds` from `@debrief/utils` (not from a VS Code-local path).
- **FR-006**: The consolidated utility MUST accept the VS Code feature array (whose element type derives from `SafeFeature`) without requiring an `as`-cast at the call site. The reconciliation of `SafeFeature` and `GeoJSONFeature` MUST happen at the `@debrief/utils` boundary (e.g. by widening the input type to a structural minimum); the precise widening shape is an implementation choice for the planning phase.
- **FR-007**: The consolidated utility MUST perform **explicit, reviewable type narrowing** on any untyped portion of its input (in particular, coordinate values typed as `unknown`) at a single named gate at the function's entry point — before any per-geometry-type branch runs. The narrowing step MUST NOT use `any`, MUST NOT use double-cast patterns (`as unknown as X`), and SHOULD be anchored in source to Article XV.5 of the constitution via a comment or a named helper. (This is what makes the widened input type of FR-006 constitutional.)
- **FR-008**: The inline bounds calculation in `apps/vscode/src/webview/mapPanel.ts::fitToSelection()` MUST be replaced with a call to the consolidated `calculateBounds`. After the change, `fitToSelection` MUST honour every geometry type the consolidated utility supports (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon) — the previous silent-skip of non-Point/non-LineString geometries in the selection MUST no longer occur.
- **FR-009**: The existing early-return behaviour of `fitToSelection` for an empty selection MUST be preserved — the map viewport MUST NOT change if no features are selected.
- **FR-010**: All other existing call sites of `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, and `isValidBounds` (across both `apps/vscode` and `shared/`) MUST continue to compile and behave identically after the change. `boundsToLeaflet` and `isValidBounds` signatures and behaviour MUST NOT change.
- **FR-011**: The repository's lint, type-check, and full test suites MUST pass on the change with no new errors or warnings introduced.
- **FR-012**: The change MUST NOT alter the publicly observable behaviour of the VS Code map's auto-zoom on plot open for any feature collection that already worked before the change. (`fitToSelection` is the one explicit exception to "no observable behaviour change" — its per-geometry-type correctness is intentionally improved per FR-008.)

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
