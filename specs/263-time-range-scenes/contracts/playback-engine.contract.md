# Contract: Playback Engine — `executeTransition` Flavour Branch

**Surface**: `apps/vscode/src/services/storyboardPlayback.ts` — internal `executeTransition` private method and the new private `TimeRangeTween` primitive it dispatches to.

**Stable consumers**: VS Code transport UI (forward/back/play/pause) and the web-shell transport once #263 lands there; future briefing renderer (#264) re-implements the same contract against its own ports.

## Inputs (unchanged from #217 except for flavour awareness)

`executeTransition(state, targetIndex, targetScene, plot)` is invoked when the transport has resolved a `targetScene` to transition into. The engine MUST inspect the Scene's flavour via `isTimeRangeScene(targetScene)` (per scene-flavour.contract.md) and dispatch:

| Flavour | Path | Behaviour |
|---------|------|-----------|
| Instant | existing path (#217) | viewport flyTo over `transition_duration_ms`; slider snapped to `timestamp` immediately; display_mode restored if present |
| Time-range | NEW path (`TimeRangeTween`) | synchronised viewport + slider linear interpolation over `transition_duration_ms` |

## `TimeRangeTween` — synchronised primitive

**Inputs**:

- `targetScene: TimeRangeSceneFeature` (narrowed via `isTimeRangeScene`)
- `direction: 'forward' | 'backward'`
- `transition_duration_ms: number` (from `targetScene.properties.transition_duration_ms ?? 500`)
- Ports: `MapPanel.flyToViewport(viewport, durationMs)` (instant snap when `durationMs == 0`); `session.setCurrentTime(epochMs)`; `session.setDisplayMode(mode)` if present.

**Per-frame computation** (RAF callback):

```ts
const elapsed = now - startedAt;
const linear = Math.min(1, elapsed / durationMs);
const p = direction === 'forward' ? linear : 1 - linear;

const blendedViewport = {
  center: [
    lerp(viewport_start.center[0], viewport_end.center[0], p),
    lerp(viewport_start.center[1], viewport_end.center[1], p),
  ],
  zoom: lerp(viewport_start.zoom, viewport_end.zoom, p),
  bearing: 0,
};
const blendedEpoch = lerp(epoch(t_start), epoch(t_end), p);

mapPanel.flyToViewport(blendedViewport, /*durationMs*/ 0, token);
session.setCurrentTime(blendedEpoch);
```

**Frame loop end conditions**:

| Condition | Action |
|-----------|--------|
| `elapsed >= durationMs` | Snap to endpoint (`p=1` forward; `p=0` reverse); emit completion snapshot; clear `transitionId`. |
| `state.cancelled === true` (set on abort) | Stop RAF; do not snap; leave at last written frame; emit snapshot reflecting that frame. |
| 250 ms safety beyond `durationMs` | Existing safety timer (per #217 R8) — emit completion snapshot defensively. |

## Output guarantees

1. **Lock-step** — every frame writes a `(viewport, currentTime)` pair derived from the same `p`. The two axes MUST NOT diverge.
2. **No animation compounding** — the per-frame `flyToViewport(.., 0)` is the documented snap path on `MapPanel`. The engine MUST NOT call `flyToViewport` with a non-zero `durationMs` during the tween.
3. **End-state determinism** — on natural completion the slider is exactly at `epoch(t_end)` (forward) / `epoch(t_start)` (reverse) and the viewport is exactly at the destination endpoint.
4. **Reverse symmetry** — a forward pass that visited `(viewport(p=f), epoch(p=f))` at fraction `f` is matched by a reverse pass that visits the same world state at the symmetric fraction `1-f`.
5. **Article IV stays clean** — the engine writes to ports only; it does not read from the DOM, the Leaflet instance, or any rendering surface.

## Abort contract

`storyboardPlayback` MUST be able to abort the tween from any of:

- `setCurrentTime` invoked from outside the engine (user grabs the slider).
- `transitionToScene` called for a different `targetIndex`.
- `pause()` / transport stop.
- Document closed / active Storyboard changed.

The engine MUST:

1. Set `cancelled = true` so the next RAF tick exits.
2. NOT write any further frames.
3. Emit a fresh snapshot reflecting the actually-written last frame.
4. Dispatch the user's new request from `idle`.

## Tests

Located at `apps/vscode/src/services/__tests__/storyboardPlayback.timeRange.test.ts`:

- `forward — frames advance both axes linearly over duration`
- `forward — endpoint exact on completion`
- `reverse — symmetric to forward at every f`
- `mixed sequence — instant Scene before a time-range Scene plays correctly`
- `mixed sequence — time-range Scene before an instant Scene plays correctly`
- `abort — slider grab mid-scrub leaves last coherent frame, dispatches user grab`
- `abort — scene-select mid-scrub leaves last coherent frame, dispatches new transition`
- `safety timer — fires only when RAF stalls; does not corrupt state under normal flow`
