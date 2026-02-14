# Research: Show Child Points in Layers Panel

**Feature**: 094-show-points-in-layers
**Date**: 2026-02-13

## Research Questions

### RQ-1: How to virtualise a tree (expandable list) with the existing virtualizer?

**Decision**: Use a flattened-tree approach — maintain expansion state separately and compute a flat array of "display items" (both parent features and their children) that the virtualizer renders as a single flat list.

**Rationale**: `@tanstack/react-virtual` is already in use (FeatureList.tsx) and works with flat arrays. Rather than switching to a tree-aware virtualizer, we compute the flat array from `(features, expandedIds)` in a `useMemo`. Each item carries a `depth` field for indentation. When a feature is toggled, the flat array is recomputed — the virtualizer sees a new `count` and re-renders.

**Alternatives considered**:
- **Nested virtualized lists** — Rejected: nested scroll containers create UX issues and break unified scrolling.
- **Non-virtualised tree** (render all children) — Rejected: tracks may have 10,000+ positions; DOM would be unmanageable.
- **Switch to @tanstack/react-virtual tree mode** — Rejected: no built-in tree mode exists; the flattened approach is the documented pattern for trees.

### RQ-2: What level names should multi-point and multi-polygon children use?

**Decision**: Register two new level names in the level registry: `points` (index-addressed) for MultiPoint children, and `polygons` (index-addressed) for MultiPolygon children.

**Rationale**: The existing `positions` level is semantically tied to track positions (which carry `TimestampedPosition` metadata parallel to coordinates). Multi-point and multi-polygon children are raw geometry coordinates without parallel metadata. Using distinct level names keeps the semantics clear: `positions` = timestamped track position, `points` = coordinate within a multi-point geometry, `polygons` = polygon within a multi-polygon geometry.

**Alternatives considered**:
- **Reuse `positions` for all** — Rejected: confuses semantics (track positions have metadata, multi-point points don't). Would complicate path interpretation for consumers.
- **Use `coordinates`** — Rejected: too generic; doesn't distinguish point from polygon children.

**Selection path examples**:
- Track position: `track-001/positions/4`
- Multi-point child: `intercept-result/points/0`
- Multi-polygon child: `coverage-zones/polygons/1`
- Compound track: `track-001/segments/leg-alpha/positions/3`

### RQ-3: How should the FeatureList component generate selection paths without depending on session-state?

**Decision**: The FeatureList builds selection path strings directly using simple string concatenation (`${parentId}/${levelName}/${index}`). It does not import `selectionPath.ts` utilities. The path construction is trivial (join with `/`) and the session-state layer handles normalisation and validation when it receives the paths.

**Rationale**: The shared/components package is deliberately decoupled from session-state. Importing `buildPath()` would create a cross-package dependency. The path format is simple enough that string interpolation suffices. The `onSelectionChange` callback already accepts `Set<string>` — callers receive path strings and the extension layer validates them via session-state.

**Alternatives considered**:
- **Import buildPath from session-state** — Rejected: breaks the package boundary; shared/components should remain independent.
- **Duplicate buildPath in components** — Rejected: code duplication, though small, is unnecessary for simple string joins.

### RQ-4: How should the DebriefFeature union type be extended for multi-point and multi-polygon?

**Decision**: Extend the `DebriefFeature` union in `shared/components/src/utils/types.ts` to include `MultiPointFeature` and `MultiPolygonFeature` from `@debrief/schemas`. Add type guards `isMultiPointFeature()` and `isMultiPolygonFeature()`.

**Rationale**: The FeatureList needs to inspect feature kind to determine expandability. The schema package already exports these types; they just need to be added to the component union and given type guards matching the existing `isTrackFeature()` pattern.

**Alternatives considered**:
- **Use `feature.properties.kind` directly without type guards** — Rejected: loses type narrowing benefits; inconsistent with existing pattern.
- **Keep DebriefFeature unchanged, use `any` casts** — Rejected: defeats purpose of TypeScript; type safety is a project value.

### RQ-5: How should expanded/collapsed state be managed?

**Decision**: Use React `useState<Set<string>>` within the FeatureList component to track which feature IDs are expanded. This state is local to the component and not persisted. A `useRef` mirror keeps the set stable across re-renders (following the StacFileTree pattern).

**Rationale**: Expansion state is pure UI state — it doesn't affect data or selection. It should not live in session-state (which is for domain state). The StacFileTree already demonstrates this pattern with `useRef<Set<string>>` for expand tracking. Keeping it local means no session-state changes are needed for this feature.

**Alternatives considered**:
- **Store in session-state Zustand store** — Rejected: expansion is transient UI state, not domain state. Would violate architectural separation.
- **Store in VS Code webview state (getState/setState)** — Rejected: over-engineering for a non-critical UI preference. Users don't expect expansion state to survive panel reloads.

### RQ-6: How should child labels be determined for each feature kind?

**Decision**: Apply feature-kind-specific labelling:
- **Track positions**: Use `TimestampedPosition.time` formatted to locale time. If a `PositionStyleOverride` exists at that index with a `label` field, use the override label instead.
- **Multi-point children**: Use `Point N` (1-indexed) as the label.
- **Multi-polygon children**: Use `Polygon N` (1-indexed) as the label.
- **Track segments**: Use the segment's `name` field from `SegmentMetadata`.

**Rationale**: Track positions have rich metadata (timestamps, course, speed) and per-position styling overrides. Multi-point/polygon features only have geometry — no per-child metadata exists in the schema. Simple indexed labels are the best available option.

### RQ-7: How does the "child-selected" indicator work when parent is collapsed?

**Decision**: When rendering a parent row, check if any path in `selectedIds` starts with `${featureId}/`. If so, display a small dot indicator on the parent row. This is a simple string prefix match and requires no path parsing.

**Rationale**: A prefix check (`selectedId.startsWith(featureId + '/')`) is O(n) over the selection set and trivially correct. No import of selection path utilities is needed. The visual indicator is a small coloured dot beside the expand chevron — minimal, unobtrusive, consistent with tree UIs.

## Dependencies Verified

| Dependency | Status | Notes |
|-----------|--------|-------|
| Feature 053 (selectionPath.ts) | Implemented | Path utilities, level registry, FeatureSelection type all in place |
| Feature 048 (position metadata) | Implemented | PositionStyle, PositionStyleOverride, TimestampedPosition in schemas |
| @tanstack/react-virtual | Available | Already in FeatureList; supports dynamic count |
| @debrief/schemas | Available | Exports TrackFeature, MultiPointFeature, MultiPolygonFeature |
| StacFileTree expand pattern | Available | Reference implementation in shared/components |
