# Implementation Plan: Temporal Track Rendering

**Branch**: `030-temporal-track-rendering` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-temporal-track-rendering/spec.md`

## Summary

Implement temporal rendering modes for track visualization on the map. Tracks respond to the current time position from the TimeController, rendering in either **full-track mode** (complete path with highlight marker at current time) or **snail-trail mode** (path from start to current time only). The MapView component will be enhanced with temporal awareness while maintaining performance during playback.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18+, react-leaflet v5+, Leaflet, @debrief/components (existing MapView, TimeController)
**Storage**: N/A (pure display component - no persistence)
**Testing**: Vitest (unit), Playwright (e2e), Storybook (visual)
**Target Platform**: VS Code extension webview, Electron renderer, Browser
**Project Type**: React component library (shared/components)
**Performance Goals**: 10+ fps during playback, <100ms update latency
**Constraints**: Offline-capable, support 20+ simultaneous tracks
**Scale/Scope**: Single component enhancement + utility functions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | ✅ Pass | Pure client-side rendering, no network calls |
| I.3 No silent failures | Operations succeed or fail explicitly | ✅ Pass | Edge cases (time outside range) handled gracefully |
| I.4 Reproducibility | Same inputs → identical results | ✅ Pass | Deterministic nearest-point algorithm |
| II.1 Single source of truth | Types from @debrief/schemas | ✅ Pass | Will use existing TrackFeature types |
| III.1 Provenance always | Record transformation lineage | N/A | Display-only, no data transformation |
| IV.1 Services never touch UI | Python returns data only | N/A | UI component, not a service |
| VI.2 Services require tests | Unit tests for service code | ✅ Pass | Utility functions will have unit tests |
| VIII.1 Specs before code | Written specification exists | ✅ Pass | spec.md completed |

**Gate Status**: ✅ PASS - All applicable articles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/030-temporal-track-rendering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   ├── MapView/
│   │   ├── MapView.tsx           # Existing - add temporal props
│   │   ├── TemporalTrackLayer.tsx    # NEW - temporal rendering layer
│   │   ├── TrackHighlightMarker.tsx  # NEW - position marker component
│   │   ├── useTemporalTrack.ts       # NEW - hook for track slicing
│   │   └── temporal-utils.ts         # NEW - nearest point, slicing
│   └── utils/
│       └── types.ts              # Existing - add DisplayMode export
└── tests/
    └── unit/
        └── temporal-utils.test.ts    # NEW - utility unit tests
```

**Structure Decision**: Extends existing `shared/components` structure. New temporal functionality added as a layer component within MapView, following the established pattern of composable layers. Utility functions are extracted for testability.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| TemporalTrackLayer | `MapView/TemporalTrack.stories.tsx` | `temporal-track.js` | Demonstrates full-track and snail-trail modes with playback |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (will be created)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/mapview-temporal-track`

## Complexity Tracking

> No violations requiring justification.
