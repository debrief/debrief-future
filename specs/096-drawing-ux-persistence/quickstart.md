# Quickstart: Drawing UX Guidance and STAC Persistence

**Feature**: 096-drawing-ux-persistence
**Date**: 2026-02-14

## Overview

This feature adds three capabilities to the drawing toolchain:

1. **Guidance overlay** — mode-specific instruction text during drawing
2. **Drawing palette** — sequential colour assignment for visual distinction
3. **STAC persistence** — drawn shapes saved to the STAC catalog with provenance

## Prerequisites

Ensure features 093, 094, and 095 are implemented:
- Drawing toolbar with shape palette (093)
- Point and rectangle drawing (094)
- Polygon and polyline drawing (095)

## Implementation Order

### Phase 1: Guidance Overlay (FR-001 to FR-005)

1. Create `drawingGuidance.ts` — constant record mapping each `DrawingMode` to instruction text
2. Create `DrawingGuidanceOverlay.tsx` + CSS — React component that renders guidance when `drawingMode` is non-null
3. Integrate into `MapView.tsx` — render `DrawingGuidanceOverlay` with `drawingMode` prop
4. Write unit tests for guidance text lookup
5. Write E2E test verifying overlay appears/disappears per mode

### Phase 2: Cursor Crosshair (FR-006)

1. Add CSS rule for `.leaflet-container.debrief-drawing-active { cursor: crosshair }`
2. Extend `LeafletToolbar.tsx` to toggle `debrief-drawing-active` class on the map container when `drawingMode` changes
3. Write E2E test verifying cursor style changes

### Phase 3: Drawing Palette (FR-007 to FR-010)

1. Create `drawingPalette.ts` — palette array + `getPaletteColour()` + `getPaletteStyleOverrides()`
2. Add `drawingPaletteIndex` field to the spatial Zustand slice
3. Update `handleShapeCreated` in App.tsx / mapView.tsx to:
   - Get palette style overrides for current index
   - Pass overrides to `createDrawnFeature()` via options
   - Increment palette index after shape creation
4. Write unit tests for palette cycling
5. Write E2E test verifying consecutive shapes get different colours

### Phase 4: STAC Persistence (FR-011 to FR-016)

1. Extend `CreateDrawnFeatureOptions` in `createDrawnFeature.ts` to accept `provenance` object
2. Update `createDrawnFeature()` to embed provenance in `feature.properties.provenance` array
3. Add `addDrawnFeature()` convenience method to `stacService.ts`
4. Update `handleShapeCreated` in both App.tsx and mapView.tsx to:
   - Build provenance metadata (`source`, `timestamp`, `operator`, `action`)
   - Call `stacService.addDrawnFeature()` after adding to session state
   - Catch errors and show notification
5. Write unit tests for provenance embedding in `createDrawnFeature()`
6. Write integration test for STAC persistence round-trip

### Phase 5: Storybook Stories

1. Add "Guidance Overlay" story variant to `Drawing.stories.tsx`
2. Add "Palette Cycling" story variant showing sequential colour assignment
3. Verify stories work in light/dark/vscode themes

### Phase 6: E2E Tests and Evidence

1. Write Playwright tests for guidance overlay across all four modes
2. Write Playwright tests for cursor crosshair
3. Write Playwright tests for palette colour cycling
4. Capture screenshots for evidence artifacts

## Key Files to Modify

| File | Change |
|------|--------|
| `shared/components/src/MapView/drawing/drawingGuidance.ts` | **NEW** — guidance text constants |
| `shared/components/src/MapView/drawing/drawingPalette.ts` | **NEW** — palette array and helpers |
| `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.tsx` | **NEW** — guidance overlay component |
| `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.css` | **NEW** — overlay styling |
| `shared/components/src/MapView/drawing/createDrawnFeature.ts` | **MODIFY** — add provenance option |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` | **MODIFY** — cursor crosshair management |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.css` | **MODIFY** — crosshair CSS rule |
| `shared/components/src/MapView/MapView.tsx` | **MODIFY** — integrate DrawingGuidanceOverlay |
| `services/session-state/src/store/slices/spatial.ts` | **MODIFY** — add drawingPaletteIndex |
| `services/session-state/src/types/spatial.ts` | **MODIFY** — add palette index type |
| `apps/vscode/src/services/stacService.ts` | **MODIFY** — add addDrawnFeature() method |
| `apps/vscode/src/webview/web/mapView.tsx` | **MODIFY** — wire persistence + palette |
| `apps/web-shell/src/App.tsx` | **MODIFY** — wire persistence + palette |
| `shared/components/src/MapView/Drawing.stories.tsx` | **MODIFY** — add guidance + palette stories |
| `shared/components/e2e/DrawingGuidance.spec.ts` | **NEW** — E2E tests |

## Verification

After implementation, verify:

1. Activate each drawing mode → guidance text appears with correct instruction
2. Complete or cancel drawing → guidance disappears
3. Draw 3 shapes → each has a different colour
4. Draw a shape, close plot, reopen → shape is still there with correct styling
5. Inspect persisted feature → provenance metadata present
6. Run existing STAC tests → all pass (no regressions)
7. Check Storybook stories → render in all three themes
