# Data Model: 118 Sensor Rendering

**Date**: 2026-04-10 | **Branch**: `118-sensor-rendering`

## Entities

This feature is primarily a rendering/display feature. It reads from existing schema types and introduces TypeScript-only rendering types (no schema changes). The rendering layer consumes `SensorData` and `SensorContact` from `@debrief/schemas` and the host `TrackFeature`.

### Existing Schema Types (consumed, not modified)

#### SensorContact (from `@debrief/schemas`)

| Field | Type | Required | Rendering Use |
|-------|------|----------|---------------|
| time | string (ISO8601) | yes | Time filtering, snail mode age calculation |
| bearing | number (0-360) | yes | Bearing line angle |
| range | number (metres) | no | Bearing line extent (if present) |
| frequency | number (Hz) | no | Not used for rendering |
| ambiguous_bearing | number (0-360) | no | Second bearing line (darker shade) |
| label | string | no | Label text on bearing line |
| comment | string | no | Tooltip content |

#### SensorData (from `@debrief/schemas`)

| Field | Type | Required | Rendering Use |
|-------|------|----------|---------------|
| name | string | yes | Layer identification, tooltip |
| base_frequency | number | no | Not used for rendering |
| offset | number (metres) | no | Reserved for #119 array offset |
| worm_in_hole | boolean | no | Reserved for #119 array offset |
| contacts | SensorContact[] | yes | Bearing lines to render |

#### TrackFeature (from `@debrief/schemas`)

| Field | Rendering Use |
|-------|---------------|
| geometry.coordinates | Host platform positions (for origin interpolation) |
| properties.positions | Timestamps for position interpolation |
| properties.style.line.color | Default colour for bearing lines |
| properties.sensors | Array of SensorData to render |

### New TypeScript Types (rendering-only, not in LinkML)

#### SensorRenderContact

Pre-computed rendering data for a single contact. Created by the rendering pipeline from `SensorContact` + interpolated host position.

```typescript
interface SensorRenderContact {
  /** Index into parent SensorData.contacts array */
  contactIndex: number;
  /** Interpolated host position at contact time [lon, lat] */
  origin: [number, number];
  /** Contact timestamp as epoch ms */
  timeMs: number;
  /** Primary bearing in degrees (0-360) */
  bearing: number;
  /** Far end of bearing line [lon, lat] */
  farEnd: [number, number];
  /** Ambiguous bearing far end, if applicable */
  ambiguousFarEnd: [number, number] | null;
  /** Range in metres, or null if no range */
  range: number | null;
  /** Label text */
  label: string | null;
  /** Base colour (inherited from sensor or track) */
  color: string;
  /** Opacity (1.0 = fully opaque, used in snail mode) */
  opacity: number;
}
```

#### SensorArcRenderData

Pre-computed rendering data for a sensor arc (coverage fan).

```typescript
interface SensorArcRenderData {
  /** Arc origin [lon, lat] */
  origin: [number, number];
  /** Left angular bound (degrees, 0-360) */
  leftAngle: number;
  /** Right angular bound (degrees, 0-360) */
  rightAngle: number;
  /** Inner range (metres, 0 for point origin) */
  innerRange: number;
  /** Outer range (metres) */
  outerRange: number;
  /** Start time (epoch ms) */
  startTimeMs: number;
  /** End time (epoch ms) */
  endTimeMs: number;
  /** Fill colour */
  color: string;
  /** Fill opacity */
  fillOpacity: number;
}
```

#### SensorLayerProps

Props for the `SensorBearingLayer` React component.

```typescript
interface SensorBearingLayerProps {
  /** The host track feature containing sensor data */
  feature: TrackFeature;
  /** Current time for temporal filtering (epoch ms) */
  currentTime?: number;
  /** Display mode: 'full' shows all contacts, 'trail' shows snail trail */
  displayMode?: DisplayMode;
  /** Whether the parent track is selected */
  isSelected?: boolean;
  /** Set of hidden feature IDs (sensor-level visibility) */
  hiddenIds?: Set<string>;
}
```

## Data Flow

```
TrackFeature (GeoJSON)
  └── properties.sensors[] (SensorData[])
       └── contacts[] (SensorContact[])
            │
            ├── Interpolate host position at contact.time
            │   └── Binary search on positions[]/coordinates[]
            │
            ├── Compute bearing line far end
            │   └── Geodesic destination from origin at bearing/range
            │
            ├── Apply time filter (currentTime, displayMode)
            │   └── Skip contacts outside temporal window
            │
            ├── Apply snail mode fading
            │   └── proportion = (trailLength - age) / trailLength
            │   └── fadedColor = Color(R*p, G*p, B*p)
            │
            └── SensorRenderContact[]
                 └── Canvas draw calls (bearing lines, labels, arcs)
```

## Validation Rules

1. **Contact time ordering**: Contacts in `SensorData.contacts[]` are expected to be sorted by time (ascending). The rendering layer does not sort -- it relies on import (#117) to produce sorted data.

2. **Bearing range**: `bearing` is 0-360 degrees. The rendering layer handles 0/360 wraparound.

3. **Contact within track time range**: Contacts whose timestamps fall outside the host track's `[start_time, end_time]` range cannot have their origin interpolated. These contacts are skipped with a warning.

4. **Ambiguous bearing**: Only rendered if `ambiguous_bearing` is present and differs from `bearing`.

## State Transitions

Not applicable -- this is a stateless rendering layer. It computes visual output from input data on each render frame. The only state is the Leaflet map's internal canvas state, managed by the framework.

## Relationship to Session State (Zustand)

The sensor rendering layer reads from the session state store indirectly via props:

| Store Slice | Prop | Usage |
|-------------|------|-------|
| `temporal.currentTime` | `currentTime` | Time filtering, snail mode |
| `temporal.displayMode` | `displayMode` | Full vs trail rendering |
| `features.hiddenFeatureIds` | `hiddenIds` | Per-sensor visibility |
| `features.selection` | `isSelected` | Selection highlighting |

The rendering layer does NOT write to the session state store.
