# Implementation Plan: 118 Sensor Rendering

**Branch**: `118-sensor-rendering` | **Date**: 2026-04-10 | **Spec**: [E07 Phase 3](../../docs/ideas/E07-sensor-data-pipeline.md#phase-3-sensor-rendering-118)
**Input**: Epic specification from `docs/ideas/E07-sensor-data-pipeline.md` Phase 3

## Summary

Add a Leaflet custom canvas layer that renders sensor bearing lines, ambiguous bearings, sensor arcs, snail mode time-trail fading, and contact labels on the map. The layer reads sensor data embedded in `TrackFeature.properties.sensors[]`, interpolates host platform positions at each contact timestamp, computes bearing line geometry using geodesic calculations, and draws to the Leaflet canvas renderer for performance with large contact datasets. This is a frontend-only feature -- no Python service changes required.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x component)
**Primary Dependencies**: react-leaflet 4.2, Leaflet 1.9.x, `@debrief/schemas` (SensorContact, SensorData, TrackFeature types)
**Storage**: N/A (reads from in-memory GeoJSON features)
**Testing**: vitest (unit + component tests), Storybook (visual development), Playwright (E2E via Storybook)
**Target Platform**: Browser (VS Code webview, web-shell, Storybook)
**Project Type**: Shared component library (`shared/components`)
**Performance Goals**: Render 1000+ bearing lines at 30fps; viewport culling for off-screen contacts
**Constraints**: Offline-capable (Constitution Art. I); canvas rendering for scalability; no external tile service dependencies
**Scale/Scope**: Typically 1-5 sensors per track, 10-500 contacts per sensor; upper bound ~5000 contacts total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Pure frontend rendering, no network calls |
| I.3 | No silent failures | PASS | Contacts with out-of-range timestamps logged as warnings, not silently skipped |
| II. Schema Integrity | Schema tests mandatory | PASS | No schema changes -- reads existing SensorContact/SensorData types |
| III. Data Sovereignty | Provenance always | N/A | Rendering-only; no data transformation or persistence |
| IV. Architectural Boundaries | Services never touch UI | PASS | This IS UI; no service involved |
| IV.2 | Frontends never persist | PASS | Read-only rendering layer |
| V. Extensibility | Fail-safe loading | PASS | Missing sensor data = no bearing lines rendered; no crash |
| VI. Testing | Services require unit tests | PASS | Geometry utilities fully unit tested |
| VI.3 | Integration tests for workflows | PASS | Storybook stories + E2E tests cover rendering pipeline |
| VII. Test-Driven AI | Tests before implementation | PASS | Test fixtures and expected outputs defined first |
| VIII. Documentation | Specs before code | PASS | This plan + research + data model |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies; uses existing Leaflet/react-leaflet |
| XI. Internationalisation | I18N from start | PASS | No user-facing strings (labels come from data) |
| XV. Strict Type Safety | Explicit types everywhere | PASS | All rendering types explicitly defined; no `any` |

**Post-design re-check**: All gates still PASS. No schema changes, no new dependencies, no architectural violations.

## Project Structure

### Documentation (this feature)

```text
specs/118-sensor-rendering/
├── plan.md              # This file
├── research.md          # Phase 0: technical research
├── data-model.md        # Phase 1: rendering type definitions
├── quickstart.md        # Phase 1: developer guide
├── contracts/           # Phase 1: component API contracts
│   └── sensor-rendering-api.md
└── media/               # Planning announcement
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/MapView/
├── SensorBearingLayer.tsx         # Main rendering component (custom Leaflet canvas layer)
├── sensor-utils.ts                # Bearing geometry, interpolation, snail fade, colour utilities
├── SensorRendering.stories.tsx    # Storybook stories for all rendering modes
├── __fixtures__/
│   └── sampleSensors.ts           # Test fixtures with sensor data
└── __tests__/
    ├── sensor-utils.test.ts       # Unit tests for geometry/interpolation/fade
    └── sensor-rendering.test.tsx  # Component rendering tests
```

**Structure Decision**: All new code lives within the existing `shared/components/src/MapView/` directory, following the pattern established by `TemporalTrackLayer.tsx` and `PositionSymbolsLayer.tsx`. No new packages or directories outside this scope.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| SensorBearingLayer | `shared/components/src/MapView/SensorRendering.stories.tsx` | `sensor-rendering.js` | Demonstrates bearing lines, ambiguous bearings, snail mode, labels |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created)
- [x] Components render standalone (MapView is already standalone in Storybook)
- [x] Reasonable bundle size expected (< 500KB -- reuses existing Leaflet bundle)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-mapview--sensor-rendering`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `SensorRendering.stories.tsx` - BearingLines | Rendering bearing lines from sensor contacts | light, dark, vscode | verify lines appear on map |
| `SensorRendering.stories.tsx` - AmbiguousBearings | Primary + ambiguous bearing rendering | light, dark, vscode | verify two lines per contact |
| `SensorRendering.stories.tsx` - SnailMode | Time-trail fading | light, dark, vscode | adjust time slider, verify fading |
| `SensorRendering.stories.tsx` - Labels | Label rendering at line positions | light, dark, vscode | verify label text visible |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (time slider changes bearing line rendering)
- [x] Accessibility attributes present (data-testid on layer container)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/SensorRendering.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-mapview--sensor-bearing-lines&globals=theme:light
/iframe.html?id=components-mapview--sensor-bearing-lines&globals=theme:dark
/iframe.html?id=components-mapview--sensor-bearing-lines&globals=theme:vscode
```

## VS Code Webview E2E Testing

None - this feature adds rendering within the existing MapView component. The VS Code integration does not change -- tracks with sensor data will automatically show bearing lines. A full VS Code E2E test for the sensor import + rendering workflow will be added when #117 (import) and #118 (rendering) are both complete.

## Complexity Tracking

No constitution violations to justify. All gates pass cleanly.
