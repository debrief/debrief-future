# Test Summary: Feature Info Button (098)

**Date**: 2026-02-17
**Test Runner**: Vitest 1.6.1
**Environment**: Node.js, jsdom

## Results

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| GeometryDialog.test.tsx | 19 | 19 | 0 |
| FeatureList.test.tsx (info button tests) | 7 | 7 | 0 |
| **Total new tests** | **26** | **26** | **0** |

## Full Test Run

```
Test Files  35 passed (35)
     Tests  597 passed (597)
  Duration  30.22s
```

All 35 test suites pass. No regressions introduced.

## Test Coverage

### GeometryDialog (19 tests)

**Rendering (6 tests)**:
- Renders with dialog role
- Renders with accessible label (`aria-label="Geometry for {name}"`)
- Renders with `data-testid="geometry-dialog"`
- Displays feature name in header
- Displays geometry type via `data-testid="geometry-type"`
- Displays coordinates via `data-testid="geometry-coordinates"`

**Geometry Types (7 tests)**:
- Point: single coordinate pair
- LineString: numbered coordinate pairs
- MultiPoint: numbered coordinate pairs
- Polygon: ring labels (Exterior/Hole) with numbered coordinates
- MultiPolygon: polygon + ring labels with nested coordinates
- Empty geometry: "No coordinates" message

**Dismissal (3 tests)**:
- Close button click calls onDismiss
- Escape key calls onDismiss
- Close button has correct aria-label

**Accessibility (4 tests - overlap with rendering)**:
- `role="dialog"` present
- Descriptive `aria-label`
- `data-testid="geometry-type"` for Playwright
- `data-testid="geometry-coordinates"` for Playwright

### FeatureRow Info Button (7 tests)

- Info icon renders when `showInfoIcon=true` and handler provided
- Info icon hidden when `showInfoIcon=false`
- Info icon hidden when no handler provided
- Click calls `onInfoClick` with feature
- Click does not trigger row click (event isolation)
- Icon has correct role and title attributes
- Enter key triggers click handler

## Storybook Build

Storybook builds successfully with new stories:
- Layers/GeometryDialog — 7 stories (Track, Point, MultiPoint, MultiPolygon, Empty, Dark, Interactive)
