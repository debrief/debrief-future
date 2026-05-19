# Usage Example: Storyboard Time-Range Scenes

This walkthrough shows how an analyst — or a script — uses the new
time-range Scene capability landed in #263.

## Capturing a time-range Scene (API surface)

The CRUD module's `createScene` now accepts an optional `(timeRange,
viewportEnd)` pair. When both are supplied the resulting Scene is the
**time-range flavour**; when both are omitted the Scene is the **instant
flavour** (v1 behaviour, unchanged).

```ts
import { createScene, type Plot, type TimeRange, type Viewport } from '@debrief/components';

const viewportStart: Viewport = {
  center: [-1.25, 50.75],
  zoom: 11,
  bearing: 0,
};
const viewportEnd: Viewport = {
  center: [-1.10, 50.85],
  zoom: 12,
  bearing: 0,
};
const timeRange: TimeRange = {
  start: '2026-05-15T12:00:00Z',
  end:   '2026-05-15T12:01:30Z',  // 90-second window
};

const { plot: nextPlot, scene } = await createScene(plot, {
  storyboardId: existingStoryboardId,
  viewport: viewportStart,
  viewportEnd,
  timeRange,
  timestamp: timeRange.start,        // anchor = t_start by convention
  visibleFeatureIds: ['track-001'],
  thumbnailAssetRef: 'scene-thumbnail-XXX',
  actor: 'alice',
});

// Result:
//   scene.properties.time_range  === timeRange
//   scene.properties.viewport_end === viewportEnd
//   scene.properties.viewport     === viewportStart  (alias for viewport_start)
```

### Capturing an instant Scene (regression — unchanged)

Omitting both `timeRange` and `viewportEnd` produces a v1 instant Scene
byte-equivalently:

```ts
const { scene } = await createScene(plot, {
  storyboardId,
  viewport: viewportStart,
  timestamp: '2026-05-15T12:00:00Z',
  visibleFeatureIds: [],
  thumbnailAssetRef: '...',
  actor: 'alice',
});
// scene.properties.time_range  === undefined
// scene.properties.viewport_end === undefined
```

### Rejected combinations

The createScene call validates the input before any mutation:

```ts
// XOR violation: time_range without viewport_end → SceneFlavourXorViolationError
await createScene(plot, { ..., timeRange, /* no viewportEnd */ });

// Reversed range: end <= start → SceneTimeRangeEndNotAfterStartError
await createScene(plot, { ..., timeRange: { start, end: earlier }, viewportEnd });

// Non-zero bearing on viewport_end → ReservedSlotViolationError
await createScene(plot, { ..., viewportEnd: { ..., bearing: 5 } });
```

All three errors carry stable codes (`SceneFlavourXorViolation`,
`SceneTimeRangeEndNotAfterStart`, `ReservedSlotViolation`) so consumers
match on `err.code`, not class identity.

## Playback (VS Code extension)

The Storyboard playback engine in
`apps/vscode/src/services/storyboardPlayback.ts` branches automatically on
Scene flavour via `isTimeRangeScene(targetScene)`. No call-site change is
required — existing transport commands (`debrief.storyboard.forward`,
`debrief.storyboard.backward`, Scene-row click, Scene-rectangle click)
all pick up the new behaviour for free.

- **Instant Scene as the transition target**: viewport flies to
  `viewport` over `transition_duration_ms`; the slider snaps to
  `timestamp`. Exactly like v1.
- **Time-range Scene as the transition target**: the new `TimeRangeTween`
  drives both axes in lock-step over `transition_duration_ms`. Forward
  step → slider crawls from `t_start` to `t_end` while the viewport
  blends from `viewport_start` to `viewport_end`. Reverse step → both
  axes reverse symmetrically.

### Lock-step guarantee (FR-PLAY-003)

Each RAF frame writes `setCurrentTime(epoch)` FIRST, then
`flyToViewport(blendedViewport, 0)`. The `0` duration is the documented
snap path on `MapPanel` — no animation compounding. Every time-driven
visual (track positions, feature-visibility windows, chart cursors)
reflects the slider position by the time the next redraw fires.

### Interrupt coherence (FR-PLAY-007)

Any of these events aborts the in-flight tween:

- User grabs the time slider (the engine's `setCurrentTime` listener
  detects the externally-originated write).
- User clicks a different Scene → `executeTransition` cancels the
  current tween before launching the new one.
- Document closed / active Storyboard changed → `clearTransition`
  cancels the tween.

On abort the engine emits a fresh snapshot reflecting the last frame
written; no torn `(currentTime, viewport)` pairs leak past the abort.

## Programmatic playback driving (testing)

The `TimeRangeTween` primitive accepts an optional `scheduler` so tests
drive the loop deterministically without real RAF:

```ts
import { runTimeRangeTween } from '@debrief/components';

const { scheduler, advance, tick } = makeFakeScheduler();
const handle = runTimeRangeTween({
  targetScene: timeRangeSceneFromCrud,
  direction: 'forward',
  durationMs: 1000,
  ports: {
    setCurrentTime: (epochMs) => { /* record */ },
    flyToViewport: (viewport, durationMs) => { /* record */ },
  },
  scheduler,
});

tick();             // frame at t=0
advance(500); tick();  // frame at t=500ms (p=0.5)
advance(500); tick();  // frame at t=1000ms (p=1.0, natural completion)

const result = await handle.done;
// result.completed === true
// result.lastEpoch === Date.parse(t_end)
// result.lastViewport === viewport_end
```

This is the surface the engine uses internally; exposing it makes the
visual contract auditable from a regression test without spinning up a
real DOM or VS Code webview.

## Sort behaviour with mixed flavours

Storyboards may contain any mix of instant and time-range Scenes. Sorting
uses `(time_range?.start ?? timestamp, creation_order)` ascending, so:

| Scene | Flavour | `timestamp` | `time_range.start` | Anchor |
|-------|---------|-------------|---------------------|--------|
| A | instant | T0 | — | T0 |
| B | time-range | T0 | T0 | T0 |
| C | instant | T0+30s | — | T0+30s |
| D | time-range | T0+30s | T0+30s | T0+30s |

Yields order `A → B → C → D`. Ties on the anchor (A vs B, C vs D) are
broken by `creation_order` ascending per #259.

## Round-trip survival

A captured time-range Scene survives save → close → re-open
byte-equivalently. All three of `time_range`, `viewport`, and
`viewport_end` are persisted into the plot's GeoJSON FeatureCollection
and read back unchanged. Confirmed by:

- `test_time_range_scene_round_trip` (Python — Pydantic write → read)
- `round-trips a time-range Scene preserving both flavour slots` (TS —
  JSON.stringify → JSON.parse)
- The existing `validate.test.ts` round-trip family (all 9 tests still
  pass under the new schema)

## Backward compatibility

Storyboards captured before #263 (all Scenes have `time_range: null` or
the slot absent, no `viewport_end`) continue to load, play, edit, and
save with no visible change:

- The Pydantic `time_range` field defaults to `None`; legacy fixtures
  with `time_range: "{...}"` (stringified, from the #215 reserved-slot
  era) now fail with a structural ValidationError naming the
  `time_range` field, which is the same end-user outcome as before (the
  Scene is rejected, just with a slightly different code path).
- The TS validate path's reserved-slot block for `time_range` is
  replaced by `flavourCheck()`, which accepts the absent case silently
  and only fires when `viewport_end` is present without `time_range`
  (which is impossible for a pre-#263 plot).
- The playback engine routes `time_range = undefined` Scenes through the
  unchanged v1 branch. The 61 pre-existing storyboard-playback tests in
  the VS Code unit suite pass without modification.
