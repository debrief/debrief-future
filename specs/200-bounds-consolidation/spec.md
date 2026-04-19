# Feature Specification: Consolidate bounds utilities into @debrief/utils

**Feature Branch**: `200-bounds-consolidation`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "item 200 from the backlog — Consolidate bounds utilities into @debrief/utils. `apps/vscode/src/utils/bounds.ts` is a ~116-line 95%-identical copy of `shared/utils/src/bounds.ts`; vscode version has a null-guard the shared version is missing. Lift null-guard into utils, reconcile `SafeFeature`/`GeoJSONFeature` at the call site, delete the vscode copy + duplicate test, switch `mapPanel.ts` to import from `@debrief/utils`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One canonical bounds utility for the monorepo (Priority: P1)

A developer maintaining the platform searches the monorepo for `calculateBounds` to fix a bug or extend behaviour. Today they find two near-identical implementations — one in `shared/utils` and one inside `apps/vscode` — with subtle behavioural drift (the VS Code copy carries a null-guard the shared copy lacks). After this change there is exactly one implementation, in `@debrief/utils`, that every consumer in the monorepo imports from.

**Why this priority**: Drift between the two copies has already produced a real divergence (the missing null-guard in the shared version). Every additional day the duplication exists is another opportunity for fixes to land in only one place. This is the whole point of the cleanup item.

**Independent Test**: Search the monorepo for definitions of `calculateBounds` and `mergeBounds`; exactly one match per symbol must exist, and it must live in `shared/utils/src/bounds.ts`. The local `apps/vscode/src/utils/bounds.ts` and its dedicated unit test must be absent.

**Acceptance Scenarios**:

1. **Given** the consolidated codebase, **When** a developer greps the monorepo for `export function calculateBounds`, **Then** exactly one definition is returned, located under `shared/utils/`.
2. **Given** the consolidated codebase, **When** a developer greps the monorepo for `export function mergeBounds`, **Then** exactly one definition is returned, located under `shared/utils/`.
3. **Given** the consolidated codebase, **When** the monorepo is listed for files matching `apps/vscode/**/bounds.ts` and `apps/vscode/**/bounds.test.ts`, **Then** no matches are returned.

---

### User Story 2 - VS Code map auto-zoom continues to work (Priority: P1)

A user opens a plot in the VS Code extension. The map panel auto-zooms to fit the loaded features exactly as it did before consolidation — including the case where some features in the collection have no geometry (which previously triggered a null-guard only present in the VS Code copy). No regression is visible to the end user.

**Why this priority**: The VS Code map's zoom-to-bounds is the only in-tree consumer of the duplicated utility. If consolidation regressed it, the user-facing impact would be immediate: a thrown error, a blank map, or the wrong viewport on import. This is the gating behavioural guarantee for the cleanup.

**Independent Test**: With the change in place, open a sample plot in the VS Code extension preview and confirm the map auto-zooms to the feature extent. Repeat with a feature collection that contains at least one feature whose `geometry` is null/missing — the map must still auto-zoom to the bounds of the remaining features without throwing.

**Acceptance Scenarios**:

1. **Given** a feature collection where every feature has a valid geometry, **When** the map panel calculates bounds via the consolidated utility, **Then** it returns the same bounding box that the VS Code-local utility would have returned before this change.
2. **Given** a feature collection where one or more features have a missing/null geometry, **When** the map panel calculates bounds via the consolidated utility, **Then** the offending features are skipped silently and bounds are computed from the rest (no exception, same result the VS Code-local utility produced).
3. **Given** a feature collection where every feature lacks a usable geometry, **When** the map panel calculates bounds, **Then** the utility returns `null` and the map panel handles that gracefully (consistent with current behaviour).

---

### User Story 3 - VS Code feature types pass through without casts or type errors (Priority: P2)

A developer working in `apps/vscode` passes the VS Code feature array (whose element type derives from `SafeFeature`) into the consolidated `calculateBounds` and the code type-checks cleanly without `as`-casts or local re-aliasing. The shared utility accepts the input shape that real consumers actually have.

**Why this priority**: Without this, the consolidation forces every caller to add type-laundering boilerplate, which is exactly the smell the original duplication arose from. Resolving the input-type mismatch is what makes "import from `@debrief/utils`" a sustainable answer rather than a temporary one.

**Independent Test**: After consolidation, `apps/vscode/src/webview/mapPanel.ts` imports `calculateBounds` and `mergeBounds` from `@debrief/utils` and passes its existing feature array directly into them. The VS Code package's type-check (`tsc --noEmit`) passes with no new errors and no new casts at the call site.

**Acceptance Scenarios**:

1. **Given** the consolidated utility's input type, **When** the VS Code map panel passes its feature array (whose element type derives from `SafeFeature`) into `calculateBounds`, **Then** the call type-checks without an explicit cast at the call site.
2. **Given** the consolidated codebase, **When** the VS Code package runs its type-check, **Then** no new type errors are introduced compared to the pre-change baseline.

---

### Edge Cases

- A feature's `geometry` is `null` or `undefined` → that feature is skipped; the rest of the collection still contributes to the bounds. (This was the null-guard exclusive to the VS Code copy and must be preserved in the consolidated utility.)
- The feature array is empty → utility returns `null`; the map panel must continue to handle `null` exactly as it does today.
- Every feature in the array has unusable geometry (null, missing, or a coordinate set that produces no usable lon/lat pair) → utility returns `null`; same behaviour as today.
- One of the bounds inputs to `mergeBounds` is `null` → the other bounds is returned unchanged (existing behaviour, preserved).
- A feature has a supported geometry type with malformed coordinates (e.g. a Point whose coordinates array has fewer than two numeric elements) → the malformed coordinate is skipped silently; the feature still contributes any other valid coordinates it has. (This matches the current behaviour of both copies.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The monorepo MUST contain exactly one implementation of `calculateBounds` and exactly one implementation of `mergeBounds`, both exported from `@debrief/utils`.
- **FR-002**: The consolidated `calculateBounds` MUST skip any feature whose `geometry` is missing, `null`, or `undefined`, rather than throw, so the previously-VS-Code-only null-guard behaviour applies to every consumer.
- **FR-003**: The local copy at `apps/vscode/src/utils/bounds.ts` MUST be removed.
- **FR-004**: The duplicate test file at `apps/vscode/tests/unit/bounds.test.ts` MUST be removed; equivalent coverage MUST be present in `shared/utils/tests/bounds.test.ts` (including a regression test for the preserved null-guard behaviour).
- **FR-005**: `apps/vscode/src/webview/mapPanel.ts` MUST import `calculateBounds` and `mergeBounds` from `@debrief/utils` (not from a VS Code-local path).
- **FR-006**: The consolidated utility MUST accept the VS Code feature array (whose element type derives from `SafeFeature`) without requiring an `as`-cast at the call site. The reconciliation of `SafeFeature` and `GeoJSONFeature` SHOULD happen at the `@debrief/utils` boundary (e.g. by widening the input type to a structural minimum, or by giving both feature types a shared structural base inside `@debrief/utils`); the precise mechanism is an implementation choice for the planning phase.
- **FR-007**: All other existing call sites of `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, and `isValidBounds` (across both `apps/vscode` and `shared/`) MUST continue to compile and behave identically after the change.
- **FR-008**: The repository's lint, type-check, and full test suites MUST pass on the change with no new errors or warnings introduced.
- **FR-009**: The change MUST NOT alter the publicly observable behaviour of the VS Code map's auto-zoom for any feature collection that already worked before the change.

### Key Entities *(include if feature involves data)*

- **GeoJSON Feature**: A geospatial record with an optional `geometry` (containing a `type` such as Point/LineString/Polygon/Multi*, plus a coordinates payload) and arbitrary properties. The bounds utility cares only about the geometry's coordinates and tolerates a missing/null geometry by skipping the feature.
- **Bounds**: A four-number tuple `[minLon, minLat, maxLon, maxLat]` representing the smallest axis-aligned rectangle containing all input coordinates, or `null` when no usable coordinate exists in the input. Treated as an opaque value by callers; the utility owns its construction.
- **SafeFeature vs GeoJSONFeature**: Two existing in-tree feature types that describe the same underlying entity with slightly different shapes. The cleanup must let both reach the consolidated utility without per-call-site type laundering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A monorepo-wide search returns exactly one definition of `calculateBounds` and exactly one definition of `mergeBounds` (both inside `shared/utils/`).
- **SC-002**: `apps/vscode` contains no file matching `**/bounds.ts` and no file matching `**/bounds.test.ts`.
- **SC-003**: Approximately 116 lines of duplicated implementation code (the body of the VS Code-local `bounds.ts`) and the duplicated unit-test file are removed from `apps/vscode`, with no equivalent code reintroduced elsewhere.
- **SC-004**: The full repository CI gate (lint, type-check, unit tests, end-to-end tests) passes on the change with no new failures and no new warnings introduced by the consolidation.
- **SC-005**: A manual smoke test of opening a plot in the VS Code extension confirms the map's zoom-to-bounds behaviour is unchanged, including for a feature collection containing at least one feature with a missing/null geometry.
- **SC-006**: A regression test in `shared/utils/tests/bounds.test.ts` exercises the null-geometry-feature case end-to-end and passes — guaranteeing the behavioural difference that originally motivated the duplication is now covered at the canonical location.

## Assumptions

- The task is a non-functional refactor. No new behaviour is added; the only behavioural change visible anywhere is that the shared `calculateBounds` no longer throws on a null-geometry feature — and that change is strictly safer for every existing caller (none of them rely on an exception there).
- The two sub-options for resolving the `SafeFeature` / `GeoJSONFeature` input-type mismatch (widening the parameter to a structural minimum vs. giving both types a shared structural base inside `@debrief/utils`) are interchangeable from a specification standpoint. Either satisfies FR-006; the choice is a planning/implementation concern.
- The VS Code map panel's `mapPanel.ts` is the only in-tree production consumer of the VS Code-local `bounds.ts`, and the duplicate unit test file is the only test consumer. (Confirmed by repo search at spec time.)
- The consolidated utility continues to expose `boundsToLeaflet` and `isValidBounds` with their current signatures and behaviour — no consumer of those helpers needs to change.
- This work does not create or alter any user-visible UI; the VS Code map's zoom behaviour is preserved exactly. No design, copy, or interaction changes are required.
- The change is independent of, and parallelisable with, the other 200-series cleanup items (#199, #201, #202, #206, E11, E12, and the LinkML-layer items #203/#204/#205) — no coordination dependency.
