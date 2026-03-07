---
feature: "130-map-spatial-filtering"
captured_at: "2026-03-07T11:37:00Z"
git_sha: "f3b5be7"
tests_passed: 35
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Map View with Live Spatial Filtering

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 35 |
| Passed | 35 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### Spatial Utilities (bounds.test.ts) — 20 tests

| Test | Status |
|------|--------|
| bboxOverlapsViewport: standard overlap | Pass |
| bboxOverlapsViewport: no overlap | Pass |
| bboxOverlapsViewport: north of viewport | Pass |
| bboxOverlapsViewport: south of viewport | Pass |
| bboxOverlapsViewport: partial overlap (east boundary) | Pass |
| bboxOverlapsViewport: viewport contained within item | Pass |
| bboxOverlapsViewport: item contained within viewport | Pass |
| bboxOverlapsViewport: edge-touching (shared boundary) | Pass |
| bboxOverlapsViewport: identical bboxes | Pass |
| bboxOverlapsViewport: antimeridian — item crosses | Pass |
| bboxOverlapsViewport: antimeridian — viewport crosses | Pass |
| bboxOverlapsViewport: antimeridian — both cross | Pass |
| bboxOverlapsViewport: antimeridian — non-overlapping | Pass |
| bboxOverlapsViewport: west === east NOT antimeridian | Pass |
| bboxOverlapsViewport: zero-width bbox within viewport | Pass |
| filterBySpatialExtent: filters to overlapping items | Pass |
| filterBySpatialExtent: excludes items without bbox | Pass |
| filterBySpatialExtent: preserves generic type parameter | Pass |
| filterBySpatialExtent: returns empty for no overlap | Pass |
| filterBySpatialExtent: returns empty for empty input | Pass |

### CatalogOverview Component (CatalogOverview.test.tsx) — 15 tests

| Test | Status |
|------|--------|
| US1: renders Rectangle for items with bbox | Pass |
| US1: omits items without bbox from map | Pass |
| US1: renders correct count for large sets (50 items) | Pass |
| US2: calls onViewportChange with Bounds after debounced moveend | Pass |
| US2: timeline shows only viewport-overlapping items | Pass |
| US2: items without bbox always shown in timeline (FR-005) | Pass |
| US2: "No items in this catalog" empty state (items=[]) | Pass |
| US2: "No spatial data available" overlay (no items have bbox) | Pass |
| US2: "No exercises in this area" overlay (viewport empty) | Pass |
| US2: debounce cleanup on unmount — no setState after unmount | Pass |
| US3: uses assigned colour from colorMap | Pass |
| US3: uses default accent colour when colorMap absent | Pass |
| US3: uses default colour for items not in colorMap | Pass |
| US4: double-click triggers onItemSelect | Pass |
| US4: tooltip shows title and date range | Pass |

## Key Scenarios Verified

- AABB overlap detection with 9 standard cases including containment, partial overlap, edge-touching
- Antimeridian crossing for items, viewports, and both — critical for maritime analysis
- Timeline internal filtering: map shows ALL items, timeline filters to viewport-overlapping only
- Items without bbox always included in timeline (FR-005: exercises without spatial data remain visible)
- Three-state empty overlay: no items, no spatial data, no exercises in viewport
- Debounce timer cleanup prevents setState-on-unmounted React warning
- colorMap integration: per-exercise colours with fallback to default accent colour
- Existing double-click and tooltip behaviour preserved through spatial filtering changes

## Known Issues

- E2E tests (Storybook Playwright) not run — shared/components package has no Playwright config or test infrastructure yet. Unit tests provide comprehensive coverage of all spatial filtering logic.

## Environment

- Runner: vitest 1.6.1
- Branch: claude/implement-speckit-130-Z6d5E
- Date: 2026-03-07
