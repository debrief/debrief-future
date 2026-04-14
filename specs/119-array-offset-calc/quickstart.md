# Quickstart: 119 Array Offset Calculations

**Date**: 2026-04-10 | **Branch**: `119-array-offset-calc`

## What This Feature Does

When a vessel tows an array (sensor) behind it, bearing lines should originate from the array's position, not the vessel's position. This feature calculates where the array centre actually is, using one of three methods:

- **PLAIN**: Simple backtrack along the vessel's current heading
- **WORM**: Follow the vessel's actual path backward (most accurate through turns)
- **MEASURED**: Use real measured positions from instrumentation

## Where Code Lives

| Language | Location | Purpose |
|----------|----------|---------|
| TypeScript | `shared/components/src/MapView/array-offset.ts` | Browser-side calculations for rendering |
| TypeScript | `shared/components/src/MapView/sensor-utils.ts` | Integration point (`prepareSensorContacts`) |
| Python | `services/calc/debrief_calc/tools/sensor/array_offset.py` | Server-side calculations for analysis tools |

## How It Integrates

### TypeScript (Rendering)

The existing `prepareSensorContacts()` function in `sensor-utils.ts` currently computes the origin as:

```typescript
origin = contact.origin ?? interpolateTrackPosition(coords, positions, contactTimeMs);
```

After this feature, it becomes:

```typescript
const hostPosition = interpolateTrackPosition(coords, positions, contactTimeMs);
origin = contact.origin ?? computeArrayCentre(hostPosition, courseDeg, sensor, contactTimeMs, coords, positions);
```

### Python (Calc Tools)

Calc tools that need array-adjusted origins (e.g., `generate-sensor-range-plot`) call:

```python
from debrief_calc.tools.sensor.array_offset import compute_array_centre

origin = compute_array_centre(
    host_position=(lon, lat),
    course_deg=course,
    offset_metres=sensor_data.offset,
    array_centre_mode=sensor_data.array_centre_mode,
    measured_positions=sensor_data.measured_positions,
    contact_time_iso=contact.time,
    track_coordinates=track.geometry.coordinates,
    track_positions=track.properties.positions,
)
```

## Running Tests

```bash
# TypeScript tests
pnpm --filter @debrief/components test -- --grep "array-offset"

# Python tests
uv run pytest services/calc/tests/tools/sensor/test_array_offset.py -v
```

## Key Design Decisions

1. **No schema changes** -- calculation is ephemeral, not persisted
2. **No explicit cache** -- React re-renders recompute naturally
3. **MEASURED falls back to PLAIN** -- never leaves a contact without an origin
4. **Cross-language parity** -- same golden test cases validate both implementations

## Dependencies

- **#116 Sensor Schema Overhaul**: Provides `SensorData.offset`, `array_centre_mode`, `measured_positions`
- **#118 Sensor Rendering**: Provides the `prepareSensorContacts()` pipeline this integrates into
