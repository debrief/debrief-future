## Hook

![A Storyboard Scene mid-scrub: the map viewport partway between its start and end framing, the time slider held between t_start and t_end, and tracks drawn at their interpolated positions for that instant](screenshots/04-mid-scrub.png)

## What We're Building

A Storyboard Scene can now hold a time range instead of a single instant. When you capture one, you record a `[t_start, t_end]` window together with a starting viewport and an ending viewport; when you play it back, the map pans and zooms from one framing to the other while the time slider scrubs through the window in lock-step, so feature visibility, track positions, and chart cursors all advance together. The audience watches a moment unfold — a contact opening range, a screen forming, a track turning onto its run — instead of jump-cutting between two snapshots and being asked to imagine the bit in the middle.

Reverse playback is the same machinery flowing backwards: the slider walks from `t_end` back to `t_start` and the viewport tweens from end framing back to start. The point is that the narrative author chooses when an interval matters and gets it shown as an interval, not as two photographs.

## How It Fits

This is the second flavour of Scene in the Storyboard cluster (`storyboard.yaml`) — instant Scenes from v1 are unchanged and load as before, because the new shape is purely additive at the schema layer (Article XIV). The same Storyboard can mix both flavours; the playback engine in the VS Code extension picks the right rendering path per Scene via a single TypeScript predicate at the boundary. Downstream, the briefing renderer (#264) becomes the second consumer of the tween primitive, which is why we are deliberately leaving it private to the VS Code engine for now and promoting it to `@debrief/components` only when a second caller actually exists.

## Key Decisions

- **Additive schema evolution, no version bump.** One new sub-record (`TimeRange`) and one new optional slot (`viewport_end`) on `SceneProperties`. Legacy plots load untouched. The existing `viewport` slot is semantically `viewport_start` for time-range Scenes — we did not rename it; the symmetry shows up in the pair `viewport` / `viewport_end`.
- **A cross-field XOR rule is the only flavour discriminator.** Both new fields present together means time-range; both absent means instant; anything else is invalid. The rule lives in LinkML, generates into Pydantic and JSON Schema, and surfaces in TypeScript as a single `isTimeRangeScene` predicate. One narrowing site at the boundary, no flavour tag duplicated across layers.
- **One RAF loop drives both axes.** A single normalised progress `p ∈ [0,1]` blends the viewport and advances the slider on every frame, so lock-step is structural rather than coordinated. We deliberately bypassed Leaflet's internal pan/zoom tween — it has its own clock and would have drifted from the slider on long Scenes. Reverse playback is the same primitive with `p` flowing from 1 to 0.
- **`transition_duration_ms` is reused, not duplicated.** For instant Scenes it is "approach time"; for time-range Scenes it is "scrub time". Same field, same mental model, one axis of authoring control.
- **The tween primitive stays private for now.** Promotion to `@debrief/components` is deferred to #264, when the briefing renderer becomes the second consumer. Generalising a one-caller abstraction was the more expensive bet.
