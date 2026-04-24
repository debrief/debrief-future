# Feature Specification: Unify `shared/components` bounds utilities with `@debrief/utils`

**Feature Branch**: `219-unify-bounds-utilities`
**Created**: 2026-04-21
**Status**: Draft
**Input**: Backlog item #213 — "Unify `shared/components/src/utils/bounds.ts` with `@debrief/utils`. That copy operates on LinkML-typed `DebriefFeature` arrays and carries additional helpers (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`). Unification requires reconciling three feature-type families (`DebriefFeature` / `SafeFeature` / `GeoJSONFeature`) and migrating four consumers. Must also settle the pre-computed-`bbox` fast-path policy on the unified implementation (absorb #211 at approval time if #211 is still open). Follow-up to #200; absorbs #211 on approval."

## Background

Feature #200 consolidated the VS Code-local copy of `bounds.ts` into `@debrief/utils`, but a second copy remained at `shared/components/src/utils/bounds.ts`. That second copy carries five helpers absent from `@debrief/utils` (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`), operates on LinkML-typed `DebriefFeature` arrays rather than the structural-minimum `BoundsInputFeature` used by `@debrief/utils`, and implements a pre-computed-`bbox` fast-path that `@debrief/utils` lacks.

The divergence means contributors face a silent choice between two `calculateBounds` functions with the same name, different input-type expectations, and different performance characteristics. Deleting the duplicate file is the goal; absorbing #211 (the pre-computed-`bbox` fast-path) is a prerequisite so that current `shared/components` consumers do not experience a silent performance regression after they migrate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single canonical bounds module (Priority: P1)

As a developer working anywhere in the monorepo, I can import every bounds-related helper (`calculateBounds`, `mergeBounds`, `expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`, `boundsToLeaflet`, `isValidBounds`) from a single package (`@debrief/utils`) and get consistent behaviour regardless of which feature-type family I pass in.

**Why this priority**: This is the core value of the feature — deleting the duplicate file and unifying behaviour. Without it, contributors continue to face the silent-choice hazard between two `calculateBounds` functions with the same name and divergent semantics.

**Independent Test**: Delete `shared/components/src/utils/bounds.ts`, run the full test suite (`task verify`), confirm all tests pass and that every previously-passing consumer (MapView, LeafletToolbar, useBrowserFilter, and any barrel re-export consumer) continues to render/filter correctly.

**Acceptance Scenarios**:

1. **Given** a developer searches the repo for `calculateBounds`, **When** they inspect the results, **Then** they find exactly one implementation (in `@debrief/utils`) and zero copies elsewhere in `shared/`, `apps/`, or `services/`.
2. **Given** the `shared/components` barrel export previously re-exported `calculateBounds`, `bboxOverlapsViewport`, `filterBySpatialExtent`, and `viewportToBounds`, **When** a consumer imports those symbols from `@debrief/components`, **Then** they still resolve (re-exported from `@debrief/utils`) so no consumer-facing rename occurs.
3. **Given** `MapView`, `LeafletToolbar`, and `useBrowserFilter` previously called helpers from `shared/components/src/utils/bounds.ts`, **When** the file is deleted, **Then** they import the identical helpers from `@debrief/utils` and produce the same observable output (same map fit, same filtered list contents) as before.
4. **Given** a developer passes a `DebriefFeature[]`, a `SafeFeature[]`, or a generic `GeoJSONFeature[]` to the unified `calculateBounds`, **When** the call returns, **Then** the bounds computed match those that would have been produced by the corresponding pre-unification implementation for that input type.

---

### User Story 2 — Pre-computed `bbox` fast-path retained under unification (Priority: P2)

As a developer fitting a map to a large `DebriefFeatureCollection` whose features already carry a pre-computed `bbox`, I want `calculateBounds` to honour `feature.bbox` and skip the per-coordinate walk, so that map-fit latency stays O(n features) rather than degrading to O(n × coordinates-per-feature) after consolidation.

**Why this priority**: This absorbs backlog item #211. Without this behaviour on the unified `calculateBounds`, current `shared/components` consumers would silently lose the fast-path they rely on today. It is a prerequisite to the final delete in Story 1.

**Independent Test**: Add a test to `shared/utils/tests/bounds.test.ts` that passes an array of features each with a pre-computed `bbox` and mutually-inconsistent `geometry.coordinates` (bbox says one extent, coords say another). The result MUST match the bbox-derived extent, proving the fast-path was taken. A matching "without pre-computed bbox" test confirms the slow path still works.

**Acceptance Scenarios**:

1. **Given** an array of features each carrying a valid `feature.bbox`, **When** `calculateBounds` is called, **Then** the returned bounds are derived from the pre-computed `bbox` values and the per-feature coordinate walk is skipped.
2. **Given** an array of features without `feature.bbox`, **When** `calculateBounds` is called, **Then** the returned bounds are identical to the pre-change implementation (no behavioural regression for the common case).
3. **Given** a mixed array where some features carry `feature.bbox` and some do not, **When** `calculateBounds` is called, **Then** each feature contributes via its pre-computed bbox when present and via coordinate walk otherwise, and the merged extent is correct.

---

### User Story 3 — Feature-type reconciliation is documented and non-breaking (Priority: P3)

As a developer reading the unified `@debrief/utils/bounds` module, I can tell from the module's public surface which feature-type families it accepts (`DebriefFeature`, `SafeFeature`, `GeoJSONFeature`, and the structural-minimum `BoundsInputFeature`), and I can pass any of them without type errors and without runtime surprises.

**Why this priority**: The reconciliation decision underpins Stories 1 and 2 but its correctness is verified by the combination of those stories' tests plus a small set of type-level assertions. It is flagged P3 because it produces no new runtime behaviour — only module-level documentation, type exports, and compile-time guarantees.

**Independent Test**: Author compile-time type assertions (e.g. `expectTypeOf` or `// @ts-expect-error` fixtures) that pass `DebriefFeature[]`, `SafeFeature[]`, and `GeoJSONFeature[]` to `calculateBounds`, `expandBounds`, `bboxOverlapsViewport`, etc., and verify each call type-checks. A short module-level comment in the unified file documents which families are accepted and why.

**Acceptance Scenarios**:

1. **Given** a caller holding `DebriefFeature[]`, **When** they pass it to any helper in the unified module, **Then** the call type-checks without casts.
2. **Given** a caller holding `SafeFeature[]` (which may have `geometry: null`), **When** they pass it to `calculateBounds`, **Then** the call type-checks and null-geometry features are skipped at runtime (no crash).
3. **Given** a caller holding a raw `GeoJSONFeature[]` from a JSON-parse boundary, **When** they pass it to `calculateBounds`, **Then** the call type-checks via the existing structural-minimum narrowing gate (no runtime type coercion is required from the caller).

---

### Edge Cases

- **Null / missing geometry**: Features with `geometry === null` or `geometry === undefined` MUST be skipped silently (preserving current `shared/components` behaviour). An all-null array MUST return `null`, not throw.
- **Empty input array**: Passing `[]` MUST return `null`.
- **Pre-computed `bbox` that contradicts geometry**: The fast-path MUST trust `feature.bbox` when present. The unified module does not offer a "force re-compute" flag in this feature — callers that require geometry-derived bounds despite a stale `bbox` strip `bbox` before calling.
- **Invalid `bbox` shape** (wrong length, non-finite values): The fast-path MUST fall back to coordinate walk for that feature rather than crashing; invalid `bbox` is treated as "no pre-computed value".
- **Feature collection as input** (`DebriefFeatureCollection` or plain `FeatureCollection`): MUST be accepted where the `shared/components` version accepts it today. The unified signature MUST NOT force every caller to unwrap to `features[]` first.
- **Antimeridian-crossing viewports**: `bboxOverlapsViewport` MUST preserve the existing antimeridian-handling behaviour from `shared/components` (the `shared/utils` side has no such helper today).
- **Barrel re-exports**: Existing `import { calculateBounds } from '@debrief/components'` call sites MUST continue to resolve; the `shared/components` barrel re-exports the unified symbols from `@debrief/utils` unchanged.
- **Test co-location**: Tests for the five migrated helpers (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`) MUST move with the implementation — no "orphan test file" left behind in `shared/components/src/utils/`.

## Requirements *(mandatory)*

### Functional Requirements

**Unified module surface**

- **FR-001**: `@debrief/utils` MUST export a single `calculateBounds` function that accepts any of the following input types without casts: `DebriefFeature[]`, `DebriefFeatureCollection`, `SafeFeature[]`, `GeoJSONFeature[]`, and the existing structural-minimum `BoundsInputFeature[]`.
- **FR-002**: `@debrief/utils` MUST export `expandBounds(bounds, paddingPercent): Bounds` with the same signature and behaviour as the current `shared/components` implementation (default padding preserved).
- **FR-003**: `@debrief/utils` MUST export `isPointInBounds(lon, lat, bounds): boolean` with the same signature and behaviour as the current `shared/components` implementation.
- **FR-004**: `@debrief/utils` MUST export `bboxOverlapsViewport(itemBbox, viewportBbox): boolean` with the same signature and behaviour as the current `shared/components` implementation, including antimeridian handling.
- **FR-005**: `@debrief/utils` MUST export `viewportToBounds(viewport: ViewportPolygon): Bounds | null` with the same signature and behaviour as the current `shared/components` implementation, including the object-form-coordinate regression guard (FR-022 from #130).
- **FR-006**: `@debrief/utils` MUST export `filterBySpatialExtent<T extends { bbox: Bounds | null }>(items, viewportBbox): T[]` with the same generic signature as the current `shared/components` implementation.
- **FR-007**: `@debrief/utils` MUST continue to export `mergeBounds`, `boundsToLeaflet`, and `isValidBounds` with their existing signatures unchanged.

**Pre-computed `bbox` fast-path (absorbs #211)**

- **FR-008**: The unified `calculateBounds` MUST honour a pre-computed `feature.bbox` when present and of valid shape, skipping the per-feature coordinate walk for that feature.
- **FR-009**: The unified `calculateBounds` MUST fall back to coordinate walk for any feature whose `bbox` is absent, malformed, or contains non-finite values; such a fallback MUST NOT throw.
- **FR-010**: The unified `calculateBounds` MUST produce identical output to the pre-change implementation for inputs without any `feature.bbox` (no regression on the common path).
- **FR-011**: `shared/utils/tests/bounds.test.ts` MUST include at least one test that proves the fast-path is taken when `bbox` is present (by setting `bbox` and `coordinates` to mutually-inconsistent extents and asserting the result matches the `bbox`-derived extent).

**Consumer migration**

- **FR-012**: All current internal consumers of `shared/components/src/utils/bounds.ts` (`MapView.tsx`, `LeafletToolbar.tsx`, `StacBrowser/useBrowserFilter.ts`) MUST be updated to import from `@debrief/utils` (directly or via the existing `shared/components` barrel).
- **FR-013**: The `shared/components` barrel (`shared/components/src/index.ts`) MUST re-export `calculateBounds`, `bboxOverlapsViewport`, `filterBySpatialExtent`, and `viewportToBounds` from `@debrief/utils` so that all existing `from '@debrief/components'` import sites continue to compile without changes.
- **FR-014**: After migration, `shared/components/src/utils/bounds.ts` MUST be deleted; `shared/components/src/utils/bounds.test.ts` MUST be deleted (its assertions having been absorbed into `shared/utils/tests/bounds.test.ts`); and the `calculateBounds` / `expandBounds` / `isPointInBounds` tests currently in `shared/components/src/utils/__tests__/utils.test.ts` MUST be migrated to `shared/utils/tests/` or deleted if already covered there.
- **FR-015**: After migration, a repo-wide search for `from '.*utils/bounds'` or `from './bounds'` outside `shared/utils/` MUST return zero matches (excluding test imports within `shared/utils/` itself).

**Feature-type reconciliation**

- **FR-016**: The unified `calculateBounds` signature MUST NOT require callers holding any of `DebriefFeature[]`, `SafeFeature[]`, or `GeoJSONFeature[]` to insert a type cast or `as` assertion at the call site. (Today, `@debrief/utils`'s structural-minimum `BoundsInputFeature` already accepts all three; this requirement pins that behaviour so it cannot silently regress.)
- **FR-017**: The unified `@debrief/utils/bounds` module MUST include a top-of-file comment block explicitly naming the three supported external feature-type families and stating that the input type is a structural minimum so the module remains decoupled from the LinkML-typed `DebriefFeature` schema.
- **FR-018**: The unified module MUST NOT re-export `DebriefFeature`, `SafeFeature`, or `GeoJSONFeature` — each caller imports its preferred family from its canonical location (`@debrief/schemas`, `@debrief/utils/types`, etc.) and passes it in.

**Behavioural equivalence (regression gate)**

- **FR-019**: For every input the pre-change `shared/components` `calculateBounds` previously handled (including `DebriefFeatureCollection`, `DebriefFeature[]`, features with `geometry: null`, and features with pre-computed `bbox`), the unified `calculateBounds` MUST produce byte-identical output.
- **FR-020**: `fitToSelection` / map-fit behaviour in `MapView` MUST render the same viewport bounding box after migration as before (verified by existing MapView tests or Storybook stories; no new visual-regression test is introduced by this feature).
- **FR-021**: The `StacBrowser` spatial filter (`useBrowserFilter`) MUST return the same set of items for the same viewport and same catalogue contents after migration as before.

**Out-of-scope guardrails**

- **FR-022**: This feature MUST NOT introduce LinkML-generated replacements for `SafeFeature` or `GeoJSONFeature` (that is backlog item #212).
- **FR-023**: This feature MUST NOT add a lint or CI drift-prevention rule (that is backlog item #214 — already complete for the `bounds.ts` class of drift; no new drift-prevention work is in scope here).

### Key Entities

- **Unified `bounds` module** (`shared/utils/src/bounds.ts`): The single canonical implementation of all bounds-related helpers. Consumes structural-minimum input shapes; exposes nine public functions (four existing + five migrated).
- **`Bounds`** (`shared/utils/src/types.ts`, already exported): The four-number `[minLon, minLat, maxLon, maxLat]` tuple returned by every bounds helper. Unchanged by this feature.
- **`BoundsInputFeature`** (private in `shared/utils/src/bounds.ts`): The structural-minimum input shape (`{ geometry?: { type: string; coordinates: unknown } | null; bbox?: Bounds | null }`) that accepts `DebriefFeature`, `SafeFeature`, `GeoJSONFeature`, and any future family without modification. Extended by this feature to include the optional `bbox` field.
- **`ViewportPolygon`** (LinkML-generated, imported from `@debrief/schemas`): The closed polygon describing the visible map area. Consumed by `viewportToBounds`. Unchanged by this feature.
- **Consumer sites** (four, as specified in backlog item #213):
  1. `shared/components/src/MapView/MapView.tsx` — uses `calculateBounds`, `expandBounds`
  2. `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` — uses `expandBounds`
  3. `shared/components/src/StacBrowser/useBrowserFilter.ts` — uses `viewportToBounds`, `bboxOverlapsViewport`
  4. `shared/components/src/index.ts` (barrel re-export) — re-exports `calculateBounds`, `bboxOverlapsViewport`, `filterBySpatialExtent`, `viewportToBounds`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A repo-wide search for files named `bounds.ts` under `shared/`, `apps/`, and `services/` returns exactly one result (the unified module in `shared/utils/src/`). Before this feature: two results.
- **SC-002**: A repo-wide search for `function calculateBounds` or `export function calculateBounds` or `export const calculateBounds` returns exactly one match across the whole monorepo.
- **SC-003**: 100% of the acceptance tests for the five migrated helpers (`expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`) that pass before this feature continue to pass after it, with zero net loss of assertions.
- **SC-004**: `task verify` (lint + typecheck + unit + E2E) passes on the feature branch before merge, with zero new test files needed to re-establish coverage beyond the five test migrations and the one new fast-path test (FR-011).
- **SC-005**: Map-fit latency on a `DebriefFeatureCollection` of ≥1,000 features carrying pre-computed `bbox` values is no worse than on the same collection before this feature. (Informally verified: fast-path retained; no benchmark is added by this feature.)
- **SC-006**: Zero call-site churn for external consumers — no `import` statement in `apps/vscode/`, `apps/web-shell/`, or `apps/loader/` needs to change for any symbol that was previously imported from `@debrief/components` and is touched by this feature.
- **SC-007**: The unified `@debrief/utils/bounds` module fits on a single screen of module-level documentation (≤ ~40 lines of comment + exports summary) so that a new contributor can identify which helper to use in ≤ 2 minutes of reading.

## Assumptions

- **A-001**: `@debrief/utils`'s current structural-minimum `BoundsInputFeature` shape is the correct input type for the unified `calculateBounds`. Callers holding `DebriefFeature[]`, `SafeFeature[]`, or `GeoJSONFeature[]` pass through without casts because each family already structurally matches. This sidesteps the three-family reconciliation without requiring #212 to complete first.
- **A-002**: The pre-computed `bbox` fast-path is strictly a behavioural superset of the current `@debrief/utils` implementation (when no `bbox` is present, behaviour is identical). Therefore, absorbing #211 under this feature is a convergent change with no downstream breakage risk.
- **A-003**: `ViewportPolygon` — the input type to `viewportToBounds` — is imported from `@debrief/schemas` (already a dependency of `shared/components`), and `@debrief/utils` may take a similar dependency on `@debrief/schemas` for this one import. If this is not acceptable, the fallback is to re-declare `ViewportPolygon`'s structural shape locally (same pattern used by `BoundsInputFeature`).
- **A-004**: Tests currently in `shared/components/src/utils/bounds.test.ts` and in the `calculateBounds`/`expandBounds`/`isPointInBounds` blocks of `shared/components/src/utils/__tests__/utils.test.ts` can be migrated to `shared/utils/tests/bounds.test.ts` without rewriting (identical assertions, just relocated + import paths updated).
- **A-005**: No consumer outside the four listed in Key Entities relies on `shared/components/src/utils/bounds.ts` directly. (Verified during specification by grep across the monorepo.)
- **A-006**: #214's drift-prevention rule (already complete) covers only the `apps/*/src/utils/bounds.ts` recurrence pattern; it does not block placing helpers inside `shared/components/src/utils/`. This feature MUST confirm #214 does not need broadening as part of its validation, but MUST NOT broaden #214 itself (that's a separate item if needed).

## Out of Scope

- **OOS-001**: Replacing `SafeFeature` or `GeoJSONFeature` with LinkML-generated equivalents (tracked as #212).
- **OOS-002**: Extending #214's drift-prevention rule to cover `shared/components/src/utils/` or any other location (tracked separately if determined necessary — not triggered by this feature).
- **OOS-003**: Adding a benchmark suite for map-fit latency. SC-005 relies on informal verification via the existing fast-path test (FR-011); a perf benchmark is a separate infrastructure feature if wanted.
- **OOS-004**: Introducing new bounds helpers beyond the nine already defined (four in `@debrief/utils` + five migrated). Any new helper would be a separate feature.
- **OOS-005**: Changing the public signature of any of the nine helpers. This feature is a migration + absorption, not a redesign.
- **OOS-006**: Any change to `Bounds` itself or to the `[minLon, minLat, maxLon, maxLat]` tuple convention.

## Dependencies

- **Depends on**: #200 (bounds consolidation) — **complete**. Provides the `@debrief/utils/bounds` module that this feature extends.
- **Absorbs**: #211 (pre-computed `bbox` fast-path) — per backlog item #213, absorbed on approval. Explicitly replicated as User Story 2 and FR-008 / FR-009 / FR-010 / FR-011 in this spec.
- **Does not depend on**: #212 (LinkML-generated `SafeFeature` / `GeoJSONFeature`). A-001 documents the sidestep.
- **Not blocked by**: #214 (drift-prevention lint) — already complete, no interaction required.
