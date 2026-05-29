# Usage example — tolerant playhead import (spec 267)

A worked example of the orphaned-playhead recovery: the input, the verdict, the
emitted diagnostic, the in-memory heal, and the on-save heal that closes the loop.

## 1. Before — the orphaned plot (on disk)

The analyst scrubbed the playhead to 2024-02-01, then trimmed the analytical
window to `[2024-01-01, 2024-01-07]` and saved. The temporal `SystemState`
feature inside `features.geojson`:

```json
{
  "type": "Feature",
  "id": "state.temporal",
  "geometry": { "type": "Point", "coordinates": [] },
  "properties": {
    "kind": "SYSTEM",
    "state_type": "temporal",
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-07T00:00:00Z",
    "current_time": "2024-02-01T00:00:00Z"
  }
}
```

The window is coherent; only `current_time` points past `end_time`.

**Spec-261 behaviour:** the entire load fails with
`SystemStateLoadError(kind='cross-field-invariant')` — the plot does not open.

## 2. The verdict — `checkTemporalCrossField`

```ts
checkTemporalCrossField(temporal)
// → {
//     status: 'recoverable-playhead',
//     edge: 'end',
//     clampedCurrentTime: '2024-01-07T00:00:00Z',
//     message: 'current_time (2024-02-01T00:00:00Z) was after end_time (2024-01-07T00:00:00Z); clamped to the window end'
//   }
```

## 3. The emitted diagnostic — `read().playheadClamps`

```ts
const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc);

playheadClamps
// → [{
//     kind: 'playhead-clamped',
//     feature_id: 'state.temporal',
//     edge: 'end',
//     originalCurrentTime: '2024-02-01T00:00:00Z',
//     clampedCurrentTime: '2024-01-07T00:00:00Z'
//   }]

map.temporal.current_time
// → '2024-01-07T00:00:00Z'   (already healed in-memory, before it enters the store)
```

`hydrateStoreFromFeatures` returns that same `PlayheadClampDiagnostic[]`; the
store's `currentTime` is set to `Date.parse('2024-01-07T00:00:00Z')`.

## 4. After — what the analyst sees

- **Plot opens** (map renders, all features present).
- **Playhead** sits on the window end (2024-01-07), not the orphaned 2024-02-01.
- **One non-blocking notification:** *"The saved time-cursor was outside this
  plot's time range and was moved to the window end."* — no modal, no blocking
  dismissal (SC-003/SC-004).

## 5. Heal on save (round-trip — SC-005)

The analyst saves (no auto-save; the clamp did not dirty the plot — FR-008). The
stored feature is rewritten from the store's in-window playhead:

```json
{
  "properties": {
    "kind": "SYSTEM",
    "state_type": "temporal",
    "start_time": "2024-01-01T00:00:00Z",
    "end_time": "2024-01-07T00:00:00Z",
    "current_time": "2024-01-07T00:00:00Z"
  }
}
```

Re-opening now returns `{ status: 'ok' }` — **no clamp, no notification.** The
loop is closed.

## Contrast — the guard rail (US2, unchanged from 261)

```json
{ "start_time": "2024-01-07T00:00:00Z", "end_time": "2024-01-01T00:00:00Z" }
```

```ts
checkTemporalCrossField(badWindow)
// → { status: 'fatal', message: 'start_time (...) must be <= end_time (...)' }
// read.ts throws SystemStateLoadError(kind='cross-field-invariant') → plot does NOT open
```

A feature with **both** `start > end` and an out-of-range `current_time` hits
the `fatal` branch first (precedence, FR-005) — the clamp is never attempted.
