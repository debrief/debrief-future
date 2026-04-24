# Contract: `StoryboardPlaybackService` — public TypeScript API

**Feature**: 217-storyboarding-playback
**File**: `apps/vscode/src/services/storyboardPlayback.ts`
**Status**: Language-neutral contract. Drives implementation + test
names in `apps/vscode/src/services/__tests__/storyboardPlayback.test.ts`.

Extension-host singleton (instantiated once in `extension.ts`, wired
to `SessionManager`, `MapPanel`, and the `StoryboardPanelViewProvider`).
All signatures are TypeScript strict-mode; no public method returns
`any`. All mutation methods return `Promise<void>` because they
delegate to `@debrief/components/storyboard` CRUD (which is async —
Web Crypto is async; see #215 contract).

---

## 1. Imported types

```ts
import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import type { StoryboardPanelViewProvider } from '../views/storyboardPanelView';
import type {
  StoryboardOptionViewModel,
  SceneRowViewModel,
  TransportViewModel,
  MissingDataReason,
} from '@debrief/components';
```

---

## 2. Snapshot projection

```ts
export interface StoryboardPlaybackSnapshot {
  readonly documentUri: string;     // STAC URI (SessionManager's session key)
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly currentSceneId: string | null;
  readonly transport: TransportViewModel;
}
```

All fields are transport-safe primitives.

---

## 3. Service interface

```ts
export interface StoryboardPlaybackService extends vscode.Disposable {

  // ── Lifecycle ─────────────────────────────────────────────────────

  /** Called by SessionManager when a plot is opened. Runs `validatePlot(plot)`;
   *  if it throws, disables transport for this plot and surfaces a single
   *  error toast (design-fix 2). Otherwise: seeds active selection from
   *  `getMostRecentlyModifiedStoryboard(plot)` (the new #215 query —
   *  research R7); narrows the scrubbable range via
   *  `TimeRangeViewProvider.setScrubbableRange(...)` to the Scene window;
   *  sets `debrief.storyboardActive` iff ≥ 1 Scene exists. */
  onPlotOpened(documentUri: string): void;

  /** Called by SessionManager when a plot is closed or the window is being
   *  disposed. Restores the default scrubbable range via
   *  `TimeRangeViewProvider.setScrubbableRange(null, null)`; clears context;
   *  drops per-plot state. */
  onPlotClosed(documentUri: string): void;

  /** Called when the plot's FeatureCollection has been externally mutated
   *  (via MapPanel's new `onFeaturesChanged: vscode.Event<DebriefFeature[]>`
   *  event — arch-fix 2). Recomputes sceneOrder; if the active Storyboard
   *  was deleted, falls back to `getMostRecentlyModifiedStoryboard`. */
  onPlotFeaturesChanged(documentUri: string): void;

  // ── Read API ──────────────────────────────────────────────────────

  /** Returns the current snapshot. `storyboards = []` and all other fields at
   *  their empty-state values if the documentUri is unknown. */
  getSnapshot(documentUri: string): StoryboardPlaybackSnapshot;

  /** Subscribe to snapshot changes. Emits on: plot-opened, plot-closed, plot-features-
   *  changed, dropdown-switch, transport step, transition start/end. */
  onSnapshotChange(
    listener: (snap: StoryboardPlaybackSnapshot) => void,
  ): vscode.Disposable;

  // ── Transport ─────────────────────────────────────────────────────

  /** Step forward. No-op during an in-flight transition, at the last Scene,
   *  or when the Storyboard is empty. Resolves after the hard-block check;
   *  does NOT await the animation. */
  forward(documentUri: string): Promise<void>;

  /** Step backward. Mirror of `forward`. */
  backward(documentUri: string): Promise<void>;

  /** Click-to-select. Must run hard-block check; animates to target via the
   *  same transport path as Forward / Backward. */
  goToScene(documentUri: string, sceneId: string): Promise<void>;

  /** Dropdown switch. Recomputes sceneOrder and scrub window within the same
   *  user interaction (no async work before the panel snapshot updates). */
  setActiveStoryboard(documentUri: string, storyboardId: string | null): void;

  // ── Storyboard CRUD (delegates to #215) ────────────────────────────
  //
  //  CRUD-during-flight guard (R9 / test-fix 1): if the service has a
  //  non-null transitionId for the given documentUri, these methods
  //  return immediately with no side effect (no toast, no CRUD call).
  //  Panel overflow buttons are disabled via
  //  `transport.transitionInFlight`.

  /** Create a new Storyboard. Errors from #215 (DuplicateStoryboardName)
   *  surface as VS Code error messages. On success, the new Storyboard
   *  becomes the active selection. */
  createStoryboard(
    documentUri: string,
    name: string,
    description?: string,
  ): Promise<void>;

  /** Rename. Errors surface as VS Code error messages. */
  renameStoryboard(
    documentUri: string,
    storyboardId: string,
    newName: string,
  ): Promise<void>;

  /** Delete + cascade Scenes. Caller is responsible for the cascade-delete
   *  confirmation modal (surfaced by the command handler, not the service).
   *  On success, falls back to `getMostRecentlyModifiedStoryboard` for the
   *  remaining Storyboards. */
  deleteStoryboard(
    documentUri: string,
    storyboardId: string,
  ): Promise<void>;

  // ── Hard-block resolution ─────────────────────────────────────────

  /** Invoked by the command handler after the analyst picks *Jump past this scene*.
   *  Advances transport past the blocked Scene without animating into it. */
  resolveHardBlockByJumpingPast(
    documentUri: string,
    blockedSceneId: string,
    direction: 'forward' | 'backward',
  ): Promise<void>;

  /** Invoked by the hard-block modal's *Open for editing* action. Stubbed
   *  until #218 — the service surfaces a read-only details toast via
   *  `vscode.window.showInformationMessage` (no separate command
   *  registration); leaves transport state unchanged. */
  resolveHardBlockByOpeningForEditing(
    documentUri: string,
    blockedSceneId: string,
  ): void;

  // ── Disposal ─────────────────────────────────────────────────────
  dispose(): void;   // also calls setScrubbableRange(null, null) per plot
}
```

---

## 4. Animation coordination

The service internally manages a per-plot `TransitionController` that:

1. Resolves the target `viewport` + `timestamp` for the target Scene.
2. Calls `mapPanel.flyToViewport(viewport, durationMs)` (webview
   postMessage → Leaflet `L.Map.flyTo`). `flyToViewport` returns a
   `token: number` used to correlate completion.
3. Runs a browser-`requestAnimationFrame` tween of the session's
   `currentTime` from start → target over the same `durationMs`
   using ease-in-out easing (default `t → t * t * (3 - 2 * t)`).
4. Marks `transitionId = null` via **any of three clear triggers**
   (R8 / test-fix 2):
   - **primary**: `MapPanel.onFlyToComplete(token)` fires after
     Leaflet's `moveend`.
   - **visibility guard**: `webviewView.onDidChangeVisibility(false)`
     on the Storyboard panel clears the transition immediately.
     Triggered when the analyst switches tabs or hides the panel
     mid-flight.
   - **safety timer**: `setTimeout(durationMs + 250)` — caps the
     hidden-webview case where Leaflet's `moveend` may fire late or
     never.
   Whichever fires first wins; the others are no-ops against a stale
   token.

**Cancellation**: if a scrub is detected during flight (via a
`setCurrentTime` write whose source is not this service's tween), the
service aborts the RAF tween at the current frame and clears
`transitionId`. The subsequent `onFlyToComplete` for the cancelled
token is ignored.

**Zero-duration edge case** (`transition_duration_ms = 0`): the map
jumps (`animate: false` passed to Leaflet); the time slider is snapped
to the target timestamp without a RAF tween. The transport is not
"in-flight" for any wall-clock duration.

**Long-duration edge case** (e.g. 10 000 ms): transport buttons and
keys stay disabled; cancel-by-row-click is supported — clicking a
specific Scene row is treated as a transport command, which the
service detects-and-cancels-then-restarts to the new target.

---

## 5. Hard-block flow

```ts
// Pseudocode — the service's forward() method
async forward(documentUri: string): Promise<void> {
  const state = this.states.get(documentUri);
  if (!state) return;
  if (!state.plotValid) return;                             // validatePlot gate
  if (state.transitionId !== null) return;                  // in-flight
  if (state.currentSceneIndex >= state.sceneOrder.length - 1) return;  // at last

  const targetSceneId = state.sceneOrder[state.currentSceneIndex + 1];
  const plot = plotFromFeatures(this.mapPanel.getCurrentFeatures());  // shared helper (design-fix 4)
  const targetScene = getScene(plot, targetSceneId);
  const temporal = this.sessions.getActiveSession()?.getState();

  // ISO ↔ epoch conversion at the #215 boundary (arch-fix 4).
  // TemporalSlice.timeRange is { start: number; end: number } (epoch ms).
  // detectMissingDataForScene expects { start: string; end: string } (ISO-8601).
  const plotTimeRange = temporal?.timeRange
    ? {
        start: new Date(temporal.timeRange.start).toISOString(),
        end:   new Date(temporal.timeRange.end).toISOString(),
      }
    : { start: new Date(0).toISOString(), end: new Date(8.64e15).toISOString() };

  const classification = detectMissingDataForScene(
    targetScene!, plot.features, plotTimeRange,
  );

  if (classification.kind !== 'ok') {
    await this.promptHardBlock(targetScene!, classification, 'forward', documentUri);
    return;
  }

  await this.executeTransition(documentUri, state.currentSceneIndex + 1, 'forward');
}
```

The `promptHardBlock` method:

```ts
private async promptHardBlock(
  scene: SceneFeature,
  classification: MissingDataClassification,
  direction: 'forward' | 'backward',
  documentUri: string,
): Promise<void> {
  const reason = this.toMissingDataReason(classification);
  const body = this.formatHardBlockBody(scene, reason);

  const choice = await vscode.window.showInformationMessage(
    body,
    { modal: true },
    messages.jumpPastLabel,
    messages.openForEditingLabel,
  );

  if (choice === messages.jumpPastLabel) {
    await this.resolveHardBlockByJumpingPast(documentUri, scene.properties.id, direction);
  } else if (choice === messages.openForEditingLabel) {
    this.resolveHardBlockByOpeningForEditing(documentUri, scene.properties.id);
  }
  // Dismissed: leave transport state unchanged.
}
```

---

## 6. Error vocabulary

The service itself throws no errors to the webview. All errors from
#215's CRUD (`DuplicateStoryboardName`, `UnknownStoryboard`,
`UnknownScene`) are caught and surfaced as
`vscode.window.showErrorMessage(messages.crudError(err.code))`.

An unknown `documentUri` in the per-plot map is a programmer error —
methods log-and-return silently rather than throwing (the panel
should not have sent a message for an unknown plot).

---

## 7. Non-API guarantees

- **No domain logic in the service.** Scene ordering, missing-data
  classification, and all invariant enforcement live in
  `@debrief/components/storyboard`. The new
  `getMostRecentlyModifiedStoryboard` query added by this slice also
  lives in that module (not in the service).
- **No direct Storyboard / Scene Feature writes.** All writes pass
  through #215's async CRUD. Enforced by ESLint
  `no-restricted-imports` on the extension's `src/services/` path.
- **No network.** All calls are in-process.
- **Single-flight.** Only one transition in flight per plot at a
  time. CRUD ops (Create / Rename / Delete) are rejected during an
  in-flight transition — same policy as transport-vs-transport (R9).
- **validatePlot gate.** `onPlotOpened` runs `validatePlot(plot)`;
  on throw, `plotValid = false` is recorded and all transport + CRUD
  ops are no-ops for that plot until re-open.
- **Context management.** Sets `debrief.storyboardActive` on
  plot-opened (iff current index ≥ 0 AND plotValid) and clears it on
  plot-closed.
- **Lifecycle correctness.** On `dispose()`, calls
  `setScrubbableRange(null, null)` for every plot with an active
  override, clears context for every plot, and unsubscribes all
  listeners.

---

## 8. Testability seams

- `idOverride` on `createStoryboard` passes through to #215 (injected
  ULID — already supported).
- `now` on `createStoryboard` / `renameStoryboard` / `deleteStoryboard`
  passes through to #215 (injected clock — already supported).
- `TransitionController` is constructor-injectable for tests (stub
  that resolves `durationMs` immediately without real RAF / `flyTo`).
- `vscode.window.showInformationMessage` is abstracted behind a
  `ModalPromptPort` interface for unit-test substitution.
- `webviewView.onDidChangeVisibility` is abstracted behind a
  `VisibilityPort` interface so visibility-cancel paths can be
  driven deterministically from tests.

## 9. Test requirements (from review)

In addition to the core acceptance-scenario coverage, the service's
test suite MUST include:

| Test | Asserts |
|---|---|
| `onPlotOpened rejects corrupt plot via validatePlot` | fixture with orphan Scene → single `showErrorMessage` call; `plotValid = false`; all subsequent forward/backward/goToScene are no-ops (design-fix 2 / test-fix 3) |
| `CRUD ops are rejected during in-flight transition` | inject a stub TransitionController that never completes; each of createStoryboard / renameStoryboard / deleteStoryboard returns void without calling the underlying CRUD (R9 / test-fix 1) |
| `onDidChangeVisibility(false) clears transitionId` | start a transition; fire visibility false → transitionId === null; subsequent forward works (R8 / test-fix 2) |
| `onFlyToComplete safety timer fires at durationMs+250ms` | stub MapPanel to never fire onFlyToComplete; advance vitest fake timers by durationMs+250ms → transitionId === null (R8 / test-fix 2) |
| `plot-switch mid-transition cancels old plot's flight` | two documentUris with active transitions; close first mid-flight → first cleared; second unaffected (R8 / test-fix 2) |
| `getMostRecentlyModifiedStoryboard drives default active` | plot with 3 Storyboards, each with distinct provenance[last].timestamp; onPlotOpened picks the max (R7 / test-fix 4) |
| `ISO/epoch conversion rejects NaN timeRange` | Pass { start: NaN, end: NaN } from a malformed session → service substitutes full-extent defaults; detectMissingDataForScene receives valid ISO strings (arch-fix 4) |
| `setScrubbableRange restored on service.dispose` | start active; spy on timeRangeView.setScrubbableRange; dispose → called with (null, null) for every plot (test-fix 4) |
