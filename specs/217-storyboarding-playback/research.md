# Phase 0 — Research: Storyboarding — Panel + Playback

**Feature**: 217-storyboarding-playback
**Date**: 2026-04-21
**Input**: Technical Context in `plan.md`

The Technical Context in `plan.md` has **zero `NEEDS CLARIFICATION`
markers** — every decision bar the six below was either inherited
from #215 / #216 or is mechanical (re-use existing patterns). This
document records the six non-trivial decisions specific to this slice.

---

## R1. `flyTo` + time-slider tween — one mechanism or two?

### Decision

**Two independent animations driven from a single imperative entrypoint
on the playback service.** The service holds a single `advanceTo(scene,
durationMs)` method which fans out to:

1. `MapPanel.flyToViewport(viewport, durationMs)` → webview
   `postMessage` → Leaflet `L.Map.flyTo([lat, lon], zoom, { duration:
   durationMs / 1000, easeLinearity: 0.25 })`.
2. `SessionStoreApi.setCurrentTime(startEpoch + ((targetEpoch -
   startEpoch) * t))` on a browser-`requestAnimationFrame` loop inside
   the webview (the time slider already animates on `setCurrentTime`
   changes; Leaflet does the map tween internally).

A shared `transitionId: number` is used to correlate the two so a
scrub mid-flight can cancel both; the service also holds a single
`isTransitionInFlight` flag.

### Rationale

- Leaflet's `L.Map.flyTo` is already the idiomatic API and respects
  the browser's native animation frame cadence; re-implementing it
  via `requestAnimationFrame` + `setView` would be strictly worse.
- The time-slider tween is a single-slot write (`currentTime` as
  `number | null` on the `TemporalSlice`), so a simple RAF loop over
  the delta is adequate — no library needed.
- A single imperative entrypoint keeps all transport state in the
  service; the webview does not hold transport state, only renders
  what it receives.

### Alternatives considered

- **Single unified animation library (`framer-motion`, `gsap`)** —
  rejected. Adds a runtime dependency that replaces primitives we
  already have. Both Leaflet and the time-slider webview already
  animate natively.
- **Do the tween inside `L.Map.flyTo`'s frame callback** —
  rejected. `flyTo` doesn't expose a per-frame callback in a way
  that survives version upgrades; correlating two animations in the
  service is more robust.
- **Let the webview own transport state** — rejected. The service
  needs to gate Forward / Backward on `detectMissingDataForScene`,
  which needs the full plot FeatureCollection. That lives in the
  extension, not the webview.

---

## R2. Scrub-window enforcement — where does the clamp live?

### Decision

**Narrow the scrubbable `start`/`end` pair in `TimeRangeViewProvider`
while leaving `dataStart`/`dataEnd` unchanged.** When transport moves
to Scene N, the playback service calls:

```ts
timeRangeView.setScrubbableRange(
  epoch(scenes[N].timestamp),
  N < scenes.length - 1
    ? epoch(scenes[N + 1].timestamp)
    : epoch(scenes[N].timestamp),   // locked at last
);
```

`TimeRangeViewProvider`'s existing `updateTimeExtent` message already
carries both pairs:

```ts
{
  type: 'updateTimeExtent',
  start: number,        // scrubbable lower bound
  end: number,          // scrubbable upper bound
  dataStart: number,    // visible data extent — stays at plot's timeRange
  dataEnd: number,
}
```

The view provider overrides `start`/`end` with the Scene-window values
while still sending `dataStart`/`dataEnd` from `state.timeRange`. The
`TimeScrubber` component reads both — the thumb drag is constrained
to `[start, end]`; the visual track shows the full `[dataStart, dataEnd]`
extent for context. On `setScrubbableRange(null, null)` the override
is cleared and both pairs go back to `state.timeRange`.

### Rationale (refined after code survey)

- **`timeFilter` is the wrong lever.** It exists on `TemporalSlice`
  but is consumed only by `StacBrowser` for catalog browsing — it
  does not constrain `TimeScrubber`. Using it would produce a silent
  failure (FR-PLAY-012 would not fire). Verified at
  `shared/components/src/StacBrowser/useBrowserFilter.ts` and at
  `apps/vscode/src/webview/web/timeController.tsx` where the scrubber
  consumes `timeExtent` only.
- **The scrubbable vs data-context split is already in the wire
  format.** The `updateTimeExtent` message's four-field shape was
  designed for exactly this case. Using it for the Scene window is
  idiomatic and zero-impact on existing paths.
- **"Clamp" (rather than "reject a drag") matches spec wording** —
  "scrub is constrained to `[Scene[N].t, Scene[N+1].t]`" — and is
  the idiomatic slider behaviour.
- **Visual preservation**: keeping `dataStart/dataEnd` intact means
  the analyst sees the full time range in the scrubber track with
  the thumb clamped to a sub-range. Stakeholders can see the overall
  extent as well as the current segment — better than collapsing the
  whole scrubber to the Scene window.
- **Last-Scene lock**: setting `start === end` collapses the thumb
  to a single instant, which the existing scrubber already treats as
  "locked at timestamp." No special-case code needed.

### Alternatives considered

- **`setTimeFilter({start, end})` on `TemporalSlice`** — rejected
  after code survey. `timeFilter` does not feed the scrubber; would
  silently fail the FR without a visible test failure.
- **Add a new `scrubWindow` prop to the `TimeScrubber` component** —
  rejected. Adds a third time-range concept to a component that
  already takes two. The `updateTimeExtent` message is the cleaner
  extension point.
- **Clamp `setCurrentTime` writes in the service** — rejected. The
  scrubber thumb would still drag outside the window visually; the
  analyst would see the thumb jump back, not hit a wall. That is a
  silent-UX failure (Article I.3).
- **Let the analyst scrub anywhere but snap back to the window** —
  rejected. Contradicts the spec ("locked at or before the
  boundaries") and creates frustrating UX in front of a stakeholder.

### Downstream impact

- The service **must** call `setScrubbableRange(null, null)` on
  `service.dispose()`, on plot-close, on dropdown-switch-to-null,
  and on emptying the active Storyboard. Tested.
- `TimeRangeViewProvider` retains a `scrubbableOverride: { start:
  number | null; end: number | null }` field; when either endpoint
  is non-null the override wins. This is purely extension-side state
  (no session-state slice changes; no persistence).
- Existing scrubber consumers outside storyboard playback are
  unaffected — they never call `setScrubbableRange`.

---

## R3. Where does the hard-block modal live — webview or extension host?

### Decision

**Extension host via `window.showInformationMessage(…, { modal: true },
"Jump past this scene", "Open for editing")`.** The presentational
`HardBlockModal.tsx` sub-component in the panel is only used by
Storybook demos; the real prompt is a VS Code-native modal.

### Rationale

- VS Code-native modals live above the webview and cannot be
  obscured by it; they are keyboard-trappable and dismissable via
  `Escape` (which the analyst will expect).
- The two action labels are stable strings — no need for webview
  round-trip to render them.
- The missing-data payload (list of unresolved feature IDs or
  "out-of-range") is short; fitting it in the modal body is trivial.
- VS Code's modal button labels render exactly as passed, so
  Internationalisation routes cleanly through the extension's
  `messages.ts`.

### Alternatives considered

- **Custom webview modal overlay** — rejected. Would require CSP
  changes, focus-trap logic, `aria-modal` plumbing, and would not
  block map interactions behind it.
- **Mixed (modal in the panel webview, plain toast in the extension
  host depending on focus)** — rejected. Unpredictable UX; also
  creates two code paths for the same concern.

### Why keep the Storybook `HardBlockModal.tsx` component?

- To document the copy + layout in a reviewable medium (stakeholder
  review, shipped blog post screenshot).
- To have a pure presentational surface so the *copy* can be proof-
  read without a live VS Code host.
- It is not loaded in the real extension path.

---

## R4. Scoped arrow-key binding — `when` clause shape?

### Decision

```json
{
  "command": "debrief.storyboard.forward",
  "key": "right",
  "when": "debrief.storyboardActive && (debrief.mapFocused || focusedView == 'debrief.storyboardPanel')"
},
{
  "command": "debrief.storyboard.backward",
  "key": "left",
  "when": "debrief.storyboardActive && (debrief.mapFocused || focusedView == 'debrief.storyboardPanel')"
}
```

- **`debrief.storyboardActive`** — a new context managed by the
  playback service. Set `true` when an active Storyboard exists
  **and** has at least one Scene; cleared on plot close, on deletion
  of the last Storyboard, on emptying the active Storyboard's Scenes,
  or when the user deactivates the panel.
- **`debrief.mapFocused`** — existing context maintained by
  `apps/vscode/src/webview/mapPanel.ts`.
- **`focusedView == 'debrief.storyboardPanel'`** — built-in VS Code
  context for `WebviewView` focus.

### Rationale

- Matches the spec: keys are bound only when (a) a Storyboard is
  ready to play back, **and** (b) focus is on one of the two
  surfaces that conceptually own the transport (the panel or the
  map).
- VS Code evaluates `when` clauses per keypress, so the guard is
  enforced by the platform — no service-side re-check needed.
- Adding a **single** new context (`debrief.storyboardActive`)
  keeps the `when` surface small and easy to reason about.

### Alternatives considered

- **Bind `Left` / `Right` globally when a Storyboard is active** —
  rejected. Breaks SC-007 (no global key leakage) — e.g. arrow
  navigation inside a QuickPick or the file explorer would step the
  transport.
- **Bind only when the panel is focused** — rejected. Analysts will
  want to drive the transport from the map (the canonical briefing
  surface).
- **Use a single broad context `debrief.storyboardTransportActive`
  that combines both guards** — rejected. Harder to re-use (#218
  would want the *active-storyboard* part without the *focus* part
  for rename / delete commands).

### Test harness

- SC-007 requires a Playwright test that focuses an unrelated view
  (e.g. Log Panel webview or the built-in file explorer) and
  presses `Right`. The service `storyboardPlayback.test.ts` is a
  unit test; the `tests/e2e/test-storyboard-playback.spec.ts` is the
  integration enforcement for SC-007.

---

## R5. Antimeridian-crossing rectangle rendering

### Decision

**Render as a single best-effort `L.Polygon` with the raw four-corner
coordinates as provided by the Scene's `viewport` slot.** No splitting
into two halves.

### Rationale

- #215 already flags antimeridian-crossing viewports as a "best-effort"
  render — the spec notes "Rendered as a best-effort Polygon (warned by
  #215)."
- Leaflet's own `L.Polygon` handles the crossing with a visible-but-
  correct render (the polygon wraps around the back of the globe in
  the default projection). The rectangle's *click* still targets the
  correct lat/lon pair, and that is the enforcement surface
  (FR-PLAY-017).
- Splitting into two polygons would require cross-product geometry
  logic in the render path — a disproportionate cost for an edge
  case that defence analysts handle rarely (most plots are in a
  single ocean basin; few cross 180°).

### Alternatives considered

- **Split into two L.Polygons at ±180°** — rejected for complexity
  (see above); also would double-fire click handlers at the seam.
- **Skip rendering antimeridian-crossers entirely with a toast** —
  rejected; breaks SC-006 ("only the active Storyboard's Scene
  rectangles are visible" — silently hiding a rectangle violates
  the spirit of the invariant).

### Testing

- `SceneRectangleLayer.test.tsx` includes a fixture with a viewport
  `[170, 10], [-170, 10], [-170, 0], [170, 0]` — the test asserts
  that exactly one `L.Polygon` is rendered and that clicking at the
  centroid fires `onSceneClick` with the correct scene ID.

---

## R6. Multi-Storyboard ephemeral-selection storage

### Decision

**In-memory `Map<documentUri, storyboardId>` inside
`StoryboardPlaybackService`.** No persistence to disk, no session-state
slice addition. Keyed by `documentUri` — the same STAC URI string
`SessionManager` uses as its session key.

- On plot **open**: if the map has no entry for this `documentUri`,
  seed it from `getMostRecentlyModifiedStoryboard(plot)` (the new
  #215 query added by this slice — see R7).
- On **dropdown switch**: update the entry.
- On plot **close**: drop the entry.
- On **session reload** (VS Code restart / window reload): the map is
  empty; next open re-seeds from `getMostRecentlyModifiedStoryboard`.

### Rationale

- The spec explicitly says active selection is ephemeral (FR-PLAY-002)
  and on re-open defaults to most-recently-modified (FR-PLAY-002,
  SC-002 implicit).
- Keeping it in the service means no new session-state slice to
  design / persist / migrate, and no risk of stale selection after
  a Storyboard is deleted by another tab.
- Keyed by `documentUri` (the STAC URI string `SessionManager` uses as
  its session key — `apps/vscode/src/services/sessionManager.ts:101`)
  so multi-plot hosts work correctly.

### Alternatives considered

- **Add a `uiPreferences.activeStoryboardId` slice to session-state** —
  rejected. Violates the spec's ephemerality clause; also creates
  a migration surface for #218 to inherit.
- **Store on `window` / extension `Memento`** — rejected for the same
  ephemerality reason; also persists across VS Code restarts when the
  spec says it should not.
- **Recompute every render from `getActiveStoryboardDefault`** —
  rejected. That would prevent the analyst from switching Storyboards
  at all.

### Edge cases handled

- **External deletion** (another tab deletes the active Storyboard):
  service detects via `MapPanel.onFeaturesChanged` (new event —
  arch-fix 2) → re-invokes `getMostRecentlyModifiedStoryboard` (new
  #215 query — R7) on the refreshed plot, updates the map, and
  broadcasts the new selection to the panel. If no Storyboards
  remain, clears `debrief.storyboardActive` context and the panel
  switches to its empty state.
- **Rename of the active Storyboard**: the `storyboardId` is stable;
  the map entry is unaffected. Panel re-renders the new name from
  the refreshed plot.

---

## R7. "Most-recently-modified" default — where does the query live?

### Decision

**Add a new pure query `getMostRecentlyModifiedStoryboard(plot)` to
`shared/components/src/storyboard/queries.ts`** (in #215's module),
alongside the existing `getActiveStoryboardDefault` (which returns
"first by name ascending"). Both functions stay — they answer
different questions.

```ts
/**
 * Return the plot's most-recently-modified Storyboard, measured as
 * `provenance[last].timestamp` (appended by every CRUD op per #215).
 * Ties broken by Storyboard id ascending (deterministic). Null if
 * the plot contains no Storyboards.
 */
export function getMostRecentlyModifiedStoryboard(
  plot: Plot,
): StoryboardFeature | null;
```

~10 LOC. Covered by tests added to
`shared/components/src/storyboard/__tests__/queries.test.ts`.

### Rationale

- The original plan cited `getActiveStoryboardDefault(plot)` as the
  most-recently-modified resolver, but code survey showed it returns
  "first by name ascending" (`shared/components/src/storyboard/queries.ts:41`).
  Using it would produce silently-wrong behaviour against FR-PLAY-002.
- Adding the new query to #215 keeps Article II single-source-of-
  truth: #217's consumer does not re-implement the scan. Replaces
  what would otherwise be a minor Article IV departure (domain
  logic in the VS Code extension).
- #215's `provenance[last].timestamp` is the authoritative "last
  modified" signal — every CRUD op appends. No separate
  `last_modified_at` slot needs introducing.

### Alternatives considered

- **Compute in the playback service** — rejected. The scan logic
  fits the "pure query over a Plot" shape that #215's queries module
  already owns; duplicating it in the extension would fork the
  "last modified" concept across two call sites.
- **Change spec FR-PLAY-002 to accept #215's `getActiveStoryboardDefault`** —
  rejected. The product intent is that the analyst returns to the
  Storyboard they were last working on; name-alphabetical is
  unrelated to that intent.

---

## R8. In-flight transition safety — panel hide + `moveend` no-fire

### Decision

**The service holds a single `transitionId: number | null` per plot
and clears it on three independent triggers:**

1. **`moveend` event** from Leaflet's `L.Map.flyTo` (primary path).
2. **`webviewView.onDidChangeVisibility(false)`** on the Storyboard
   panel (panel hidden / tab switched).
3. **Safety timer** — `setTimeout(durationMs + 250)` scheduled at
   transition start; whichever of these three fires first clears
   the transitionId and emits the snapshot.

```ts
private startTransition(documentUri: string, durationMs: number): number {
  const token = this.nextTransitionId++;
  this.transitions.set(documentUri, { token, startedAt: Date.now() });

  const timer = setTimeout(() => this.clearTransition(documentUri, token),
                           durationMs + 250);
  const disposable = this.panelView.onDidChangeVisibility((visible) => {
    if (!visible) this.clearTransition(documentUri, token);
  });

  this.mapPanel.onFlyToComplete(({ token: completedToken }) => {
    if (completedToken === token) this.clearTransition(documentUri, token);
  });

  // On clear:
  // - cancel RAF tween
  // - clear timer
  // - dispose visibility listener
  // - emit snapshot with transport.transitionInFlight = false
}
```

### Rationale

- Leaflet's `L.Map.flyTo` on a hidden webview has no defined
  behaviour — `moveend` may fire late, never, or at an unexpected
  time after the panel re-shows. The safety timer caps this.
- Panel-hide-during-flight is a real user flow (the analyst switches
  VS Code tabs, comes back a minute later); leaving `transitionId`
  non-null blocks all subsequent transport until a manual refresh.
- Three independent clears are idempotent — the first one wins;
  the other two are no-ops on a stale token.

### Alternatives considered

- **Rely on `moveend` only** — rejected. Hidden-webview case leaves
  the service locked.
- **Poll for completion every 100ms** — rejected. Three events +
  one timeout is cheaper and more deterministic than polling.
- **Fire-and-forget the transition** — rejected. The snapshot
  needs `transport.transitionInFlight = false` to re-enable the
  transport buttons.

---

## R9. Transport-vs-CRUD race

### Decision

**Reject Storyboard CRUD ops (Create / Rename / Delete) during an
in-flight transition** — same single-flight policy as transport.
Commands return immediately with no side effect; the panel's
overflow menu buttons are disabled (via `transport.transitionInFlight`
on the view-model).

On a Delete-the-active-Storyboard op after the transition clears, the
service first clears `transitionId`, then runs the CRUD call, then
re-seeds active selection via
`getMostRecentlyModifiedStoryboard(plot)`.

### Rationale

- A Delete-during-flight would mutate the plot while the transition
  is animating toward a Scene that may no longer exist. On
  completion, the service would try to emit a snapshot for removed
  features. Worst case: a stale thumbnail flashing up before the
  panel refreshes.
- Consistent with the existing transport-vs-transport guard — no
  new policy to reason about.
- Rename-during-flight is comparatively benign (just a name change),
  but it's cheaper to use one uniform rule than to model per-op
  safety.

### Alternatives considered

- **Cancel the transition, then run CRUD** — rejected as the
  default. A partial fly-to followed by a delete is jarring visually;
  the analyst may not have realised a transition was in flight.
  *Available as a design option if user testing shows rejection is
  too strict.*
- **Queue CRUD ops for post-transition execution** — rejected.
  Adds a queue surface for a race that completes in 500ms. Delay +
  retry is simpler.
- **Allow CRUD during flight** — rejected per first bullet.

---

## Consolidated Decisions Summary

| # | Topic | Decision | Key Rationale |
|---|-------|----------|---------------|
| R1 | Map + slider tween mechanism | Two independent animations driven from a single imperative `advanceTo` on the service | Re-use native Leaflet `flyTo` + existing `setCurrentTime` writes |
| R2 | Scrub-window enforcement | Narrow `start`/`end` via new `TimeRangeViewProvider.setScrubbableRange`; leave `dataStart`/`dataEnd` at full data extent; restore on deactivation | Re-uses existing `updateTimeExtent` wire format; `timeFilter` doesn't feed the scrubber |
| R3 | Hard-block modal surface | VS Code-native `showInformationMessage({ modal: true })` in the extension host | Above-webview, keyboard-trappable, platform-idiomatic |
| R4 | Scoped arrow-key `when` clause | `debrief.storyboardActive && (debrief.mapFocused \|\| focusedView == 'debrief.storyboardPanel')` | Adds one context; enforced by VS Code per-keypress |
| R5 | Antimeridian rectangle | Single best-effort `L.Polygon` from `scene.geometry.coordinates` | Rare edge case; Leaflet renders correctly; click still works |
| R6 | Active-Storyboard ephemeral store | In-memory `Map<documentUri, storyboardId>` in the service, keyed by `SessionManager`'s `documentUri` | Matches spec's explicit ephemerality; no new slice / migration |
| R7 | Most-recently-modified default | New `getMostRecentlyModifiedStoryboard(plot)` query added to #215's queries module | Single source of truth (Article II); existing helper returns "first by name ascending" — wrong for FR-PLAY-002 |
| R8 | In-flight transition safety | Three clear triggers on `transitionId`: `moveend`, `onDidChangeVisibility`, `durationMs+250ms` safety timer | Handles hidden-webview + `moveend`-no-fire without polling |
| R9 | Transport-vs-CRUD race | CRUD ops rejected during in-flight transition (same policy as transport) | One uniform single-flight rule; prevents stale-snapshot emission |

All nine decisions resolve cleanly within the existing monorepo
technology stack. **No NEEDS CLARIFICATION remains.** Proceed to
Phase 1.
