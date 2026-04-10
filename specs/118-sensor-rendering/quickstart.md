# Quickstart: 118 Sensor Rendering

**Date**: 2026-04-10 | **Branch**: `118-sensor-rendering`

## Prerequisites

- Node.js 18+, pnpm
- #116 (sensor schema overhaul) merged -- SensorContact/SensorData with display properties
- #117 (REP sensor import) merged -- test data available

## Development Setup

```bash
# Install dependencies
pnpm install

# Run Storybook for visual development
cd shared/components
pnpm storybook
# Open http://localhost:6006 → Components/MapView/SensorRendering
```

## Key Files

| File | Purpose |
|------|---------|
| `shared/components/src/MapView/SensorBearingLayer.tsx` | Main rendering component |
| `shared/components/src/MapView/sensor-utils.ts` | Bearing geometry, interpolation, snail fade |
| `shared/components/src/MapView/SensorRendering.stories.tsx` | Storybook stories |
| `shared/components/src/MapView/__tests__/sensor-utils.test.ts` | Unit tests for geometry |
| `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx` | Component tests |
| `shared/components/src/MapView/__fixtures__/sampleSensors.ts` | Test fixtures |

## Usage

```tsx
import { MapView } from '@debrief/components/MapView';

// TrackFeature with embedded sensor data
const track: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [[-5.0, 50.0], [-4.9, 50.1], [-4.8, 50.2]],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Defender',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 45, speed: 12 },
      { time: '2024-01-15T10:00:00Z', course: 45, speed: 12 },
      { time: '2024-01-15T12:00:00Z', course: 45, speed: 12 },
    ],
    sensors: [
      {
        name: 'TOWED_ARRAY',
        contacts: [
          { time: '2024-01-15T09:00:00Z', bearing: 45.0, range: 5000 },
          { time: '2024-01-15T09:15:00Z', bearing: 47.2, ambiguous_bearing: 227.2 },
          { time: '2024-01-15T09:30:00Z', bearing: 50.1, label: 'Contact Alpha' },
        ],
      },
    ],
  },
};

// Sensor bearing lines render automatically when tracks have sensor data
<MapView
  features={[track]}
  currentTime={Date.parse('2024-01-15T09:15:00Z')}
  displayMode="trail"
/>
```

## Testing

```bash
# Unit tests (geometry, interpolation, colour utilities)
cd shared/components
pnpm test -- --grep "sensor"

# Full test suite
pnpm test

# Type checking
pnpm typecheck
```

## Architecture

```
MapView (receives features + currentTime + displayMode)
  └── For each TrackFeature with sensors:
       └── SensorBearingLayer
            ├── Reads: feature.properties.sensors[]
            ├── Interpolates host position at each contact time
            ├── Computes bearing line geometry
            ├── Applies snail mode fading (in trail mode)
            └── Draws to Leaflet Canvas:
                 ├── Primary bearing lines (base colour)
                 ├── Ambiguous bearing lines (darker shade)
                 └── Labels (at START/MIDDLE/END of line)
```

## Key Algorithms

### Bearing Line Geometry
```
origin = interpolateTrackPosition(coordinates, positions, contact.time)
if contact.range exists:
  farEnd = geodesicDestination(origin, contact.bearing, contact.range)
else:
  farEnd = geodesicDestination(origin, contact.bearing, 5_DEGREES_IN_METRES)
```

### Snail Mode Fading
```
age = currentTime - contact.time
proportion = (trailLength - age) / trailLength  // 1.0=newest, 0.0=oldest
fadedColor = rgb(R * proportion, G * proportion, B * proportion)
```

### Ambiguous Bearing
```
if contact.ambiguous_bearing exists:
  ambiguousFarEnd = geodesicDestination(origin, contact.ambiguous_bearing, range)
  draw line in darkenColor(baseColor)  // Java Color.darker() = RGB * 0.7
```
