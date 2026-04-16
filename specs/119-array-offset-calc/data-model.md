# Data Model: 119 Array Offset Calculations

**Date**: 2026-04-10 | **Branch**: `119-array-offset-calc`

## Entities

This feature is a calculation feature. It reads from existing schema types and introduces no schema changes. The calculation consumes `SensorData`, `SensorContact`, and `TrackFeature` from `@debrief/schemas` / `debrief_schemas` and produces ephemeral coordinate results used by the rendering pipeline.

### Existing Schema Types (consumed, not modified)

#### SensorData (from `@debrief/schemas`)

| Field | Type | Used By | Notes |
|-------|------|---------|-------|
| offset | float (metres) | All modes | Distance from vessel reference to array centre |
| array_centre_mode | ArrayCentreModeEnum | Mode dispatch | PLAIN, WORM, or MEASURED |
| measured_positions | MeasuredArrayPosition[] | MEASURED mode | Time-series of actual array positions |
| contacts | SensorContact[] | All modes | Contacts whose origins need calculation |

#### SensorContact (from `@debrief/schemas`)

| Field | Type | Used By | Notes |
|-------|------|---------|-------|
| time | datetime (ISO8601) | All modes | Timestamp for position/course lookup |
| origin | float[2] (optional) | Override | Explicit origin bypasses all offset calculation |

#### TrackFeature (from `@debrief/schemas`)

| Field | Type | Used By | Notes |
|-------|------|---------|-------|
| geometry.coordinates | [lon, lat][] | WORM mode | Track path geometry for backtracking |
| properties.positions | {time, course, speed}[] | PLAIN + WORM | Time-sorted positions with course values |

#### MeasuredArrayPosition (from `@debrief/schemas`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| time | datetime (ISO8601) | yes | Position timestamp |
| location | [lon, lat] | yes | Actual array centre geographic position |

#### ArrayCentreModeEnum (from `@debrief/schemas`)

| Value | Algorithm |
|-------|-----------|
| PLAIN | Backtrack along vessel heading by offset distance |
| WORM | Walk backward along track path by offset distance |
| MEASURED | Interpolate from measured_positions time-series |

### New Types (calculation-only, not in LinkML)

#### ArrayCentreResult (TypeScript)

The output of a single array centre calculation. Not persisted -- used ephemerally within `prepareSensorContacts()`.

```typescript
/** Calculated array centre position */
type ArrayCentreResult = [number, number]; // [lon, lat]
```

No wrapper type is needed; the result is simply a coordinate pair matching the existing `origin` field type in `SensorRenderContact`.

## Data Flow

```
SensorData.array_centre_mode ─┐
SensorData.offset ─────────────┤
                                ├─► computeArrayCentre()
TrackFeature (coordinates,     │        │
  positions) ──────────────────┤        ├── PLAIN: geodesicDestination(hostPos, reverseCourse, offset)
                                │        ├── WORM:  backtrackAlongTrack(coordinates, positions, contactTime, offset)
SensorContact.time ────────────┘        └── MEASURED: interpolateMeasuredPosition(measured_positions, contactTime)
                                                │ fallback → PLAIN
                                                ▼
                                        [lon, lat] origin
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                        SensorRenderContact.origin    Python calc tools
                        (bearing line rendering)      (range plots, arcs)
```

### Calculation Priority Chain

For each sensor contact, the origin is resolved in this order:

1. **Explicit override**: If `contact.origin` is set (2-element array), use it directly. Stops here.
2. **Array offset calculation**: If `sensor.array_centre_mode` is set and `sensor.offset > 0`:
   - Dispatch to the appropriate mode algorithm
   - MEASURED mode falls back to PLAIN if no data covers the contact time
3. **Host position**: If no mode is set or offset is zero/null, use the interpolated host track position at the contact timestamp (current behaviour from #118).

### Mode Algorithms

#### PLAIN Mode

```
Input:  hostPosition [lon, lat], courseDeg (float), offsetMetres (float)
Output: arrayCentre [lon, lat]

reverseBearing = (courseDeg + 180) % 360
arrayCentre = geodesicDestination(hostPosition, reverseBearing, offsetMetres)
```

#### WORM Mode

```
Input:  coordinates [lon, lat][], positions {time, ...}[], contactTimeMs (int), offsetMetres (float)
Output: arrayCentre [lon, lat]

1. Find vessel's coordinate index at contactTimeMs (binary search)
2. Interpolate vessel position at contactTimeMs → startPoint
3. remainingDistance = offsetMetres
4. currentPoint = startPoint
5. Walk backward: i = currentIdx, i-1, i-2, ...
   a. segmentLength = haversineDistance(currentPoint, coordinates[i])  [first iteration]
                    = haversineDistance(coordinates[i+1], coordinates[i])  [subsequent]
   b. If remainingDistance <= segmentLength:
      fraction = remainingDistance / segmentLength
      arrayCentre = interpolate(currentPoint or coordinates[i+1], coordinates[i], fraction)
      RETURN arrayCentre
   c. remainingDistance -= segmentLength
   d. currentPoint = coordinates[i]
6. If track exhausted: arrayCentre = coordinates[0]  (earliest point)
```

#### MEASURED Mode

```
Input:  measuredPositions {time, location}[], contactTimeMs (int)
        hostPosition, courseDeg, offsetMetres (for PLAIN fallback)
Output: arrayCentre [lon, lat]

1. Parse measured position timestamps → sorted epoch ms array
2. Binary search for contactTimeMs in measured timestamps
3. If contactTimeMs is within measured time range:
   a. Find bracketing positions [before, after]
   b. fraction = (contactTimeMs - before.time) / (after.time - before.time)
   c. arrayCentre = linearInterpolate(before.location, after.location, fraction)
   d. RETURN arrayCentre
4. Else (contact outside measured range):
   RETURN plainModeCalculation(hostPosition, courseDeg, offsetMetres)
```

## Validation Rules

1. **Offset non-negative**: `sensor.offset` must be >= 0. If negative, treat as 0 (no offset).
2. **Mode null handling**: If `sensor.array_centre_mode` is null/undefined, no offset calculation is applied (host position used directly).
3. **Zero offset shortcut**: If `sensor.offset` is 0 or null, return host position regardless of mode (FR-009).
4. **Measured positions sorted**: Measured positions must be sorted by time. If unsorted, sort before binary search.
5. **Contact time within track range**: Contacts whose timestamps fall outside the host track's time range cannot be processed (no host position available). These are skipped by the existing pipeline.

## State Transitions

Not applicable. Array offset calculation is stateless -- it is a pure function from inputs to a coordinate pair. No cached state, no side effects.

## Relationship to Session State (Zustand)

The array offset calculation reads indirectly from session state via the same props already passed to `SensorBearingLayer`:

| Store Slice | Data Used | How |
|-------------|-----------|-----|
| `features.features` | TrackFeature (coordinates, positions) | Via `feature` prop |
| `features.features` | SensorData (offset, array_centre_mode, measured_positions) | Via `feature.properties.sensors[]` |

The calculation does NOT write to session state. Mode and offset changes are made through the property editor (existing UI), which updates the session state, triggering a React re-render that invokes `prepareSensorContacts()` with the new values.
