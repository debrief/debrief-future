# API Contract: Array Offset Calculations

**Date**: 2026-04-10 | **Feature**: 119-array-offset-calc

## Overview

Array offset calculations are exposed as pure functions (not REST endpoints or MCP tools). They are consumed by the TypeScript rendering pipeline and Python calc tools as library functions.

## TypeScript Functions (shared/components/src/MapView/array-offset.ts)

### computeArrayCentre

Primary dispatch function. Determines array centre based on the sensor's configured mode.

```typescript
/**
 * Compute the array centre for a sensor contact.
 *
 * @param hostPosition - Interpolated vessel position at contact time [lon, lat]
 * @param courseDeg - Vessel course at contact time (degrees, 0-360)
 * @param sensor - Parent SensorData (provides offset, mode, measured_positions)
 * @param contactTimeMs - Contact timestamp (epoch ms)
 * @param trackCoordinates - Track geometry coordinates [lon, lat][]
 * @param trackPositions - Track positions with timestamps
 * @returns Array centre [lon, lat], or hostPosition if no offset applies
 */
function computeArrayCentre(
  hostPosition: [number, number],
  courseDeg: number | null,
  sensor: SensorData,
  contactTimeMs: number,
  trackCoordinates: [number, number][],
  trackPositions: Array<{ time: string }>,
): [number, number];
```

**Behaviour**:
- Returns `hostPosition` unchanged when `sensor.offset` is null, undefined, or 0
- Returns `hostPosition` unchanged when `sensor.array_centre_mode` is null or undefined
- Dispatches to PLAIN, WORM, or MEASURED based on `sensor.array_centre_mode`
- Never returns null (always falls back to hostPosition)

### computePlainOffset

PLAIN mode: backtrack along vessel heading.

```typescript
/**
 * @param hostPosition - Vessel position [lon, lat]
 * @param courseDeg - Vessel heading (degrees)
 * @param offsetMetres - Backtrack distance
 * @returns Array centre [lon, lat]
 */
function computePlainOffset(
  hostPosition: [number, number],
  courseDeg: number,
  offsetMetres: number,
): [number, number];
```

### backtrackAlongTrack

WORM mode: walk backward along track path geometry.

```typescript
/**
 * @param trackCoordinates - Track [lon, lat][] geometry
 * @param trackPositions - Track positions with timestamps
 * @param contactTimeMs - Contact timestamp (epoch ms)
 * @param offsetMetres - Distance to walk backward along track
 * @returns Array centre [lon, lat] on the track path
 */
function backtrackAlongTrack(
  trackCoordinates: [number, number][],
  trackPositions: Array<{ time: string }>,
  contactTimeMs: number,
  offsetMetres: number,
): [number, number];
```

### interpolateMeasuredPosition

MEASURED mode: interpolate from measured position time-series.

```typescript
/**
 * @param measuredPositions - Time-sorted measured array positions
 * @param contactTimeMs - Contact timestamp (epoch ms)
 * @returns Interpolated [lon, lat], or null if contact time is outside measured range
 */
function interpolateMeasuredPosition(
  measuredPositions: Array<{ time: string; location: number[] }>,
  contactTimeMs: number,
): [number, number] | null;
```

### haversineDistanceMetres

Geodesic distance between two points in metres.

```typescript
/**
 * @param lon1 - Longitude of point 1
 * @param lat1 - Latitude of point 1
 * @param lon2 - Longitude of point 2
 * @param lat2 - Latitude of point 2
 * @returns Distance in metres
 */
function haversineDistanceMetres(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
): number;
```

## Python Functions (services/calc/debrief_calc/tools/sensor/array_offset.py)

Mirror functions with identical semantics and Pythonic naming:

```python
def compute_array_centre(
    host_position: tuple[float, float],
    course_deg: float | None,
    offset_metres: float | None,
    array_centre_mode: str | None,
    measured_positions: list[dict[str, Any]] | None,
    contact_time_iso: str,
    track_coordinates: list[list[float]],
    track_positions: list[dict[str, Any]],
) -> tuple[float, float]:
    """Compute array centre. Returns host_position if no offset applies."""

def compute_plain_offset(
    host_position: tuple[float, float],
    course_deg: float,
    offset_metres: float,
) -> tuple[float, float]:
    """PLAIN mode: backtrack along heading."""

def backtrack_along_track(
    track_coordinates: list[list[float]],
    track_positions: list[dict[str, Any]],
    contact_time_iso: str,
    offset_metres: float,
) -> tuple[float, float]:
    """WORM mode: walk backward along track path."""

def interpolate_measured_position(
    measured_positions: list[dict[str, Any]],
    contact_time_iso: str,
) -> tuple[float, float] | None:
    """MEASURED mode: interpolate from measured positions. Returns None if out of range."""

def haversine_distance_metres(
    lon1: float, lat1: float,
    lon2: float, lat2: float,
) -> float:
    """Geodesic distance between two points in metres."""
```

## Golden Test Cases

### Case 1: PLAIN mode -- straight heading

```json
{
  "mode": "PLAIN",
  "host_position": [0.0, 50.0],
  "course_deg": 90.0,
  "offset_metres": 500.0,
  "expected_origin": [-0.007146, 50.0],
  "tolerance_metres": 1.0,
  "description": "Heading east, backtrack 500m westward"
}
```

### Case 2: PLAIN mode -- northward heading

```json
{
  "mode": "PLAIN",
  "host_position": [-5.0, 50.0],
  "course_deg": 0.0,
  "offset_metres": 1000.0,
  "expected_origin": [-5.0, 49.991013],
  "tolerance_metres": 1.0,
  "description": "Heading north, backtrack 1000m southward"
}
```

### Case 3: WORM mode -- straight line (same as PLAIN)

```json
{
  "mode": "WORM",
  "track_coordinates": [[-5.0, 49.98], [-5.0, 49.99], [-5.0, 50.0]],
  "track_times": ["2026-01-01T10:00:00Z", "2026-01-01T10:30:00Z", "2026-01-01T11:00:00Z"],
  "contact_time": "2026-01-01T11:00:00Z",
  "offset_metres": 500.0,
  "expected_origin": [-5.0, 49.99551],
  "tolerance_metres": 1.0,
  "description": "Straight northward track, 500m backtrack"
}
```

### Case 4: WORM mode -- through a turn

```json
{
  "mode": "WORM",
  "track_coordinates": [[-5.0, 49.98], [-5.0, 50.0], [-4.98, 50.0]],
  "track_times": ["2026-01-01T10:00:00Z", "2026-01-01T10:30:00Z", "2026-01-01T11:00:00Z"],
  "contact_time": "2026-01-01T11:00:00Z",
  "offset_metres": 2000.0,
  "tolerance_metres": 5.0,
  "description": "Track turns east at 50.0N, backtrack 2km through the turn"
}
```

### Case 5: MEASURED mode -- interpolation

```json
{
  "mode": "MEASURED",
  "measured_positions": [
    {"time": "2026-01-01T10:00:00Z", "location": [-5.001, 49.998]},
    {"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]}
  ],
  "contact_time": "2026-01-01T10:30:00Z",
  "expected_origin": [-4.951, 50.048],
  "tolerance_metres": 1.0,
  "description": "Midpoint interpolation between two measured positions"
}
```

### Case 6: MEASURED mode -- fallback to PLAIN

```json
{
  "mode": "MEASURED",
  "measured_positions": [
    {"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]}
  ],
  "contact_time": "2026-01-01T10:00:00Z",
  "host_position": [-5.0, 50.0],
  "course_deg": 45.0,
  "offset_metres": 300.0,
  "expected_behaviour": "Falls back to PLAIN mode (contact before measured range)",
  "tolerance_metres": 1.0,
  "description": "Contact time before measured range triggers PLAIN fallback"
}
```

### Case 7: Zero offset

```json
{
  "mode": "PLAIN",
  "host_position": [-5.0, 50.0],
  "course_deg": 90.0,
  "offset_metres": 0.0,
  "expected_origin": [-5.0, 50.0],
  "tolerance_metres": 0.0,
  "description": "Zero offset returns host position unchanged regardless of mode"
}
```
