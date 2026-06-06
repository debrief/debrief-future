# Feature Specification: Storyboard Time-Range Scenes

**Feature Branch**: `263-time-range-scenes`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "Storyboard time-range Scenes — `time_range != null` interpolation (pan/zoom + time-slider scrub). Lift the v1 single-instant constraint and make `time_range != null` a first-class capture + playback mode. Capture extends #216 with a 'range' affordance recording `[t_start, t_end]` + a `viewport_end` snapshot. Playback extends #217: during `executeTransition` into a time-range Scene the engine simultaneously interpolates the viewport `viewport_start → viewport_end` AND advances the time-slider `t_start → t_end` over the captured wall-clock duration, so feature visibility / track positions / chart cursors move in lock-step. Reverse playback reverses both axes. Schema work bumps `geojson.yaml` (`SceneProperties.time_range` already exists; add `viewport_end`); generate Pydantic/TS/JSON Schema; Article II adherence tests + new golden fixtures for both Scene flavours. Linear interpolation only in MVP; ease-in/ease-out and edit-time range adjustment deferred. Lands before #264 per interview sequencing. (split from #229 via /interview 229; requires #215–#218 MVP)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture a time-range Scene over an evolving moment (Priority: P1)

An analyst is building a Storyboard to narrate a tactical engagement. Between two single-instant Scenes there is a 90-second window where the situation evolves — contacts move, a track turns, sensors update — and the analyst wants the audience to *watch the situation unfold* rather than jump-cut over it. They pick the start of the window on the time slider, frame the map (zoom and pan to the area of interest), and press the existing "capture Scene" control with a "range" affordance enabled. They then scrub the time slider to the end of the window, re-frame the map (a different zoom/pan that follows the action), and confirm the range. The platform records a single Scene that carries both moments and both viewports, ready for playback.

**Why this priority**: This is the entry point. Without a capture flow that records `[t_start, t_end]` and `viewport_end` together with the existing `viewport`, no time-range Scene can ever be created and the entire feature is inert. It also defines the data shape the rest of the feature consumes.

**Independent Test**: With an open plot and a Storyboard that has at least one v1 instant Scene, enable the "range" affordance, capture the start frame, scrub time forward, re-frame the map, and confirm. A single Scene appears in the Storyboard list; inspecting it shows a non-null `time_range`, a `viewport` matching the start frame, and a `viewport_end` matching the end frame. Saving and re-opening the plot preserves all four values.

**Acceptance Scenarios**:

1. **Given** an analyst is in capture mode with the "range" affordance enabled and the time slider at `t_start`, **When** they frame the map and press capture, **Then** the platform begins a time-range capture: it records `viewport` and `t_start` and waits for the end frame.
2. **Given** a time-range capture is in progress, **When** the analyst scrubs the slider to `t_end > t_start`, re-frames the map, and confirms, **Then** the platform records `viewport_end` and `t_end` and writes a single Scene whose `time_range` is `[t_start, t_end]`.
3. **Given** a time-range capture is in progress, **When** the analyst cancels (e.g. presses Escape or chooses "Cancel range"), **Then** no Scene is written, no partial Scene appears in the Storyboard, and the platform returns to its pre-capture state.
4. **Given** the "range" affordance is disabled, **When** the analyst captures a Scene, **Then** the existing v1 single-instant capture flow runs unchanged: `time_range` is null and `viewport_end` is unset.
5. **Given** a freshly-captured time-range Scene, **When** the plot is saved, closed, and re-opened, **Then** the Scene's `time_range`, `viewport`, and `viewport_end` are all present and unchanged.

---

### User Story 2 - Play back a time-range Scene as a synchronised viewport+slider scrub (Priority: P1)

An audience watches the Storyboard. When playback reaches a time-range Scene, the map pans and zooms smoothly from the captured start viewport to the captured end viewport while the time slider scrubs from the start time to the end time at the same wall-clock rate. Tracks visibly advance, chart cursors slide, and feature-visibility windows update in lock-step with the slider — everything that depends on "current time" moves together. At the end of the Scene the playback engine rests on the end frame and time, ready to advance to the next Scene.

**Why this priority**: This is the entire user value. A captured range that just snaps to its end frame is no better than two stacked instant Scenes. The synchronised viewport-and-slider scrub is what turns a Storyboard from a slideshow into a narrated sequence.

**Independent Test**: Open a Storyboard that contains at least one time-range Scene whose `time_range` covers a window where tracks visibly move. Press Play. The map viewport pans/zooms smoothly to the captured end viewport, the time slider crawls from `t_start` to `t_end` at the same rate, and tracks/cursors advance accordingly. At the end of the Scene the slider rests at `t_end` and the viewport rests at `viewport_end`.

**Acceptance Scenarios**:

1. **Given** a Storyboard with a time-range Scene `S` and playback positioned just before `S`, **When** the user starts playback, **Then** the engine begins interpolating both axes simultaneously: the viewport from `viewport_start` toward `viewport_end` and the time slider from `t_start` toward `t_end`.
2. **Given** the playback engine is mid-scrub through a time-range Scene, **When** the wall-clock progresses by a fraction `f` of the Scene's playback duration, **Then** the slider sits at `t_start + f · (t_end − t_start)` (linear) AND the viewport sits at the corresponding linear blend of `viewport_start` and `viewport_end`. The two axes never drift out of sync.
3. **Given** a time-range Scene completes during forward playback, **When** the engine reaches the end of the Scene, **Then** the slider rests exactly at `t_end`, the viewport rests exactly at `viewport_end`, and the engine is ready to transition to the next Scene (or terminate if `S` is last).
4. **Given** a time-range Scene is in progress, **When** all time-dependent visuals are observed (track positions, feature-visibility windows, chart cursors, any other time-driven layer), **Then** every one of them reflects the slider position at every frame — no visual lags or leads the slider by more than the platform's normal redraw latency.
5. **Given** a Storyboard that mixes instant and time-range Scenes, **When** the user plays the whole thing, **Then** instant Scenes still behave as today (single-instant rest at `timestamp`, viewport tween only) and time-range Scenes behave per this story, with no regression of the instant-Scene behaviour.

---

### User Story 3 - Reverse playback scrubs both axes backwards (Priority: P2)

The analyst wants to step or play the Storyboard in reverse — to revisit a moment, prepare a re-take, or rehearse a backwards narrative. When reverse playback enters a time-range Scene from its "after" side, both axes reverse: the viewport interpolates from `viewport_end` back to `viewport_start` while the slider scrubs from `t_end` back to `t_start`. Everything that depended on the slider during forward playback now winds back in lock-step.

**Why this priority**: Reverse playback is a natural and expected affordance once forward playback works; without it, the Storyboard feels half-finished. It is P2 (not P1) because the forward case carries the bulk of the audience value, and reverse is symmetric — once the forward engine is correct, reverse falls out naturally.

**Independent Test**: With the same Storyboard used in Story 2, position playback at the end of the time-range Scene and trigger reverse playback. The map viewport pans/zooms back toward `viewport_start`, the slider scrubs back toward `t_start`, and tracks/cursors wind back in step.

**Acceptance Scenarios**:

1. **Given** playback is positioned at the end of a time-range Scene `S` and the user triggers reverse playback, **When** the engine begins the reverse transition, **Then** the viewport interpolates from `viewport_end` toward `viewport_start` and the slider scrubs from `t_end` toward `t_start`.
2. **Given** reverse playback is mid-scrub through a time-range Scene, **When** the wall-clock progresses by a fraction `f` of the Scene's playback duration, **Then** the slider sits at `t_end − f · (t_end − t_start)` and the viewport sits at the corresponding linear blend from `viewport_end` toward `viewport_start`.
3. **Given** reverse playback completes a time-range Scene, **When** the engine reaches the Scene's start, **Then** the slider rests at `t_start`, the viewport rests at `viewport_start`, and the engine is ready to continue reverse playback into the previous Scene (or stop if `S` is first).

---

### User Story 4 - Existing single-instant Storyboards continue to work unchanged (Priority: P1)

Storyboards that were captured under v1 (all Scenes have `time_range = null` and no `viewport_end`) continue to load, play, edit, and save with no visible change in behaviour. The schema bump, the new capture affordance, and the new playback path do not regress instant Scenes.

**Why this priority**: A regression here would silently break every Storyboard authored before this change. Back-compat is a hard requirement, not a stretch goal, and ranks alongside the new capture+playback flows as P1.

**Independent Test**: Open a Storyboard authored before this change (or with the "range" affordance disabled throughout) and play it. Visible behaviour is identical to v1: per-Scene viewport tween over `transition_duration_ms`, slider snapping/tweening to each Scene's `timestamp`, no synchronised slider scrub.

**Acceptance Scenarios**:

1. **Given** a Storyboard whose Scenes all have `time_range = null`, **When** the user plays it forward, **Then** every Scene behaves per #217 — a viewport tween into the Scene's `viewport` over `transition_duration_ms` with no slider scrub between Scenes.
2. **Given** a Storyboard whose Scenes all have `time_range = null`, **When** the plot is round-tripped through save → load, **Then** the Scenes are unchanged: `time_range` is still null, no `viewport_end` is invented, no field is silently added or removed.
3. **Given** any Storyboard authored under this feature, **When** it is opened on a build that still has the new schema, **Then** instant Scenes and time-range Scenes coexist correctly and editing one Scene's flavour does not corrupt the others.

---

### Edge Cases

- **Degenerate range (`t_end == t_start`)**: the Scene is recorded with a zero-length time range. Playback collapses to "tween the viewport from `viewport_start` to `viewport_end` while the slider stays at `t_start`". This must not crash and must not divide by zero in the interpolation maths.
- **Reversed range (`t_end < t_start`)**: not supported. Capture MUST reject the confirm action and surface a clear, explicit message naming the offending field; the Scene is not written. (Reverse *playback* of a valid forward-captured range is a separate, supported flow — see Story 3.)
- **`viewport_end` identical to `viewport_start`**: the Scene is recorded with no visible viewport movement; the slider still scrubs. This is a legitimate "hold camera, scrub time" capture and must be supported.
- **`viewport_end` set but `time_range` is null**: not supported. The two fields are coupled — a Scene is either a v1 instant Scene (`time_range = null`, no `viewport_end`) or a time-range Scene (both `time_range` and `viewport_end` set). The platform MUST reject any Scene that has `viewport_end` without `time_range`, or `time_range` without `viewport_end`, with a clear explicit error naming both fields.
- **Very short or very long time ranges**: any positive-duration `[t_start, t_end]` is valid. The wall-clock playback duration is governed by the same per-Scene control used for v1 transitions (`transition_duration_ms`), not by `t_end − t_start`. A 10-minute simulated window can be played back over a fraction of a wall-clock second; conversely a 1-second simulated window can be drawn out over a wall-clock minute.
- **Scrub interrupt during a time-range Scene**: if the user grabs the time slider or clicks a different Scene while a time-range Scene is mid-scrub, the engine MUST abort the scrub cleanly, leave the world in a coherent state (slider, viewport, and all time-driven visuals reflect a single coherent moment), and respond to the user's new request without delay.
- **Interaction with #259 (relaxed timestamp uniqueness)**: ordering rules from #259 apply unchanged. A time-range Scene's anchor timestamp for ordering purposes is its `t_start`. Ties on `t_start` between any two Scenes (instant or range) are broken by creation order.
- **A time-range Scene whose `t_end` falls inside another Scene's `t_start..t_end`**: out of scope for this MVP. Authoring discipline is the analyst's responsibility; the platform does not detect or warn about overlapping ranges.
- **Edit-time adjustment of `[t_start, t_end]` or `viewport_end` after capture**: deferred — out of scope for this MVP. The capture-and-replace pattern from v1 (re-capture the Scene to change it) continues to apply.
- **Round-trip through export and import**: time-range Scenes MUST survive serialisation; a reader on a second machine MUST reconstruct `time_range`, `viewport`, and `viewport_end` byte-equivalently.

## Requirements *(mandatory)*

### Functional Requirements

**Capture (extends #216)**

- **FR-CAP-001**: The Storyboard capture flow MUST expose a "range" affordance that, when enabled, switches capture from single-instant mode to time-range mode.
- **FR-CAP-002**: In time-range capture mode, the platform MUST record `t_start` from the time slider at the moment of the first capture action and `viewport` from the map at that same moment.
- **FR-CAP-003**: After the first capture action, the platform MUST allow the analyst to advance the time slider and re-frame the map, then issue a second confirmation action. On confirmation it MUST record `t_end` from the slider and `viewport_end` from the map at that moment, and write a single Scene whose `time_range = [t_start, t_end]`, `viewport = viewport_at_t_start`, and `viewport_end = viewport_at_t_end`.
- **FR-CAP-004**: The platform MUST support cancelling a time-range capture mid-flow (between the first and second action). On cancel, no Scene is written and no partial state persists.
- **FR-CAP-005**: When the "range" affordance is off, the capture flow MUST behave exactly as #216 — write a v1 instant Scene with `time_range = null` and no `viewport_end`.
- **FR-CAP-006**: Capture MUST reject (with a clear explicit message naming the offending fields) any attempted time-range Scene where `t_end <= t_start`.

**Playback (extends #217)**

- **FR-PLAY-001**: During the playback transition INTO a time-range Scene, the engine MUST simultaneously interpolate two axes over a single wall-clock duration: the map viewport from `viewport_start` to `viewport_end`, AND the time slider from `t_start` to `t_end`. The interpolation MUST be linear in the MVP.
- **FR-PLAY-002**: The wall-clock duration over which both axes interpolate is the same per-Scene transition duration used by v1 instant Scenes (i.e. the existing `transition_duration_ms`, with the same default and override semantics described in #217). No new duration field is introduced for the MVP.
- **FR-PLAY-003**: While a time-range Scene is being interpolated, every time-driven visual (track positions, feature-visibility windows, chart cursors, and any other layer that depends on "current slider time") MUST reflect the slider's instantaneous position. Visuals and slider MUST NOT drift out of sync by more than the platform's normal redraw latency.
- **FR-PLAY-004**: At the end of a time-range Scene's forward playback, the slider MUST rest exactly at `t_end` and the viewport MUST rest exactly at `viewport_end`. The engine MUST then be ready to transition to the next Scene or terminate at end-of-Storyboard.
- **FR-PLAY-005**: Playback transitions INTO an instant Scene (where `time_range = null`) MUST continue to behave per #217 — viewport tween only, slider settles at the Scene's `timestamp`. The new code path MUST NOT alter v1 behaviour.
- **FR-PLAY-006**: Reverse playback through a time-range Scene MUST reverse both axes symmetrically: viewport from `viewport_end` to `viewport_start`, slider from `t_end` to `t_start`, over the same wall-clock duration, with the same lock-step guarantees.
- **FR-PLAY-007**: If the user interrupts an in-progress time-range scrub (e.g. grabs the slider, selects a different Scene, or presses pause/stop), the engine MUST abort the scrub cleanly: slider, viewport, and all time-driven visuals MUST settle on a single coherent moment within `[t_start, t_end]`, and the engine MUST respond to the user's new request without forcing the scrub to complete.

**Schema and data integrity (Article II adherence)**

- **FR-SCH-001**: The Scene schema (`SceneProperties` in the storyboard cluster of `geojson.yaml`) MUST add a `viewport_end` slot. The existing `time_range` reserved slot from #215 MUST become first-class (non-null permitted).
- **FR-SCH-002**: A Scene MUST be one of two flavours, never both and never neither:
  - **Instant Scene**: `time_range = null` AND `viewport_end` absent/unset.
  - **Time-range Scene**: `time_range = [t_start, t_end]` with `t_end > t_start` AND `viewport_end` set.
  Any other combination MUST be rejected at the schema layer with a clear explicit error naming the inconsistent fields.
- **FR-SCH-003**: The schema MUST drive the generation of Pydantic models, TypeScript types, and JSON Schema. All three derived artefacts MUST be regenerated as part of this feature and MUST agree on the new flavour invariants per the project's schema-adherence rule (Article II).
- **FR-SCH-004**: Golden fixtures MUST be added to cover BOTH flavours: at least one canonical-valid instant Scene fixture (round-trippable today, included as a regression anchor) and at least one canonical-valid time-range Scene fixture. Invalid fixtures MUST cover at least: time-range Scene missing `viewport_end`, instant Scene with `viewport_end` set, time-range Scene with `t_end <= t_start`.
- **FR-SCH-005**: Persisted plots MUST round-trip every field of both Scene flavours byte-equivalently across save → load on the same machine AND across save-on-machine-A → load-on-machine-B.
- **FR-SCH-006**: Plots saved before this change (instant Scenes only, no `viewport_end` field present) MUST load successfully without prompting and without silent transformation. The absence of `viewport_end` on an instant Scene is valid; its presence on an instant Scene is invalid (FR-SCH-002).

**Scope discipline**

- **FR-SCO-001**: Interpolation MUST be linear only in this MVP. Ease-in/ease-out, custom curves, or any non-linear interpolation are explicitly OUT of scope and MUST NOT be implemented as part of this feature.
- **FR-SCO-002**: Edit-time adjustment of a time-range Scene's `[t_start, t_end]` or `viewport_end` after capture is explicitly OUT of scope. The capture-and-replace pattern from v1 continues to apply: to change a Scene, re-capture it.
- **FR-SCO-003**: Detection of overlapping time-ranges between Scenes is OUT of scope. Authoring discipline is the analyst's responsibility for the MVP.

### Key Entities *(include if feature involves data)*

- **Scene (instant flavour)**: A single moment in a Storyboard. Carries an anchor `timestamp`, a `viewport` (the camera state at that moment), and the v1 fields (visible-feature set, title, description, ordering). `time_range` is null; `viewport_end` is unset. Behaviour and storage unchanged from v1.
- **Scene (time-range flavour)**: An evolving window in a Storyboard. Carries `time_range = [t_start, t_end]` (with `t_end > t_start`), `viewport` (the camera state at `t_start`, semantically `viewport_start`), `viewport_end` (the camera state at `t_end`), and the same v1 ancillary fields. Its `timestamp` for Storyboard ordering purposes is `t_start`.
- **Storyboard**: An ordered collection of Scenes (mixed flavours allowed). Ordering rules and tied-timestamp behaviour from #259 apply unchanged; a time-range Scene's `t_start` is the value used for ordering.
- **Viewport**: A camera state — geographic bounds and any zoom/rotation/bearing context already captured for instant Scenes in v1. Reused unchanged for both `viewport` and `viewport_end`.
- **Time range**: A pair `[t_start, t_end]` of slider timestamps with `t_end > t_start`. Already reserved in the schema by #215; this feature makes it first-class.

## User Interface Flow *(included — UI feature)*

### Decision Analysis

- **Primary Goal**: Author a Scene that captures an *evolving* moment — a window where both time advances and the camera moves — so audiences can watch a situation unfold rather than jump-cut between snapshots.
- **Key Decision(s)**:
  1. Is this Scene an instant snapshot or a time-range scrub? (selecting the "range" affordance vs leaving it off)
  2. Where does the range start? (slider position and map framing at the first capture action)
  3. Where does the range end? (slider position and map framing at the second capture action)
- **Decision Inputs**: The live map view (so the analyst can verify the framing), the live time slider (so the analyst can place `t_start` and `t_end` precisely), the existing v1 "current Scene" preview/strip (so the analyst sees how the new Scene fits the Storyboard), and a clear visual indicator that a time-range capture is in progress (so the analyst knows the second action will close the range rather than start a new Scene).

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Storyboard panel; "range" affordance off | Toggle the "range" affordance on | The capture control's visual state changes to indicate range mode is armed |
| 2 | Range mode armed; slider at `t_start`; map framed | Press capture | `t_start` and `viewport_start` are recorded; the panel shows "range in progress" with an option to cancel |
| 3 | Range in progress | Scrub the slider to `t_end`; re-frame the map; press confirm | `t_end` and `viewport_end` are recorded; a single time-range Scene is appended to the Storyboard list |
| 4 | Storyboard updated | Press Play | The new Scene plays back as a synchronised viewport+slider scrub; transport controls are disabled until the scrub completes (per #217) |

### UI States

- **Empty State** (no Scenes in the Storyboard): the "range" affordance is available alongside the normal capture control; nothing in the Storyboard list yet.
- **Range mode armed** (toggled on, no first capture yet): the capture control is visually marked as range-mode; pressing it begins a range capture.
- **Range in progress** (first capture action taken, awaiting confirm): the Storyboard panel shows a small banner/indicator "Range in progress — scrub time and re-frame, then confirm" with a Cancel action visible.
- **Time-range Scene resting** (after confirm): the new Scene appears in the Storyboard list with a visible affordance that distinguishes it from instant Scenes (e.g. a small "↔" or "range" badge — visual treatment to be finalised at design/plan time).
- **Playing through a time-range Scene**: transport controls are disabled while the scrub is in flight (per #217); the slider visibly crawls between `t_start` and `t_end`; the map pans/zooms; tracks/cursors advance in step.
- **Error / Invalid range** (e.g. user tries to confirm with `t_end <= t_start`): an explicit, named error message is shown next to the offending control; no Scene is written; the analyst can adjust the slider and retry or cancel.
- **Cancelled capture**: returns to the pre-capture state with no Scene added and no residual UI indicator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can capture a time-range Scene end-to-end (toggle "range" on, capture start, scrub, capture end) in under 30 seconds from the first toggle to the Scene appearing in the Storyboard list, for any window short enough to scrub at the analyst's normal speed.
- **SC-002**: During playback of a time-range Scene, the time slider and the map viewport remain visibly synchronised: at any frame an observer should see the slider position and the viewport position both blending linearly between their endpoints, with no visible "jump" or "stall" on either axis.
- **SC-003**: Every time-driven visual (track positions, feature-visibility windows, chart cursors) updates in lock-step with the slider during a time-range scrub; an observer comparing a paused mid-scrub frame against a manual scrub-to-that-instant frame on a v1 instant Scene sees the same world state.
- **SC-004**: 100% of pre-existing instant-Scene Storyboards load, play, edit, and save without regression after this feature ships. No instant Scene is silently transformed into a time-range Scene and no field is lost in the round trip.
- **SC-005**: 100% of newly-captured time-range Scenes survive a save → load → save → load round trip with byte-equivalent `time_range`, `viewport`, and `viewport_end` values, across the same machine and across two machines.
- **SC-006**: Article II schema-adherence tests pass for both the new schema and all generated artefacts (Pydantic, TypeScript types, JSON Schema). Both new golden fixtures (one instant, one time-range) round-trip cleanly; all invalid-flavour fixtures are rejected with clear, explicit error messages naming the offending fields.
- **SC-007**: A reverse-playback pass through a time-range Scene produces the same intermediate world states as forward playback at the symmetric fractions of progress (i.e. forward at `f` and reverse at `1−f` reach the same `(slider, viewport, visuals)` tuple modulo direction).

## Assumptions

- **Wall-clock duration of a time-range scrub**: assumed to be the same per-Scene `transition_duration_ms` control already defined in #217, with the same default (500 ms) and per-Scene override semantics. No new duration field is introduced in this MVP. This assumption can be revisited if user testing shows time-range Scenes benefit from a separate, range-specific duration control.
- **Existing `viewport` field is `viewport_start`**: assumed that for time-range Scenes the existing `viewport` field is semantically the camera state at `t_start`. Only `viewport_end` is added as a new field. The schema name `viewport` is kept (not renamed to `viewport_start`) to preserve back-compat with instant Scenes; the spec uses `viewport_start` as a readability alias.
- **`timestamp` for ordering is `t_start`**: assumed that a time-range Scene's anchor for Storyboard ordering is its `t_start`. This keeps ordering rules from #259 unchanged.
- **Linear interpolation**: assumed for both axes in the MVP. Ease functions and custom curves are deferred.
- **Capture affordance is a "range" toggle**: assumed that the simplest UI to gate time-range capture is a toggle/affordance on the existing capture control, distinguishing instant from range without adding a new top-level mode. Exact visual treatment is finalised at design/plan time.
- **No edit-time range adjustment**: assumed that the v1 capture-and-replace pattern remains the only way to change a Scene's range or end-viewport in this MVP.

## Dependencies

- **#215 — Storyboarding schema MVP**: provides the reserved `time_range` slot in `SceneProperties` that this feature makes first-class.
- **#216 — Storyboarding capture MVP**: provides the instant-Scene capture flow that the "range" affordance extends.
- **#217 — Storyboarding playback MVP**: provides the `executeTransition` engine, `transition_duration_ms` semantics, and the v1 viewport-tween behaviour that this feature extends.
- **#218 — Storyboarding edit MVP**: provides the edit surface that must continue to work for instant Scenes after the schema bump (no new edit affordances for time-range Scenes in this MVP).
- **#259 — Relax Scene timestamp uniqueness**: time-range Scene ordering uses `t_start` as the anchor timestamp; #259's tied-timestamp + creation-order rules apply unchanged.
- Lands **before #264** per the interview sequencing recorded in issue #630.
