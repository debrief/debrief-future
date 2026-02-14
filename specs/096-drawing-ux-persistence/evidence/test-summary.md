# Test Summary: 096 Drawing UX Guidance and STAC Persistence

**Date**: 2026-02-14
**Runner**: Vitest 3.x (unit), Playwright 1.57+ (E2E ready)

## Unit Test Results

### @debrief/components (33 test files, 565 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| DrawingGuidanceOverlay.test.tsx | 11 | PASS |
| drawingGuidance.test.ts | 6 | PASS |
| drawingPalette.test.ts | 12 | PASS |
| createDrawnFeature.test.ts | 26 | PASS |
| isValidDrawnGeometry.test.ts | 10+ | PASS |
| Other existing suites | 500+ | PASS |

**Total**: 565 passed, 0 failed

### @debrief/session-state (30 test files, 528 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| spatial.test.ts | 15+ | PASS (includes drawingPaletteIndex) |
| persistence.test.ts | 17 | PASS |
| subscriptions.test.ts | 13 | PASS |
| All other suites | 483+ | PASS |

**Total**: 528 passed, 0 failed

## Coverage: Key Scenarios Verified

### US1: Guidance Overlay
- Renders nothing when drawingMode is null
- Correct text for all four modes (point, rectangle, polygon, polyline)
- data-testid attribute present
- role="status" and aria-live="polite" for accessibility
- Text updates on mode switch
- Text disappears on mode deactivation

### US2: Provenance Embedding
- createDrawnFeature with provenance option embeds properties.provenance array
- Provenance embedded for all four shape types
- Without provenance option, no provenance field added (backwards compatible)

### US3: Drawing Palette
- DRAWING_PALETTE contains exactly 8 distinct hex colours
- getPaletteColour returns correct colour for indices 0-7
- getPaletteColour wraps at index 8
- getPaletteStyleOverrides returns correct style key per mode
- Polyline overrides only set color (no fill_color)
- Null mode returns empty overrides

### US4: Cursor Crosshair
- CSS rule defined for .leaflet-container.debrief-drawing-active
- Class toggled in updateDrawTriggerAppearance method

### US5: No Regressions
- All 528 session-state tests pass (including persistence round-trip)
- All 534 pre-existing component tests continue to pass
- drawingPaletteIndex serialised as 0 in persisted state (ephemeral)
