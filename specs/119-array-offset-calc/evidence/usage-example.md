# Usage Example: Array Offset Calculations

This feature ships two API surfaces that resolve to the same algorithm: a
TypeScript function consumed by the rendering pipeline
(`shared/components/src/MapView/array-offset.ts`) and a parallel Python
function consumed by server-side calc tools
(`services/calc/debrief_calc/tools/sensor/array_offset.py`).

All three modes (`PLAIN`, `WORM`, `MEASURED`) are dispatched from a single
entry point (`computeArrayCentre` / `compute_array_centre`). When `offset` is
zero or `array_centre_mode` is unset, the host position is returned unchanged
— making the dispatcher safe to call for every contact.

---

## TypeScript — PLAIN mode

```ts
import { computeArrayCentre } from '@debrief/components/MapView/array-offset';

const sensor = {
  name: 'TOWED_ARRAY',
  offset: 500,
  array_centre_mode: 'PLAIN',
  contacts: [],
};

const origin = computeArrayCentre(
  /* hostPosition  */ [0.0, 50.0],
  /* courseDeg     */ 90.0,
  sensor,
  /* contactTimeMs */ Date.parse('2026-01-01T11:00:00Z'),
  /* trackCoords   */ [],
  /* trackPositions*/ [],
);
// origin ≈ [-0.006995, 49.99999979]  (500m due west of the vessel)
```

## Python — PLAIN mode

```python
from debrief_calc.tools.sensor.array_offset import compute_array_centre

origin = compute_array_centre(
    host_position=(0.0, 50.0),
    course_deg=90.0,
    offset_metres=500.0,
    array_centre_mode="PLAIN",
    measured_positions=None,
    contact_time_iso="2026-01-01T11:00:00Z",
    track_coordinates=[],
    track_positions=[],
)
# origin ≈ (-0.006995480231292392, 49.99999978971712)
```

---

## TypeScript — WORM mode

```ts
import { computeArrayCentre } from '@debrief/components/MapView/array-offset';

const sensor = {
  name: 'TOWED_ARRAY',
  offset: 2000,
  array_centre_mode: 'WORM',
  contacts: [],
};

const trackCoords: [number, number][] = [
  [-5.0, 49.98],
  [-5.0, 50.0],
  [-4.98, 50.0],
];
const trackPositions = [
  { time: '2026-01-01T10:00:00Z' },
  { time: '2026-01-01T10:30:00Z' },
  { time: '2026-01-01T11:00:00Z' },
];

const origin = computeArrayCentre(
  [-4.98, 50.0],
  90,
  sensor,
  Date.parse('2026-01-01T11:00:00Z'),
  trackCoords,
  trackPositions,
);
// origin ≈ [-5.0, 49.99487]  (pre-turn leg, ~2km behind the vessel along the path)
```

## Python — WORM mode

```python
from debrief_calc.tools.sensor.array_offset import compute_array_centre

track_coords = [[-5.0, 49.98], [-5.0, 50.0], [-4.98, 50.0]]
track_positions = [
    {"time": "2026-01-01T10:00:00Z"},
    {"time": "2026-01-01T10:30:00Z"},
    {"time": "2026-01-01T11:00:00Z"},
]

origin = compute_array_centre(
    host_position=(-4.98, 50.0),
    course_deg=90.0,
    offset_metres=2000.0,
    array_centre_mode="WORM",
    measured_positions=None,
    contact_time_iso="2026-01-01T11:00:00Z",
    track_coordinates=track_coords,
    track_positions=track_positions,
)
# origin ≈ (-5.0, 49.994869320037054)
```

---

## TypeScript — MEASURED mode (with automatic PLAIN fallback)

```ts
import { computeArrayCentre } from '@debrief/components/MapView/array-offset';

const sensor = {
  name: 'TOWED_ARRAY',
  offset: 300,
  array_centre_mode: 'MEASURED',
  measured_positions: [
    { time: '2026-01-01T10:00:00Z', location: [-5.001, 49.998] },
    { time: '2026-01-01T11:00:00Z', location: [-4.901, 50.098] },
  ],
  contacts: [],
};

// Inside measured range → interpolated
const inRange = computeArrayCentre(
  [-5.0, 50.0],
  45,
  sensor,
  Date.parse('2026-01-01T10:30:00Z'),
  [],
  [],
);
// inRange ≈ [-4.951, 50.048]

// Outside measured range → automatic PLAIN fallback
const fallback = computeArrayCentre(
  [-5.0, 50.0],
  45,
  sensor,
  Date.parse('2026-01-01T08:00:00Z'),
  [],
  [],
);
// fallback ≈ [-5.00297, 49.99809]  (300m backtrack on reverse bearing 225°)
```

## Python — MEASURED mode

```python
origin_inrange = compute_array_centre(
    host_position=(-5.0, 50.0),
    course_deg=45.0,
    offset_metres=300.0,
    array_centre_mode="MEASURED",
    measured_positions=[
        {"time": "2026-01-01T10:00:00Z", "location": [-5.001, 49.998]},
        {"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]},
    ],
    contact_time_iso="2026-01-01T10:30:00Z",
    track_coordinates=[],
    track_positions=[],
)
# origin_inrange ≈ (-4.951, 50.048)

origin_fallback = compute_array_centre(
    host_position=(-5.0, 50.0),
    course_deg=45.0,
    offset_metres=300.0,
    array_centre_mode="MEASURED",
    measured_positions=[
        {"time": "2026-01-01T11:00:00Z", "location": [-4.901, 50.098]},
    ],
    contact_time_iso="2026-01-01T10:00:00Z",
    track_coordinates=[[-5.0, 50.0]],
    track_positions=[{"time": "2026-01-01T10:00:00Z"}],
)
# origin_fallback ≈ (-5.00296781314724, 49.998092212932896)
```

---

## Integration — no caller changes required

The calculation is wired directly into `prepareSensorContacts` in
`shared/components/src/MapView/sensor-utils.ts`.  Sensor bearing layers
consuming that output automatically pick up the correct origins as soon as a
sensor defines `offset` and `array_centre_mode` on its `SensorData` record.
No explicit `computeArrayCentre` call is required in rendering code — the
existing `<SensorBearingLayer>` component already uses the updated origins.
