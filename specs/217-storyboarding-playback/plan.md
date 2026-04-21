# Implementation Plan: Storyboarding — Panel + Playback

**Branch**: `217-storyboarding-playback` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/217-storyboarding-playback/spec.md`

## Summary

Ship the **briefing-delivery flow** for the Storyboarding epic (#024) as a
VS Code extension slice that turns the minimal Scene list shipped by
#216 into a full **Storyboard panel + playback transport**. Three new
pieces of UI surface + two existing modules carry the load:

1. **Storyboard panel upgrade** (`shared/components/src/panels/StoryboardPanel/`) —
   add a **header dropdown** listing all Storyboards, an **overflow
   menu** (Create / Rename / Delete), a **transport row** (Forward /
   Backward buttons, current-Scene counter), and **on-row transport
   highlight**. The existing presentational props model is extended
   with `storyboards[]`, `activeStoryboardId`, `currentSceneId`, and
   transport callbacks — no VS Code imports enter the headless path.
2. **Map flyTo + Scene rectangle layer** (`shared/components/src/MapView/`) —
   extend `MapView` with an imperative `flyTo(target, durationMs)`
   (wraps Leaflet `L.Map.flyTo`) and a new presentational
   `SceneRectangleLayer` that renders the active Storyboard's Scene
   viewport Polygons as faint rectangles. The layer is scoped by a
   new `activeStoryboardId` prop; non-active Storyboards' rectangles
   never render.
3. **Playback orchestration** (`apps/vscode/src/services/storyboardPlayback.ts`) —
   a new extension-side service that owns the transport state
   machine: which Scene is current, whether a transition is in
   flight, and the scrub window bounds. It coordinates three existing
   surfaces: `@debrief/components/storyboard` (queries + missing-data
   detection), the session-state `TemporalSlice` (currentTime tween +
   timeFilter-based scrub lock), and the `MapPanel` (`flyTo` on the
   map, `setSceneRectangles` for the overlay). Transport is driven by
   new VS Code commands (`debrief.storyboard.forward`, `.backward`,
   `.clickScene`) bound to scoped `Left` / `Right` keybindings with
   `when: "debrief.storyboardActive && (debrief.mapFocused || focusedView == 'debrief.storyboardPanel')"`.
4. **Missing-data hard-block** is implemented at the orchestration
   layer: before every advance, the service calls #215's
   `detectMissingDataForScene`; on any non-`ok` classification the
   service surfaces a modal with **Jump past this scene** /
   **Open for editing** actions. The latter action is wired to a
   stub command (`debrief.storyboard.editScene`) that #218 will
   replace; until then the action opens a read-only details toast.
5. **Ephemeral active-Storyboard selection** lives in extension
   memory only (per-session map from `documentUri` →
   `activeStoryboardId`); on plot open the service calls a new
   `getMostRecentlyModifiedStoryboard(plot)` query — added to #215's
   `shared/components/src/storyboard/queries.ts` by this slice — which
   scans each Storyboard's `provenance[last].timestamp` and returns
   the maximum. The existing `getActiveStoryboardDefault` (first by
   name ascending) is kept for other consumers. No schema additions.

After this slice merges, an analyst with Scenes captured via #216 can
walk a stakeholder through a briefing end-to-end inside the Map
Viewer — forward/backward by button or scoped arrow key, scrub inside
the current segment, click rectangles to jump, switch between multiple
Storyboards on the same plot, and have unresolved Scenes hard-block
with clear remediation options.

Scene editing (rename, description, delete+undo, update-to-current,
duplicate, copy-to-other) remains deferred to #218. This slice
creates & deletes **Storyboards** (via the overflow menu) but does
not create / update / delete **Scenes**.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) for the VS Code
extension path, the webview (React 18.x), and the `shared/components`
library additions. No Python additions in this slice — all Pydantic /
LinkML work landed in #215.

**Primary Dependencies** (all already in the monorepo — **no new
runtime dependencies**):

- `@debrief/components/storyboard` — `listScenesOrdered`,
  `getStoryboard`, `getScene`, `detectMissingDataForScene`,
  `validatePlot`, `createStoryboard`, `renameStoryboard`,
  `deleteStoryboard`, `formatDtg` (all shipped by #215), plus the
  **new** `getMostRecentlyModifiedStoryboard` query added to #215's
  queries module by this slice (~10 LOC).
- `@debrief/components` — the existing `StoryboardPanel` (#216),
  `MapView` (extended here with `flyTo` + `SceneRectangleLayer`), the
  `ThemeProvider` tokens, `vscrui` icons used by every panel.
- `@debrief/session-state` — `SessionStoreApi.getState()`,
  `setCurrentTime`, `onActiveSessionChange`. **Note**: the scrub-
  window lock is **not** implemented via `setTimeFilter` (that slot
  drives STAC-catalog browsing, not the time scrubber) — it is
  implemented at the view-provider layer by narrowing the scrubbable
  `start`/`end` pair while preserving `dataStart`/`dataEnd` (see
  research.md R2). Playback state slice (`playbackState`,
  `displayMode`) introduced by #205 is **not touched** here.
- `@debrief/schemas` — generated `StoryboardFeature`, `SceneFeature`,
  `Viewport`, `ViewportPolygon` types.
- `leaflet` / `react-leaflet` (already a peer in `shared/components`) —
  `L.Map.flyTo`, `L.GeoJSON` / `Polygon` for Scene rectangles.
  `SceneRectangleLayer` renders each Scene's `scene.geometry.coordinates`
  (a GeoJSON Polygon populated by #215's `viewportToPolygon` at
  capture time); the `Viewport` record itself (`{center, zoom,
  bearing}`) is **not** the rectangle geometry source.
- VS Code Extension API ^1.85.0 — `commands.registerCommand`,
  `commands.executeCommand('setContext', …)`,
  `window.showInformationMessage(…, { modal: true })`,
  `WebviewView.onDidChangeVisibility`,
  `window.showInputBox` (Create / Rename).

**Storage**: No new persisted surfaces. Storyboard + Scene Features
still round-trip as plain GeoJSON Features inside the plot
FeatureCollection (schema shipped by #215). The **active-Storyboard
selection is ephemeral** — held in extension memory (keyed by
`documentUri`, the same key `SessionManager` uses) and recomputed on
plot-open via the new `getMostRecentlyModifiedStoryboard(plot)` query
added to #215. Scene rectangles are rendered at draw time from the
plot FeatureCollection; they are **not** stored as a derived layer.

**Testing**:

- `shared/components/src/panels/StoryboardPanel/__tests__/*.test.tsx` —
  extend existing suite with dropdown, overflow menu, transport row,
  current-Scene highlight (vitest + @testing-library/react).
- `shared/components/src/panels/StoryboardPanel/*.stories.tsx` —
  extend with `WithMultipleStoryboards`, `Transport`, `HardBlockModal`
  stories (Storybook, exercised by Playwright under light / dark /
  vscode themes).
- `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx` —
  **NEW**; verifies rectangles render only for active Storyboard,
  opacity variation on overlap, click-to-select fires `onSceneClick`,
  antimeridian-crossing viewport rendered as best-effort Polygon.
- `shared/components/src/MapView/__tests__/flyTo.test.tsx` — **NEW**;
  verifies the imperative `flyTo` triggers `L.Map.flyTo` with the
  correct duration + ease-in-out, and that starting a scrub during
  flight cancels the animation at its current frame.
- `apps/vscode/src/services/__tests__/storyboardPlayback.test.ts` —
  **NEW**; unit tests for the transport state machine — forward /
  backward at boundaries, scrub-window recompute on step + dropdown
  switch, hard-block on missing data (features + out-of-range),
  click-to-select via map rectangle, multi-Storyboard switching,
  external deletion fallback. **Plus** (from review):
  - `validatePlot` gate on plot-open — corrupt fixture (orphan scene
    or duplicate timestamp) surfaces a single error toast and disables
    transport for that plot.
  - CRUD-during-flight guard — Delete/Rename/Create ops during a
    non-null `transitionId` either cancel the transition first, or
    are rejected with no side effect (pick one; test both branches
    of the chosen policy).
  - Visibility cancel — service listens to
    `webviewView.onDidChangeVisibility`; when hidden, any in-flight
    `transitionId` is cleared.
  - `onFlyToComplete` timeout fallback — if Leaflet's `moveend` does
    not fire within `durationMs + 250ms`, the safety timer clears
    `transitionId` and emits completion.
  - Plot-switch mid-transition — switching VS Code tab during flight
    cancels the departing plot's transition; new plot starts fresh.
  - ISO/epoch conversion at the `detectMissingDataForScene` boundary
    — service receives `timeRange: { start: number; end: number }`
    (epoch ms) from `TemporalSlice` and converts to
    `{ start: string; end: string }` (ISO-8601) before calling #215.
    Test with `NaN`-bearing input to ensure graceful handling.
  - `setScrubbableRange` restoration — on `service.dispose()`, the
    service calls `TimeRangeViewProvider.setScrubbableRange(null)`
    restoring the default (full-extent) scrubber range.
- `apps/vscode/src/commands/__tests__/storyboardCommands.test.ts` —
  **NEW**; unit tests for the new command handlers (forward,
  backward, clickScene, createStoryboard, renameStoryboard,
  deleteStoryboard, jumpPast, editScene stub).
- `shared/components/src/storyboard/__tests__/queries.test.ts` —
  **EDIT** to cover the new `getMostRecentlyModifiedStoryboard`
  query: single Storyboard, multiple Storyboards with differing
  `provenance[last].timestamp`, empty plot returns `null`, ties
  broken by ULID (deterministic fallback).
- `tests/e2e/test-storyboard-playback.spec.ts` — **NEW**; Playwright
  E2E driving the code-server preview app through the full forward-
  through-a-storyboard loop (open plot → open panel → switch
  dropdown → press Forward × N → scrub → hard-block modal → jump
  past → reach last Scene → press Backward × N). Follows the
  existing webview-E2E patterns (`docs/e2e-testing-guide.md`).

**Target Platform**: VS Code extension host (Node 20+) for the
orchestration + command handlers; evergreen Chromium (the VS Code
webview runtime) for the Storyboard panel React component and the
`MapView` extensions. Code-server as a first-class host for E2E
verification. **Offline** — Article I applies; no network calls in
the playback path.

**Project Type**: Single-project monorepo extension. Code lands in
existing workspaces — `apps/vscode/` (new service + commands +
mapPanel extensions), `shared/components/` (panel upgrade + new
SceneRectangleLayer + MapView flyTo), plus the existing
`services/session-state/` consumer surface.

**Performance Goals**:

- **SC-001** — visible map transition between Scenes completes within
  `transition_duration_ms + 150 ms` tolerance; time slider lands on
  the target timestamp at transition end with no perceptible
  overshoot.
- **SC-003** — dropdown switch (Scene list + rectangles update)
  completes within one paint frame (≤ 17 ms on the reference
  runner) — no stale state visible after the dropdown closes.
- Panel rendering at typical sizes (≤ 5 Storyboards × ≤ 50 Scenes
  per plot) needs no virtualisation — straight list renders.

**Constraints**:

- **Offline** — every path (transport, scrub, rectangle render,
  hard-block) uses Node / browser built-ins and already-bundled
  packages; no network (Article I).
- **No silent failures** — missing-data cases surface the hard-block
  modal; disabled transport at list boundaries signals state visually
  (Article I.3).
- **No bypass of #215** — every read of Storyboard / Scene state goes
  through `@debrief/components/storyboard` queries; every write
  (Storyboard create/rename/delete) goes through the CRUD module.
  No direct `plot.features.filter(isStoryboardFeature)` in extension
  code; no direct mutation (SC-008). The new
  `getMostRecentlyModifiedStoryboard` query is added to #215's
  module in this slice, keeping single-source-of-truth (Article II).
  Enforced by ESLint `no-restricted-imports` rule targeting the
  internal module files.
- **Plot invariant gate at open** — service calls `validatePlot(plot)`
  on plot-open; if it throws (orphan Scene, duplicate timestamp,
  duplicate Storyboard name, reserved-slot violation), the service
  disables transport for that plot and surfaces a single
  `vscode.window.showErrorMessage` — no partial transport on a
  structurally-invalid plot (Article I.3).
- **Scoped keybindings** — `Left` / `Right` bound with
  `when: "debrief.storyboardActive && (debrief.mapFocused ||
  focusedView == 'debrief.storyboardPanel')"`; the
  `debrief.storyboardActive` context is set / cleared by the playback
  service on plot open / close / empty-Storyboard-set. Global key
  leakage verified by SC-007 test harness.
- **Single-flight transport** — concurrent Forward / Backward
  presses during an in-flight transition are rejected; starting a
  scrub cancels the flight at its current frame and yields (Assumption
  "Scrub-cancel during transition"). Storyboard CRUD ops (Create /
  Rename / Delete) during an in-flight transition are also rejected
  (consistent with the transport-vs-transport guard). Panel-hide via
  `webviewView.onDidChangeVisibility` cancels any in-flight
  transition immediately; an `onFlyToComplete` safety timer fires
  after `durationMs + 250ms` if Leaflet's `moveend` does not.
- **Strict types** — `any` / `unknown` prohibited on every new public
  API (Article XV). The webview `postMessage` contract from the
  Storyboard panel is extended via a discriminated union in
  `apps/vscode/src/types/storyboardPanelMessages.ts` (already
  established by #216).
- **No UI imports on the headless core** — `@debrief/components/storyboard`
  is not extended in this slice; all UI wiring lives in
  `shared/components/src/panels/StoryboardPanel/` and
  `shared/components/src/MapView/` (the latter already carries
  `leaflet` imports — pre-existing boundary).

**Scale/Scope**:

- Expected working plot: ≤ 5 Storyboards × ≤ 50 Scenes (per #215's
  performance bound).
- Transport state: one integer index per active plot; negligible.
- `SceneRectangleLayer`: renders ≤ 50 Polygons per plot; trivial for
  Leaflet.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Decision | Status |
|---------|----------|--------|
| **I. Defence-grade reliability — offline by default** | Every branch of the playback path (state read, transport tick, `flyTo` animation, `timeFilter` write, Scene-rectangle render, hard-block prompt) uses Node/browser built-ins + already-bundled packages. No network call introduced. | ✅ Pass |
| **I.3 No silent failures** | Missing-data cases hard-block with a modal naming the specific unresolved features or out-of-range condition. Transport disabled at list boundaries is visually signalled. External Storyboard deletion refreshes the dropdown with silent fallback (not an error condition per spec). | ✅ Pass |
| **I.4 Reproducibility** | Transport is deterministic — given an ordered Scene list and a start index, Forward / Backward produce identical traversals. `flyTo` animation is visually non-deterministic (frame timing) but the final state is deterministic (target viewport + timestamp). Tests assert final state, not intermediate frames. | ✅ Pass |
| **II. Schema integrity** | No schema edits. All Storyboard / Scene reads + writes go through #215's CRUD module; Scene Features stay conformant to the LinkML-derived types. | ✅ Pass |
| **III.1 Provenance always** | Storyboard create / rename / delete ops pass through #215's CRUD module, which appends the `LogEntry` to the inherited `provenance[]`. The playback transport is a pure read op on Features — no mutation, no provenance append needed (playback is ephemeral UI state). | ✅ Pass |
| **III.2 Source preservation** | No source files touched. Transport is read-only against the plot; only Storyboard Feature rows (created / renamed / deleted via the overflow menu) ever change, and those pass through #215. | ✅ Pass |
| **III.3 Audit trail immutable** | Same as #216 — provenance flows through #215's append-only write path; playback service never reaches into existing `LogEntry` records. | ✅ Pass |
| **IV. Architectural boundaries** | Playback orchestration lives in the VS Code extension (Node runtime + VS Code APIs). It reads session state, calls #215's CRUD module, and pushes to the webview via typed `postMessage`. The **domain logic** (Scene ordering, missing-data classification, CRUD invariants) stays inside `@debrief/components/storyboard`. The extension is orchestration only — no ordering / hashing / validation re-implemented here. Headless panel + MapView extensions carry zero VS Code imports. | ✅ Pass |
| **V. Extensibility** | The playback service is a first-party extension singleton; contrib extensions could later register a competing `WebviewViewProvider` for a different narrative renderer without touching this code. The `StoryboardPanel` remains presentational; consumers in web-shell or Storybook can render it standalone. | ✅ Pass |
| **VI. Testing** | Positive + negative test for every edge case enumerated in spec (arrow-key scope, `transition_duration_ms = 0` snap, `10000`-ms cancellation, boundary-disabled transport, hard-block on mid-sequence, empty Storyboard, external deletion fallback, antimeridian rectangle, overlapping rectangles, scrub-during-transition cancel). E2E covers the end-to-end briefing loop (SC-002). | ✅ Pass |
| **VII. Test-driven AI collaboration** | Acceptance Scenarios from spec.md map 1:1 to the playback-service unit test names; the spec-quality checklist at `checklists/requirements.md` (to be refreshed in Phase 1) captures "what good looks like" per user story. | ✅ Pass |
| **VIII. Documentation** | spec.md (shipped), research.md (Phase 0 below), data-model.md (Phase 1 below — view-model-only, no schema), contracts/ (Phase 1 below — playback service, new VS Code commands, panel postMessage delta), quickstart.md (Phase 1 below). All precede implementation. | ✅ Pass |
| **IX. Dependencies** | Zero new runtime dependencies. One zero-impact edit to `apps/vscode/package.json` adding new command contributions + scoped keybinding contributions. | ✅ Pass |
| **X. Security** | No secrets. No network. Scene rectangles render from already-loaded plot data; no classified-data exfiltration vector. | ✅ Pass |
| **XI. Internationalisation** | All user-visible strings (dropdown placeholder, overflow menu labels, transport tooltips, hard-block modal body + buttons) route through the extension's `messages.ts` pattern, keeping them externalisable. DTG formatter is locale-invariant by defence convention. | ✅ Pass |
| **XII. Community engagement** | Planning post (Phase 2 below) announces the slice; preview-app screenshot + GIF of the forward-through-a-storyboard flow will ship with the shipped post after implementation. | ✅ Pass |
| **XIII. Contribution standards** | Atomic commits per section. PR review required. CI gates: lint + typecheck + unit + Storybook-E2E + webview-E2E all green. | ✅ Pass |
| **XIV. Pre-release freedom** | No backwards-compatibility shims. Schema (from #215) is v1 only. No deprecation periods. | ✅ Pass |
| **XV. Strict type safety** | `any` / `unknown` prohibited on every new API — playback service public methods, command handler return types, new webview `postMessage` variants, `MapView.flyTo` signature, `SceneRectangleLayer` props. Modal prompt return values are narrowed to a literal-union at the VS Code API boundary. | ✅ Pass |

**Result**: All 15 articles pass. **No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/217-storyboarding-playback/
├── plan.md              # This file
├── spec.md              # Feature spec (already complete)
├── research.md          # Phase 0 — six research questions resolved
├── data-model.md        # Phase 1 — view-model + transport-state types (no schema deltas)
├── quickstart.md        # Phase 1 — end-to-end walk-through for #218's authors
├── contracts/
│   ├── playback-service.md          # StoryboardPlaybackService public API
│   ├── vscode-commands.md           # New command + keybinding contributions
│   ├── storyboard-panel-messages.md # Extended postMessage discriminated union delta
│   ├── map-view-flyto.md            # MapView.flyTo + onSceneRectangleClick additions
│   └── scene-rectangle-layer.md     # SceneRectangleLayer props + rendering rules
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already complete)
├── media/
│   ├── planning-post.md    # Phase 2 output
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/vscode/
├── package.json                                ← EDIT: +6 command contributions, +Left/Right scoped keybindings
└── src/
    ├── extension.ts                            ← EDIT: instantiate StoryboardPlaybackService; register storyboard commands; wire mapPanel.onSceneRectangleClick + mapPanel.onFeaturesChanged → service; maintain `debrief.storyboardActive` context
    ├── services/
    │   ├── storyboardPlayback.ts               ← NEW: transport state machine (active Storyboard, current Scene, transition in-flight, scrub-window recompute, hard-block flow, validatePlot gate, visibility + timeout cancel, CRUD-during-flight guard)
    │   ├── plotFromFeatures.ts                 ← NEW: shared helper — wraps DebriefFeature[] into a throwaway FeatureCollection for the #215 module API. Used by BOTH storyboardPanelView.refresh() and StoryboardPlaybackService (design-fix 4; extracts duplicated code)
    │   └── __tests__/
    │       └── storyboardPlayback.test.ts      ← NEW
    ├── commands/
    │   ├── storyboardTransport.ts              ← NEW: forward / backward / clickScene / jumpPast command handlers
    │   ├── storyboardManagement.ts             ← NEW: createStoryboard / renameStoryboard / deleteStoryboard command handlers (delegates to #215 CRUD via the service)
    │   ├── storyboardEditStub.ts               ← NEW: stub for `debrief.storyboard.editScene` — opens read-only detail toast; replaced by #218
    │   └── __tests__/
    │       └── storyboardCommands.test.ts      ← NEW
    ├── webview/
    │   └── mapPanel.ts                         ← EDIT: add `flyToViewport(viewport, durationMs): number`, `setSceneRectangles(scenes, activeId, currentId)`, `onSceneRectangleClick`, `onFlyToComplete`, and **new** `onFeaturesChanged: vscode.Event<DebriefFeature[]>` fired from `setFeatures` (arch-fix 2)
    ├── views/
    │   ├── storyboardPanelView.ts              ← EDIT: extend postMessage handling for dropdown change, overflow menu actions, transport clicks, current-scene highlight; accept `activeStoryboardId` + `currentSceneId` from the playback service; rewrite the `#217 will replace` comment to describe current behaviour (design-fix 4); reuse `plotFromFeatures` helper
    │   └── timeRangeView.ts                    ← EDIT: add `setScrubbableRange(start: number | null, end: number | null)` — overrides the `start/end` pair in outbound `updateTimeExtent` messages while leaving `dataStart/dataEnd` driven by `state.timeRange` (arch-fix 1)
    └── types/
        └── storyboardPanelMessages.ts          ← EDIT: extend discriminated union with dropdown-changed, overflow-menu-clicked, transport-clicked, scene-row-clicked (upgrade from log-only), and inbound state updates

shared/components/
├── src/
│   ├── storyboard/
│   │   ├── queries.ts                          ← EDIT: +getMostRecentlyModifiedStoryboard(plot): StoryboardFeature | null — scans provenance[last].timestamp per Storyboard, returns max (Fix B; ~10 LOC)
│   │   ├── index.ts                            ← EDIT: re-export the new query
│   │   └── __tests__/
│   │       └── queries.test.ts                 ← EDIT: +unit tests for the new query (empty plot, single Storyboard, multiple, tie-break on equal timestamps)
│   ├── panels/
│   │   └── StoryboardPanel/
│   │       ├── StoryboardPanel.tsx             ← EDIT: add dropdown, overflow menu, transport row, current-Scene highlight, hard-block modal surface
│   │       ├── StoryboardHeader.tsx            ← NEW: dropdown + overflow menu
│   │       ├── TransportRow.tsx                ← NEW: Forward / Backward buttons + Scene N of M counter
│   │       ├── HardBlockModal.tsx              ← NEW: presentational — renders missing-data info + two actions (Storybook only; real modal is VS Code-native)
│   │       ├── StoryboardPanel.stories.tsx     ← EDIT: add WithMultipleStoryboards, Transport, HardBlockModal stories
│   │       ├── types.ts                        ← EDIT: extend StoryboardPanelProps with **optional+defaulted** storyboards[], activeStoryboardId, currentSceneId, transport/overflow callbacks (design-fix 3 — keeps #216 tests compiling unchanged). NOTE: SceneRowViewModel keeps only `ok` + `pending` states — no `blocked` variant (design-fix 1)
│   │       └── __tests__/
│   │           └── StoryboardPanel.test.tsx    ← EDIT: add dropdown, overflow, transport, highlight, hard-block cases
│   └── MapView/
│       ├── MapView.tsx                         ← EDIT: add `flyToTarget` prop + `onFlyToComplete` callback + `onSceneRectangleClick`; integrate `SceneRectangleLayer`; base-layer GeoJSON filter excludes STORYBOARD / STORYBOARD_SCENE
│       ├── SceneRectangleLayer.tsx             ← NEW: renders `scene.geometry.coordinates` (GeoJSON Polygon) for Scenes of the active Storyboard only; scoped by activeStoryboardId prop; best-effort antimeridian render; click forwards sceneId (Fix D — reads geometry, not viewport.corners)
│       └── __tests__/
│           ├── SceneRectangleLayer.test.tsx    ← NEW
│           └── flyTo.test.tsx                  ← NEW

tests/e2e/
└── test-storyboard-playback.spec.ts            ← NEW: Playwright E2E through code-server (open plot → panel → transport × N → scrub → hard-block → jump past → backward → dropdown switch)

.specify/ / CLAUDE.md
└── <no agent-context delta — shared/components + VS Code extension stack already listed>
```

**Structure Decision**: Single-project monorepo extension. The slice
follows the established `WebviewViewProvider` + shared-React-component
pattern (#176 LogPanel / #216 StoryboardPanel minimal). New code
splits cleanly into:

- **Extension-only** (Node runtime, VS Code API): the
  `StoryboardPlaybackService`, the command handlers, and the
  `mapPanel.ts` surface extensions. These own all orchestration,
  state, and VS Code command registration.
- **Shared / reusable** (browser runtime, zero VS Code imports): the
  extended `StoryboardPanel`, the new `SceneRectangleLayer`, and the
  `MapView.flyTo` extension. These render the same in Storybook,
  web-shell, and VS Code host — no VS Code context required.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `StoryboardPanel` — with multiple Storyboards | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` | `storyboard-panel-multi.js` | Shows the new header dropdown + Scene list populated from one of several Storyboards on the plot (core dropdown-UX demo). |
| `StoryboardPanel` — transport row | same file, `Transport` story | `storyboard-panel-transport.js` | Demonstrates the Forward / Backward buttons + Scene counter + current-Scene highlight; the headline new affordance of the slice. |
| `StoryboardPanel` — hard-block modal | same file, `HardBlockModal` story | `storyboard-panel-hardblock.js` | Demonstrates the missing-data prompt with *Jump past* / *Open for editing* actions (the safety surface of the slice). |

**Inclusion Criteria Applied**:
- [x] New visual component — `StoryboardHeader`, `TransportRow`,
      `HardBlockModal` are new sub-components; `SceneRectangleLayer`
      is new but not a Storybook story (requires Leaflet host — demo
      via preview-app screenshots instead).
- [x] Significant visual change — the Storyboard panel shell itself
      is materially enriched vs. the #216 minimal version.
- [x] Interactive demo adds narrative value — dropdown switching,
      transport stepping, and the hard-block modal all tell the epic's
      core story better in Storybook than in prose.

**Bundleability Verified**:
- [x] Stories will exist in Storybook — written alongside the
      component extensions.
- [x] Components render standalone — each sub-component receives its
      data via props; no VS Code postMessage or session-state context
      required in Storybook.
- [x] Reasonable bundle size expected — the panel depends only on
      vscrui icons + inline styles; estimated total bundle across
      the three stories < 120 KB.

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/panels-storyboardpanel--transport` (published after PR merge).

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx — WithMultipleStoryboards` | Rendering, dropdown renders all Storyboards, overflow menu opens, accessibility (`aria-expanded`, `role="menu"`) | light, dark, vscode | open dropdown, select a different Storyboard, open overflow menu |
| `StoryboardPanel.stories.tsx — Transport` | Rendering, Forward / Backward enabled/disabled at boundaries, current-Scene highlight, Scene N of M counter, accessibility (`aria-label` per button) | light, dark, vscode | click Forward, click Backward, press `Right` (verify `onTransportForward` fires) |
| `StoryboardPanel.stories.tsx — HardBlockModal` | Rendering, two action buttons visible, body names missing feature IDs or out-of-range condition, focus trap, accessibility (`role="dialog"`, `aria-modal`) | light, dark, vscode | click *Jump past this scene*, click *Open for editing*, press `Escape` |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (dropdown, transport buttons, modal actions)
- [x] Accessibility attributes present (`data-testid` + `aria-label` /
      `role` / `aria-modal`)
- [x] Screenshots captured for evidence (lives under
      `specs/217-storyboarding-playback/evidence/storybook/`)

**Test File Location**: `shared/components/e2e/StoryboardPanel.spec.ts` (extends existing file from #216).

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=panels-storyboardpanel--with-multiple-storyboards&globals=theme:light
/iframe.html?id=panels-storyboardpanel--with-multiple-storyboards&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--with-multiple-storyboards&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--transport&globals=theme:light
/iframe.html?id=panels-storyboardpanel--transport&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--transport&globals=theme:vscode
/iframe.html?id=panels-storyboardpanel--hard-block-modal&globals=theme:light
/iframe.html?id=panels-storyboardpanel--hard-block-modal&globals=theme:dark
/iframe.html?id=panels-storyboardpanel--hard-block-modal&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| **Forward through a populated Storyboard** | Map Panel, Storyboard Panel | `.leaflet-container`, `[data-testid="storyboard-panel"]`, `[data-testid="transport-forward"]`, `[data-testid="scene-row"][data-active="true"]`, `.leaflet-interactive.debrief-scene-rect` | open plot with ≥ 3 Scenes, open Storyboard panel, press Forward × 3, verify map `flyTo` + time slider advance + current-Scene highlight update each step |
| **Scoped Right-arrow transport (SC-007)** | Map Panel, Storyboard Panel, Log Panel | same as above plus `.log-panel` | focus Map Panel (Storyboard active), press `Right`, verify Forward fired; focus Log Panel, press `Right`, verify no transport change |
| **Scrub-window lock (SC-004)** | Map Panel, Time-range View, Storyboard Panel | `[data-testid="time-range-scrubber"]`, `.debrief-time-scrubber__thumb`, `[data-testid="scene-row"][data-active="true"]` | position on Scene N, drag scrubber beyond `Scene[N+1].timestamp`, verify clamp at boundary |
| **Click Scene rectangle on map (FR-PLAY-017)** | Map Panel, Storyboard Panel | `.leaflet-interactive.debrief-scene-rect`, `[data-testid="scene-row"][data-active="true"]` | click a non-current Scene's rectangle on the map, verify panel highlight jumps + map animates to that Scene's viewport |
| **Dropdown switch refreshes rectangles (SC-006)** | Map Panel, Storyboard Panel | `[data-testid="storyboard-dropdown"]`, `.leaflet-interactive.debrief-scene-rect` | switch dropdown, verify previous Storyboard's rectangles are gone and new Storyboard's rectangles render — within the same interaction |
| **Hard-block modal — Jump past (FR-PLAY-020)** | Map Panel, Storyboard Panel, modal prompt | `.notification-toast-container` or `showInformationMessage` modal, `[data-testid="scene-row"][data-active="true"]` | step onto a Scene with a deleted `visible_feature_id`, verify modal surfaces, click *Jump past this scene*, verify transport advanced **past** the blocked Scene without animating through it |
| **Create → Rename → Delete a Storyboard** | Storyboard Panel | `[data-testid="storyboard-overflow"]`, `[data-testid="storyboard-overflow-create"]`, input box, confirm modal | create, rename, delete a Storyboard; verify dropdown reflects each change and cascade-delete confirmation names Scene count |
| **External Storyboard deletion (edge)** | Storyboard Panel | same as above | simulate external delete (via test hook), verify dropdown refreshes and active selection falls back silently to the most-recently-modified remaining Storyboard |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining (Map
      Panel iframe → Leaflet container + Scene rectangles; Storyboard
      Panel iframe → dropdown + transport + scene rows)
- [x] Page objects updated for new selectors
      (`storyboard-dropdown`, `storyboard-overflow`,
      `transport-forward`, `transport-backward`, `scene-row[data-active]`,
      `scene-rect[data-scene-id]`)
- [x] Screenshots captured for evidence (lives under
      `specs/217-storyboarding-playback/evidence/e2e/`)

**Test File Location**: `tests/e2e/test-storyboard-playback.spec.ts`

**Infrastructure**:
- Patches applied by existing `tests/e2e/scripts/patch-webview.sh`
- Content injection via existing `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium via the project's `@sparticuz/chromium` runner

## Complexity Tracking

**Nothing to justify.** Constitution Check passes all 15 articles with
zero narrow departures. No new runtime dependencies. No new schema
modules. No Python additions. The slice is orchestration + presentation
only, reusing the #215 CRUD module, the #216 minimal panel shell, the
`MapView` + `react-leaflet` stack, the session-state `TemporalSlice`,
and the existing `WebviewViewProvider` pattern.
