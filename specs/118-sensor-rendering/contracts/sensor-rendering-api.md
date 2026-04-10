# Sensor Rendering API Contract

**Date**: 2026-04-10 | **Feature**: 118 Sensor Rendering

## Overview

This feature has no service API -- it is a pure frontend rendering component. The "contract" is the component interface (React props) and the internal utility function signatures.

## Component Interfaces

### SensorBearingLayer

```typescript
/**
 * Leaflet layer that renders sensor bearing lines, ambiguous bearings,
 * labels, and snail mode fading for all sensors embedded in a track.
 *
 * Renders to the Leaflet Canvas for performance.
 */
export interface SensorBearingLayerProps {
  /** Host track containing sensor data */
  feature: TrackFeature;
  /** Current time position (epoch ms). When undefined, all contacts rendered. */
  currentTime?: number;
  /** Display mode: 'full' | 'trail' */
  displayMode?: DisplayMode;
  /** Whether host track is selected (highlights bearing lines) */
  isSelected?: boolean;
  /** Set of hidden IDs. Supports track-level ("track-001") and
   *  sensor-level ("track-001/sensors/TOWED_ARRAY") hiding. */
  hiddenIds?: Set<string>;
}
```

### SensorArcLayer

```typescript
/**
 * Leaflet layer that renders sensor arc coverage fans.
 * Separate from bearing lines because arcs have different data sources
 * (DynamicTrackCoverage annotations vs SensorContact arrays).
 *
 * Note: SensorArc schema does not yet exist (#116 may add it, or it
 * may be deferred). This component is designed but may not be
 * implemented in the initial delivery if the schema is not ready.
 */
export interface SensorArcLayerProps {
  /** Arc data to render */
  arcs: SensorArcRenderData[];
  /** Current time for temporal filtering */
  currentTime?: number;
  /** Whether to show arcs (master toggle) */
  visible?: boolean;
}
```

## Utility Function Signatures

### Bearing Geometry

```typescript
/**
 * Calculate the destination point given start point, bearing, and distance.
 * Uses haversine formula for geodesic accuracy.
 *
 * @param origin [lon, lat] starting point
 * @param bearing Degrees from north (0-360)
 * @param distanceMetres Distance in metres
 * @returns [lon, lat] destination point
 */
export function geodesicDestination(
  origin: [number, number],
  bearing: number,
  distanceMetres: number,
): [number, number];

/**
 * Calculate the far end of a bearing line.
 * If range is provided, uses it directly.
 * If no range, extends to MAXIMUM_SENSOR_BEARING_RANGE (5 degrees latitude).
 *
 * @param origin [lon, lat] sensor origin
 * @param bearing Degrees from north
 * @param range Optional range in metres
 * @returns [lon, lat] far end point
 */
export function computeBearingFarEnd(
  origin: [number, number],
  bearing: number,
  range: number | null,
): [number, number];
```

### Host Position Interpolation

```typescript
/**
 * Interpolate the host track's position at a given timestamp.
 * Uses binary search + linear interpolation on the positions/coordinates arrays.
 *
 * @param coordinates Array of [lon, lat] from track geometry
 * @param positions Array of TimestampedPosition from track properties
 * @param targetTimeMs Target timestamp (epoch ms)
 * @returns [lon, lat] interpolated position, or null if time is out of range
 */
export function interpolateTrackPosition(
  coordinates: [number, number][],
  positions: Array<{ time: string }>,
  targetTimeMs: number,
): [number, number] | null;
```

### Snail Mode

```typescript
/**
 * Apply snail mode fading to a base colour.
 *
 * @param baseColor Hex colour string (e.g., "#FF0000")
 * @param proportion Fade proportion: 1.0 = newest (full colour), 0.0 = oldest (black)
 * @returns Hex colour string with faded RGB values
 */
export function applySnailFade(
  baseColor: string,
  proportion: number,
): string;

/**
 * Calculate snail mode proportion for a contact.
 *
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param currentTimeMs Current display time (epoch ms)
 * @param trailLengthMs Trail window length (ms)
 * @returns Proportion [0, 1] or null if contact is outside trail window
 */
export function calculateSnailProportion(
  contactTimeMs: number,
  currentTimeMs: number,
  trailLengthMs: number,
): number | null;
```

### Colour Utilities

```typescript
/**
 * Produce a darker shade of the given colour (for ambiguous bearings).
 * Matches Java's Color.darker() which multiplies RGB by 0.7.
 *
 * @param color Hex colour string
 * @returns Darker hex colour string
 */
export function darkenColor(color: string): string;

/**
 * Parse a hex colour string into RGB components.
 *
 * @param hex Hex colour string (3 or 6 digit, with or without #)
 * @returns [r, g, b] values 0-255
 */
export function parseHexColor(hex: string): [number, number, number];
```

## Rendering Pipeline Contract

The rendering pipeline runs on each Leaflet canvas redraw. The sequence is:

1. **Filter contacts by time**: If `currentTime` is set, only contacts within the visible time window are processed.
2. **Filter by visibility**: Skip contacts belonging to hidden sensors (via `hiddenIds`).
3. **Compute origins**: For each visible contact, interpolate host position at contact time.
4. **Compute far ends**: For each contact, calculate bearing line endpoint.
5. **Apply snail fading**: In trail mode, compute colour fade for each contact.
6. **Viewport cull**: Skip contacts whose origin is outside the current map bounds.
7. **Draw bearing lines**: Primary bearing in base colour, ambiguous in darker shade.
8. **Draw labels**: At configured position (START/MIDDLE/END) on the bearing line.
9. **Draw arcs**: Sensor arc coverage fans (if arc data present).

## Integration Points

| Consumer | How It's Used |
|----------|---------------|
| `MapView.tsx` | Renders `<SensorBearingLayer>` for each temporal track with sensors |
| `TemporalTrackLayer.tsx` | May render `<SensorBearingLayer>` alongside existing track rendering |
| Session state store | Provides `currentTime`, `displayMode`, `hiddenFeatureIds` via props |
| Storybook | `SensorRendering.stories.tsx` demonstrates bearing lines, arcs, snail mode |
