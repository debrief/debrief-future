# Phase 0 Research: Storyboard Time-Range Scenes

**Feature**: #263 — `time_range != null` interpolation (pan/zoom + time-slider scrub)
**Status**: Skeleton — sections filled in order below.

## R1. Schema-evolution strategy (additive optional vs version bump)

**Decision**: Additive only. `SceneProperties.viewport_end` is added as an *optional* slot; `SceneProperties.time_range`'s `range` is changed from the v1 placeholder `string` (must-be-null) to a `TimeRange` sub-record, still optional. `StoryboardProperties.schema_version` stays at `2` (current minimum after #259). The flavour XOR rule (R2) carries the validity load — readers from before #263 see the new fields as absent on legacy plots and continue to validate.

**Rationale**:
- The two new fields are additive on the wire — legacy instant-flavour plots (`time_range = null`, no `viewport_end`) parse and validate unchanged. No on-disk migration is required.
- Article II.3 ties version bumps to *breaking* changes; this change isn't breaking — it widens the accepted set, not narrows it.
- Article XIV authorises pre-4.0 freedom anyway, but exercising "additive without bump" here keeps the precedent clean for future optional features.
- Bumping `schema_version` to `3` would force every legacy plot to be touched on first save (rewriting the version field) without adding any validity power; the XOR rule already detects malformed mixes.

**Alternatives considered**:
- *Bump `schema_version` to 3*. Rejected — adds no validation power; forces churn on every legacy plot. The version slot is reserved for *breaking* changes that need a migration path (per the #259 precedent).
- *Add a single `time_range_end_viewport` slot inside the `TimeRange` sub-record*. Rejected — couples the two viewports into a sub-record (`viewport`, `time_range.end_viewport`) that obscures the symmetry "two captured frames bracket the range" and complicates the XOR rule. Keeping `viewport_end` as a peer of `viewport` mirrors the symmetry of the user's mental model.
- *Make `viewport_end` always required and default it to `viewport` when absent*. Rejected — silently injects data not in the source plot (Article III.2 source-preservation) and defeats the discriminator.

**Recorded as**: ADR-NEW-A (see R10).

## R2. Cross-field flavour rule (XOR coupling between `time_range` and `viewport_end`)

**Decision**: A Scene is exactly one of two flavours:

- **Instant**: `time_range` is null/absent AND `viewport_end` is null/absent.
- **Time-range**: `time_range` is `{ start, end }` with `end > start` AND `viewport_end` is a fully-populated `Viewport` with `bearing == 0`.

Any other combination — `viewport_end` set with `time_range` absent, `time_range` set with `viewport_end` absent, `time_range.end <= time_range.start` — is rejected at validation with a single explicit error naming all the involved fields.

**Implementation location**: the rule lives in three places, with the LinkML rule as the source of truth:

1. **LinkML `rules` block** in `storyboard.yaml` under `SceneProperties` — declarative, drives the JSON Schema constraint and the Pydantic validator generated for cross-field checks.
2. **`shared/components/src/storyboard/validate.ts`** — a `flavourCheck(scene)` function called from the storyboard validator pipeline; returns the same named-error structure used elsewhere in the module (`ReservedSlotViolationError`-style — to be renamed to a more specific class in code review).
3. **`shared/components/src/storyboard/types.ts`** — a discriminated-union narrowing predicate `isTimeRangeScene(scene): scene is TimeRangeSceneFeature`. The predicate is the *only* place application code obtains the narrowed type; it is not duplicated.

**Rationale**:
- A single source of truth (LinkML) is non-negotiable under Article II.1. Pydantic and JSON Schema must agree by generation, not by hand-written parallel checks.
- The TS predicate is necessary because LinkML doesn't generate discriminated-union narrowing for TypeScript (only structural types). Defining the predicate once at the boundary and consuming the narrowed type everywhere keeps Article XV ("narrow at the boundary immediately") satisfied without restating the rule.

**Alternatives considered**:
- *Two separate Scene classes in LinkML (`InstantScene`, `TimeRangeScene`) with a `kind` discriminator*. Rejected for this MVP — would force renaming `SceneProperties` and touching every reader that consumes the existing class; the cost-to-benefit doesn't pay for itself given the XOR rule is two-line. Worth reconsidering at v3 when the feature surface widens.
- *Use `Optional[viewport_end]` + a runtime warning instead of an error for legacy-style mixes*. Rejected — Article I.3 forbids silent failures.

**Recorded as**: ADR-NEW-B.

## R3. Lock-step interpolation primitive (`TimeRangeTween`)

**Decision**: Introduce a single private RAF-driven primitive in `apps/vscode/src/services/storyboardPlayback.ts` (initial home; promoted to `@debrief/components` only if the briefing-renderer port in #264 forces it). The primitive owns one wall-clock loop and on each frame:

1. Computes a normalised progress `p ∈ [0, 1]` (forward) or `p ∈ [1, 0]` (reverse) from `(now - startedAt) / transition_duration_ms`.
2. Computes a linear blend of the viewport endpoints (`center`, `zoom`) — `bearing` stays at `0` (still v1-reserved; this feature does not lift that constraint).
3. Computes a linear blend of the slider endpoints in epoch-ms space.
4. Calls `MapPanel.flyToViewport(blendedViewport, /*duration*/ 0, ...)` so the map snaps to the per-frame viewport without compounding its own internal tween.
5. Calls `session.setCurrentTime(blendedEpoch)`.
6. Schedules the next frame until `p` reaches 1 (or 0 in reverse), then snaps to the endpoint and signals completion.

The existing single-Scene `flyToViewport(viewport, durationMs)` path (which delegates the tween to Leaflet's internal animation) remains the path for **instant** Scenes. Two different primitives keep each path simple; we never try to "drive" Leaflet's tween from the outside.

**Rationale**:
- We need *synchronisation*, which Leaflet's internal tween can't provide — it doesn't know about the slider. Owning the per-frame blend in the engine guarantees the slider and viewport advance from the same `p`.
- Calling `flyToViewport(..., 0)` per frame is documented as a "snap" on the existing `MapPanel` port (no animation), so we get the visible smoothness from our own RAF loop without double-animation.
- Article IV stays clean: the engine still writes through the existing `MapPanel` and `session` ports; it doesn't read DOM or touch Leaflet internals.

**Alternatives considered**:
- *Drive Leaflet's `flyTo` for the viewport and a separate RAF for the slider*. Rejected — two animation clocks drift; lock-step is only guaranteed if a single `p` drives both.
- *Quantise per-frame updates to ~16 ms and tolerate drift*. Rejected — invisible drift becomes visible when tracks move long distances and the slider lags by a frame; FR-PLAY-003 forbids it beyond redraw latency.
- *Promote the primitive into `@debrief/components` now*. Deferred — premature; #264 (briefing renderer) is the second consumer and will know the right shape when it arrives. Promoting prematurely risks an API we then rework.

**Recorded as**: ADR-NEW-C.

## R4. Reuse of `transition_duration_ms` vs new `range_playback_duration_ms`

**Decision**: Reuse the existing `SceneProperties.transition_duration_ms` (default 500 ms, per-Scene overridable, introduced by #217). No new field. For a time-range Scene, `transition_duration_ms` is the wall-clock duration of the synchronised viewport+slider scrub (it ceases to mean "approach time" for that Scene and becomes "scrub time").

**Rationale**:
- The user-visible meaning of "how long does this Scene take to play" is the same axis for instant and time-range Scenes — analysts already understand it from #217.
- Adding a second duration field would force capture UI to surface two controls and force every reader to handle both. The cost outweighs the benefit for the MVP.
- The two semantics ("approach" for instant, "scrub" for range) never apply to the same Scene, so the field overloads cleanly.

**Alternatives considered**:
- *New `range_playback_duration_ms` slot, defaulted to `transition_duration_ms` when absent*. Rejected — adds schema surface for no MVP value.
- *Derive scrub duration from `t_end - t_start` (real-time playback)*. Rejected — a 90-second simulated window would force a 90-second wall-clock scrub, defeating the whole point of being able to time-compress a moment for narrative.
- *Add a separate "approach phase" to time-range Scenes (transition from previous Scene's rest state to this Scene's `(viewport_start, t_start)`) before the scrub*. Rejected for MVP — doubles the engine code path; the spec assumption is that the transition INTO a time-range Scene IS the scrub, with the previous Scene's exit state effectively snapped to `(viewport_start, t_start)` at the start of the new transition.

**Recorded in**: Spec Assumptions section + ADR-NEW-C body (single decision: lock-step primitive + duration reuse).

## R5. `viewport_start` naming and the existing `viewport` slot

**Decision**: Keep the existing `SceneProperties.viewport` slot name. For time-range Scenes, `viewport` is **semantically** `viewport_start` (the camera state at `t_start`). The spec and code use the alias `viewport_start` for readability, but no rename happens at the schema layer.

**Rationale**:
- Renaming `viewport` to `viewport_start` would touch every existing instant-Scene reader for zero validity gain.
- The new `viewport_end` slot makes the symmetry visible at a glance: `viewport` / `viewport_end` reads as "start camera / end camera" once you know the Scene is a time-range flavour, and reads as "the single camera state" for instant Scenes.
- The CRUD module's `assertViewportBearingZero(viewport)` check applies unchanged; for time-range Scenes the same check is also called against `viewport_end`.

**Alternatives considered**:
- *Rename `viewport` → `viewport_start` and add `viewport_end`*. Rejected — Article XIV authorises the rename, but the readability gain doesn't pay for the churn across CRUD, validate, ordering, capture, playback, fixtures, and the eight panels that read `properties.viewport`.
- *Pack the two viewports into a single sub-record `{ start, end }` (with `end` optional)*. Rejected — see R1 alternatives; obscures the instant-flavour case.

**Recorded in**: Spec Assumptions section.

## R6. Reverse playback semantics and entry conditions

**Decision**: Reverse playback through a time-range Scene runs the lock-step primitive (R3) with `p` decreasing from `1` to `0`. Entry conditions:

- The user triggers reverse playback (existing transport "back" action in `storyboardPlayback.ts`) while the engine is at the *end* of a time-range Scene, OR has just been positioned there by a "snap to scene" action with the next playback direction set to reverse.
- The engine sets `startedAt = now`, captures `(viewport_end, t_end)` as the source endpoints and `(viewport_start, t_start)` as the destination endpoints, and runs the same RAF loop with `p` reversed.
- On completion, the engine rests at `(viewport_start, t_start)` and is ready to step back into the previous Scene.

Reverse playback into an instant Scene continues to behave per #217 (viewport-only tween; slider snap). Mixing instant + time-range Scenes in a single reverse run is supported — each transition is independently dispatched by flavour.

**Rationale**:
- Symmetric `p` reversal is the simplest correct implementation; the lock-step primitive doesn't care which way `p` flows as long as the per-frame blend uses the same formula.
- Forward and reverse paths share the same code; one set of tests covers both directions modulo `p`'s sign.

**Alternatives considered**:
- *Disallow reverse playback through time-range Scenes in MVP*. Rejected — Story 3 is explicitly P2 in the spec; deferring it would mean shipping a feature that visibly breaks reverse.
- *Implement reverse as forward-playback with swapped endpoints rather than a reversed `p`*. Mostly equivalent; chose the `p`-reversal form because the existing engine already has a `direction: 'forward' | 'backward'` parameter on `transitionToScene`, and reversing `p` is the smaller diff.

**Recorded in**: Covered by ADR-NEW-C (single ADR on the engine primitive).

## R7. Interrupt and abort semantics during a scrub

**Decision**: An in-progress time-range scrub is abortable at any frame. On abort:

1. The RAF loop cancels itself on the next tick (sets a `cancelled = true` flag checked at the top of the frame callback).
2. The engine does **not** continue tweening; it leaves the slider and viewport at the values most recently written (the last coherent frame).
3. The engine emits a fresh snapshot reflecting that frame so the panel + time view show the analyst's actual position.
4. The engine then dispatches the user's new request (scrub-grab, scene-select, pause, etc.) from a clean state.

Interrupt sources:

- User grabs the time slider → existing `setCurrentTime` from the slider supersedes the engine's writes; the engine detects the externally-driven change and aborts.
- User clicks a different Scene in the panel → existing `transitionToScene` path triggers abort + new dispatch.
- User presses pause/stop → existing transport handler aborts the loop and parks the engine.
- The 250 ms safety timer (per #217 R8) fires → safety net only; should not fire under normal conditions because the loop ends itself.

**Rationale**:
- "Leave at last coherent frame" matches the spec's edge-case guarantee that visuals and slider always agree.
- The flag-and-cancel pattern is the same one used by the existing `flyToToken` system in `storyboardPlayback.ts` — no new abort machinery introduced.

**Alternatives considered**:
- *Fast-forward to the endpoint on abort*. Rejected — leaves the user further from where they wanted than the last frame they saw.
- *Block the abort until the scrub completes*. Rejected — Article I.3 (no silent failures, no surprising delays) and the spec edge case both require responsiveness.

**Recorded in**: Covered by ADR-NEW-C body.

## R8. Ordering anchor (`t_start` as the sort key) and #259 interaction

**Decision**: A Scene's anchor for Storyboard ordering remains `SceneProperties.timestamp`. For instant Scenes (today), `timestamp` is the captured instant. For time-range Scenes (new), `timestamp == t_start` (i.e. the capture flow writes the slider position at the *first* capture action into `timestamp` AND into `time_range.start`). The sort key `(timestamp, creation_order)` from #259 is unchanged; no extra code in `ordering.ts`.

**Rationale**:
- Reusing `timestamp` keeps the sort path single-key-tuple and avoids a special "if time-range then use time_range.start else timestamp" branch in `ordering.ts`.
- Writing the same value to both slots is a small CRUD invariant (asserted in `createScene`) and keeps `timestamp` semantically meaningful for time-range Scenes too ("when does this Scene start").
- The duplicate-storage cost is one ISO-8601 string per time-range Scene — negligible.

**Validation invariant** (added to `validate.ts`): for time-range Scenes, `timestamp == time_range.start` MUST hold. Any drift is a writer bug and is rejected with a named error.

**Alternatives considered**:
- *Make `timestamp` mean "anchor" abstractly and let `ordering.ts` branch on flavour to read either `timestamp` or `time_range.start`*. Rejected — branches in the sort path are bug-prone and split the meaning of a slot across flavours.
- *Drop `timestamp` for time-range Scenes and use `time_range.start` for ordering only*. Rejected — would require `ordering.ts` to know about flavour, and would force the schema to permit a Scene with no `timestamp`, which is a larger change.

**Recorded in**: Data model § Sort invariants.

## R9. Retired and added golden fixtures (Article II)

**Retired**:

- `shared/schemas/src/fixtures/invalid/scene-time-range-non-null.json` — used to enforce "time_range MUST be null in v1"; no longer invalid.
- `shared/schemas/src/fixtures/invalid/scene-viewport-end-set.json` (or equivalent — exact filename confirmed at Phase 1) — used to enforce "no viewport_end allowed"; no longer invalid in isolation (only invalid when `time_range` is null).

**Added — valid**:

- `valid/scene-instant.json` — canonical instant Scene (regression anchor; near-clone of an existing valid fixture, kept distinct under this feature for traceability).
- `valid/scene-time-range.json` — canonical time-range Scene with non-trivial pan/zoom and a 60-second `time_range`.
- `valid/storyboard-mixed-flavour.json` — Storyboard containing two instant Scenes and one time-range Scene, ordered correctly under the `(timestamp, creation_order)` rule.

**Added — invalid**:

- `invalid/scene-time-range-missing-viewport-end.json` — `time_range` set, `viewport_end` absent → flavour XOR violation.
- `invalid/scene-instant-with-viewport-end.json` — `time_range = null`, `viewport_end` set → flavour XOR violation.
- `invalid/scene-time-range-end-not-after-start.json` — `time_range.end <= time_range.start` → range validity violation.
- `invalid/scene-time-range-timestamp-mismatch.json` — `timestamp != time_range.start` → sort-anchor invariant violation (R8).

All four invalid fixtures MUST be rejected with a single named error per spec FR-CAP-006 / FR-SCH-002.

**Rationale**: Article II requires golden fixtures to gate every schema change. The new XOR rule needs both directions covered (instant-with-end, range-without-end), the range validity needs its own fixture, and the sort-anchor invariant needs one. The retired fixtures encoded constraints that are no longer the rule.

**Recorded in**: Data model § Fixtures.

## R10. ADR list

Three ADR appends to `docs/project_notes/decisions.md`, written as part of the implementation:

- **ADR-NEW-A — Additive schema evolution without version bump for time-range Scenes**. Records R1 (no `schema_version` bump; both new slots optional; legacy plots unchanged).
- **ADR-NEW-B — Flavour XOR as a cross-field LinkML rule with a TypeScript narrowing predicate at the boundary**. Records R2 (LinkML `rules` block is the source of truth; `isTimeRangeScene` predicate is the only narrowing site).
- **ADR-NEW-C — Lock-step viewport+slider RAF primitive (`TimeRangeTween`) initially private to the VS Code playback engine**. Records R3, R4, R6, R7 (one ADR, one primitive; promotion to `@debrief/components` deferred to #264).

Exact ADR numbers are assigned at write time by scanning `decisions.md` for the highest existing ADR-NNN and incrementing — the script `update-agent-context.sh` does not touch this file, so the numbering is done by hand in the implementation commit.

