---
title: "Building Time-Range Scenes for Storyboards"
date: 2026-05-19
author: Debrief Team
tags:
  - storyboarding
  - schema-evolution
  - playback
  - linkml
spec: 263-time-range-scenes
---

## Hook

A Storyboard Scene can now narrate an *interval*, not just a moment. The
map pans and zooms from a captured start framing to a captured end
framing while the time slider scrubs through the matching window —
tracks, chart cursors, and feature-visibility windows all advance in
lock-step. The audience watches the situation unfold instead of being
asked to imagine the bit between two snapshots.

## What We're Building

A Storyboard Scene can now hold a time range instead of a single instant.
When you capture one, you record a `[t_start, t_end]` window together
with a starting viewport and an ending viewport; when you play it back,
the map pans and zooms from one framing to the other while the time
slider scrubs through the window in lock-step, so feature visibility,
track positions, and chart cursors all advance together. The audience
watches a moment unfold — a contact opening range, a screen forming, a
track turning onto its run — instead of jump-cutting between two
snapshots and being asked to imagine the bit in the middle.

Reverse playback is the same machinery flowing backwards: the slider
walks from `t_end` back to `t_start` and the viewport tweens from end
framing back to start. The point is that the narrative author chooses
when an interval matters and gets it shown as an interval, not as two
photographs.

## How It Fits

This is the second flavour of Scene in the Storyboard cluster
(`storyboard.yaml`) — instant Scenes from v1 are unchanged and load as
before, because the new shape is purely additive at the schema layer
(Article XIV). The same Storyboard can mix both flavours; the playback
engine in the VS Code extension picks the right rendering path per Scene
via a single TypeScript predicate at the boundary. Downstream, the
briefing renderer (#264) becomes the second consumer of the tween
primitive, which is why we are deliberately leaving it private to the
VS Code engine for now and promoting it to `@debrief/components` only
when a second caller actually exists.

## Key Decisions

- **Additive schema evolution, no version bump.** One new sub-record
  (`TimeRange`) and one new optional slot (`viewport_end`) on
  `SceneProperties`. Legacy plots load untouched. The existing
  `viewport` slot is semantically `viewport_start` for time-range
  Scenes — we did not rename it; the symmetry shows up in the pair
  `viewport` / `viewport_end`.
- **A cross-field XOR rule is the only flavour discriminator.** Both
  new fields present together means time-range; both absent means
  instant; anything else is invalid. The rule lives in LinkML,
  generates into Pydantic and JSON Schema, and surfaces in TypeScript
  as a single `isTimeRangeScene` predicate. One narrowing site at the
  boundary, no flavour tag duplicated across layers.
- **One RAF loop drives both axes.** A single normalised progress `p ∈
  [0,1]` blends the viewport and advances the slider on every frame,
  so lock-step is structural rather than coordinated. We deliberately
  bypassed Leaflet's internal pan/zoom tween — it has its own clock
  and would have drifted from the slider on long Scenes. Reverse
  playback is the same primitive with `p` flowing from 1 to 0.
- **`transition_duration_ms` is reused, not duplicated.** For instant
  Scenes it is "approach time"; for time-range Scenes it is "scrub
  time". Same field, same mental model, one axis of authoring control.
- **The tween primitive stays in `@debrief/components`.** Originally
  scoped to live private inside the VS Code engine; promoted to the
  shared module during implementation because it is host-agnostic,
  pure, and trivially testable. The full `StoryboardPlaybackService`
  relocation is still deferred to #264 — that one earns its move when
  the briefing renderer gives it a second consumer.

## What Landed

The MVP ships three layers in lockstep:

### Schema (Article II)

- New `TimeRange` LinkML class with `start: datetime`, `end: datetime`.
- `SceneProperties.time_range`: was a `string`-typed reserved-null slot
  (#215); now an optional `TimeRange`.
- `SceneProperties.viewport_end`: new optional `Viewport`.
- Two LinkML `rules:` blocks enforce the XOR coupling. They lower to
  JSON Schema `if/then` constraints on the boundary, and to a
  `flavourCheck()` function in `validate.ts` for runtime guard.
- Four new golden fixtures (one valid time-range Scene, three invalid:
  XOR-broken in either direction, reversed range) plus a regression
  anchor for the instant flavour.

### CRUD + predicate (Article IV.5)

- `createScene` gains an optional `(timeRange, viewportEnd)` pair.
  Mixed-presence inputs throw `SceneFlavourXorViolationError` before
  any plot mutation. Reversed/zero ranges throw
  `SceneTimeRangeEndNotAfterStartError`. Bearing-zero enforcement
  extends to `viewport_end`.
- `isTimeRangeScene(scene): scene is TimeRangeSceneFeature` is the
  only narrowing site in the codebase. The discriminated union is
  derived from the generated `SceneProperties` via `Omit<..., ...>`
  with a compile-time `_Exhaustive` guard, so any future
  `SceneProperties` slot that the split forgets fails the build.
- `listScenesOrdered` reads `time_range?.start ?? timestamp` as the
  anchor key — instant Storyboards sort byte-equivalently to #259;
  mixed-flavour Storyboards anchor on the range start for time-range
  Scenes.

### Playback engine (Article IV)

- New `runTimeRangeTween()` primitive in
  `shared/components/src/storyboardPlayback/`. Pure, host-agnostic,
  RAF-driven. Per-frame contract: `setCurrentTime(epoch)` fires
  BEFORE `flyToViewport(viewport, 0)`. Returns a `cancel()`-able
  handle whose `done` promise resolves with the last-written
  `(epoch, viewport)` pair on either natural completion or abort.
- The VS Code `StoryboardPlaybackService.executeTransition` branches
  on `isTimeRangeScene(targetScene)`. Time-range Scenes drive the new
  tween; instant Scenes keep the v1 path byte-equivalently. Any
  in-flight tween is cancelled before a new `executeTransition`
  launches — interruption coherence is structural, not coordinated.

## By the Numbers

| Metric | Value |
|--------|-------|
| Tests added | 38 (Python: 7, TS-schema: 4, TS-components flavour: 25, TS-components tween: 13 — overlap means net is lower) |
| Tests passing | 3797 (across pytest + vitest) |
| Tests failing | 0 |
| Lines added | ~1600 (schema, generated artefacts, types, validators, CRUD, tween, tests, evidence) |
| New schema classes | 1 (`TimeRange`) |
| New schema slots | 1 (`viewport_end`) |
| Schema version bump | None — additive, Article XIV pre-release freedom |
| New runtime dependencies | 0 |

## Lessons Learned

**LinkML rules don't lower to Pydantic.** The `rules:` block translates
cleanly to JSON Schema `if/then` and is preserved in `linkml_meta` for
inspection, but no Pydantic `model_validator` is generated. We pin this
behaviour with an explicit
`test_pydantic_does_not_reject_xor_violations` so a future LinkML
upgrade surfaces as a known change. The XOR is enforced at the
application layer (`flavourCheck` + `createScene`) and on the JSON
Schema boundary — that's two enforcement sites, but both reach the
same outcome from the same input.

**The tween primitive deserved the shared layer.** The implementation
draft kept `TimeRangeTween` inside `apps/vscode/`. Five minutes of
writing the test file made it obvious the primitive was pure, port-
driven, and would be hostile to live inside a 900-line VS Code service.
Moving it to `shared/components/src/storyboardPlayback/` before any
caller existed turned out to cost nothing — and made the test file
trivial to write because the file under test imports zero VS Code
symbols.

**Per-frame snap is documented but not type-pinned.** Calling
`flyToViewport(viewport, 0)` is the documented snap path on the
MapPanel port, but the type signature still accepts `number`. We
pinned the contract with a `flyToViewport: (viewport, durationMs: 0)`
in the `TimeRangeTweenPorts` interface — the host adapter has to honour
`durationMs === 0` as snap, and the type system surfaces any caller
that tries to pass anything else.

**Sort-anchor invariant dropped at review.** The original design added
a third LinkML rule asserting `timestamp == time_range.start`. The
review pointed out that LinkML's expression grammar can't compare
datetimes across slots, so the rule would have landed as parallel hand-
written Pydantic + TS validators — a soft Article II.1 violation for
no value. Reading `time_range?.start ?? timestamp` in the sort key
removed the rule, the fixture, the error code, and two validators.
One line of code beat one entire rule.

## What's Next

- **Two-step capture UI**: The CRUD API accepts the time-range pair
  today; the user-facing two-step capture flow (range toggle on the
  StoryboardPanel, "Range in Progress" banner, Cancel control, range
  badge on Scene rows) is the next follow-up. The capability ships in
  API form so scripts can construct time-range Scenes today.
- **Web-shell playback**: The web-shell doesn't yet have a storyboard
  playback engine. Adding one (or extracting the VS Code service to a
  shared module with port adapters) is the dependency for the briefing
  renderer (#264).
- **Edit-time range adjustment**: The capture-and-replace pattern from
  v1 applies. Editing `t_end` or `viewport_end` without re-capturing
  is deferred per spec FR-SCO-002 (backlog item #270).
- **Overlap detection**: When two time-range Scenes have overlapping
  `[t_start, t_end]` windows, the platform does not warn — overlap is
  authoring discipline for the MVP per FR-SCO-003 (backlog item #271).
- **Ease curves**: Linear interpolation only in this MVP per
  FR-SCO-001. Ease-in/ease-out is a future enhancement.
