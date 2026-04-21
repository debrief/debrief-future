# Phase 1 — Data Model: Storyboarding — Panel + Playback

**Feature**: 217-storyboarding-playback
**Date**: 2026-04-21
**Input**: `spec.md` (Key Entities section) + `plan.md` Technical Context + `research.md`

> **Scope note.** This slice **adds no schema**. All persisted entities
> (`Storyboard`, `Scene`, `Viewport`) are already defined in #215 via
> LinkML and generated into `@debrief/schemas`. This document catalogues
> the **transient, in-memory types** this slice introduces: transport
> state, view-models crossing the webview boundary, and the
> extension-service state machine.

---

## 1. Persisted entities (inherited — see #215)

This slice **reads**:

| Entity | Source | Consumed slots |
|---|---|---|
| `StoryboardFeature.properties` | `@debrief/schemas` | `id`, `name`, `description`, `provenance[last].timestamp` (= last_modified_at) |
| `SceneFeature.properties` | `@debrief/schemas` | `id`, `storyboard_id`, `title`, `timestamp`, `viewport`, `visible_feature_ids`, `feature_set_hash`, `transition_duration_ms`, `thumbnail_asset_ref` |
| `Viewport` | `@debrief/schemas` | `center`, `zoom`, `corners` (Polygon) — used by `flyTo` and `SceneRectangleLayer` |

This slice **writes**, via the #215 CRUD module only:

| Op | Entity | CRUD function |
|---|---|---|
| Create Storyboard | `StoryboardFeature` | `createStoryboard(plot, { name, description, actor })` |
| Rename Storyboard | `StoryboardFeature` | `renameStoryboard(plot, { storyboardId, newName, actor })` |
| Delete Storyboard (cascades to Scenes) | `StoryboardFeature` + all child `SceneFeature`s | `deleteStoryboard(plot, { storyboardId, actor })` |

No Scene-level writes. No schema edits.

---

## 2. Transport state (in-extension, service-owned)

Lives exclusively inside `StoryboardPlaybackService`. Never persisted,
never serialised across the webview boundary in full — only the
**view-model projection** (§3) crosses to the panel.

```ts
/**
 * Per-plot transport state. The service holds one of these per
 * plot currently open in a VS Code session, keyed by `documentUri`
 * (the STAC URI string that `SessionManager` uses as its session key).
 */
export interface TransportState {
  /** Document URI (STAC URI) — key for the per-plot map. */
  readonly documentUri: string;

  /** Current active Storyboard; `null` when plot has no Storyboards. */
  readonly activeStoryboardId: string | null;

  /** Ordered list of Scene ids for the active Storyboard (ascending timestamp). */
  readonly sceneOrder: ReadonlyArray<string>;

  /** Index into `sceneOrder`; `-1` when `sceneOrder` is empty. */
  readonly currentSceneIndex: number;

  /** Monotonically-increasing id of the in-flight transition; `null` when idle. */
  readonly transitionId: number | null;

  /**
   * Whether the scrubbable range was narrowed by this service on activation.
   * On deactivation, the service calls
   * `TimeRangeViewProvider.setScrubbableRange(null, null)` to restore the
   * default (full-extent) scrubbable range. No session-state field is
   * overwritten — the override is purely view-provider-side state (see R2).
   */
  readonly scrubbableOverrideActive: boolean;

  /** Whether the plot passed `validatePlot` on open. If false, transport
   *  is disabled and the service surfaces a single error toast. */
  readonly plotValid: boolean;
}
```

### State-transition rules

| Trigger | Precondition | Effect |
|---|---|---|
| Plot open | `documentUri` not in the per-plot map | Run `validatePlot(plot)`; if it throws, set `plotValid = false`, surface a single error toast, and skip the rest. Otherwise: seed `activeStoryboardId` from `getMostRecentlyModifiedStoryboard(plot)` (new #215 query); compute `sceneOrder = listScenesOrdered(plot, activeStoryboardId)`; `currentSceneIndex = sceneOrder.length > 0 ? 0 : -1`; call `timeRangeView.setScrubbableRange(...)` to apply the Scene-window clamp (sets `scrubbableOverrideActive = true`); set `debrief.storyboardActive` iff `currentSceneIndex >= 0`. |
| Plot close | `documentUri` in the map | Call `timeRangeView.setScrubbableRange(null, null)` to restore default scrubbable range; clear `debrief.storyboardActive`; remove entry. |
| Dropdown switch to storyboard X | `X` present in plot | `activeStoryboardId = X`; recompute `sceneOrder`; `currentSceneIndex = sceneOrder.length > 0 ? 0 : -1`; recompute scrub window via `setScrubbableRange`. |
| Forward | `currentSceneIndex < sceneOrder.length - 1` AND `transitionId === null` AND hard-block check passes | `currentSceneIndex += 1`; `transitionId = next()`; recompute scrub window; fire animation. |
| Backward | `currentSceneIndex > 0` AND `transitionId === null` AND hard-block check passes | `currentSceneIndex -= 1`; `transitionId = next()`; recompute scrub window; fire animation. |
| Click Scene row / rectangle | target index differs from current AND `transitionId === null` AND hard-block check passes | `currentSceneIndex = target`; fire animation. |
| Scrub starts while `transitionId !== null` | — | Cancel animation; `transitionId = null`. |
| **Transition clear (any of three)** | `transitionId === T`; clear triggered by `moveend`, `onDidChangeVisibility(false)`, or `durationMs+250ms` safety timer | `transitionId = null`; emit snapshot with `transport.transitionInFlight = false`. Idempotent — later triggers with the same token are no-ops. |
| **CRUD op (create/rename/delete)** during `transitionId !== null` | — | Reject with no side effect (same policy as transport-vs-transport). Panel's overflow buttons are disabled via `transport.transitionInFlight`. |
| Hard-block resolved → Jump past | blocked Scene N, from direction D | `currentSceneIndex = N + 1` (if Forward) or `N - 1` (if Backward); skip the blocked Scene. |
| Hard-block resolved → Open for editing (stubbed) | blocked Scene N | Surface read-only Scene details via `showInformationMessage`; leave `currentSceneIndex` unchanged. |
| External plot refresh (features changed) | plot features mutated outside the service (via `MapPanel.onFeaturesChanged` — new event, arch-fix 2) | Recompute `sceneOrder` for current `activeStoryboardId`; if `activeStoryboardId` was deleted, fall back to `getMostRecentlyModifiedStoryboard(plot)`; if no Storyboards remain, `activeStoryboardId = null`, clear context + scrubbable override. |

### Invariants

- `-1 <= currentSceneIndex < sceneOrder.length`
- `currentSceneIndex === -1` iff `sceneOrder.length === 0`
- `transitionId !== null` implies an in-flight `flyTo` + slider tween
- Scrubbable-range override is applied iff
  `scrubbableOverrideActive === true`; cleared on plot-close /
  dropdown-switch-to-null / empty-Storyboard / service.dispose.
- `plotValid === false` implies transport + CRUD ops are all no-ops
  for this plot until it is re-opened (validatePlot gate —
  design-fix 2).

### Concurrency model

- Transport commands (Forward / Backward / click) are idempotent when
  `transitionId !== null` (i.e. during a transition): the command is
  dropped with no side effect, no error, no toast (matches spec
  "transport buttons and arrow keys MUST be disabled during an in-
  flight transition" — FR-PLAY-009).
- **Storyboard CRUD ops (Create / Rename / Delete) are also rejected**
  during an in-flight transition (same single-flight policy — R9).
  Panel overflow buttons are disabled via
  `transport.transitionInFlight`.
- Scrub-cancel wins a race against the animation tick by clearing
  `transitionId` under a service-side mutex; the animation's final
  frame check sees `null` and exits without writing the target state.
- **Three independent transition-clear triggers** keep `transitionId`
  from getting stuck (R8):
  1. Leaflet `moveend` via `MapPanel.onFlyToComplete` (primary).
  2. `webviewView.onDidChangeVisibility(false)` on the Storyboard
     panel (hidden / tab switched).
  3. `setTimeout(durationMs + 250ms)` safety timer.
  Whichever fires first clears; later triggers with the same token
  are no-ops.

---

## 3. View-models (cross the webview boundary)

These are the `postMessage` payload shapes. Every field is a
transport-safe primitive (JSON-serialisable, no class instances, no
functions). See `contracts/storyboard-panel-messages.md` for the
discriminated union.

```ts
/**
 * #216's `SceneRowViewModel` is unchanged by this slice. Missing-data
 * classification happens only at step-onto time inside the service
 * (design-fix 1) — rows do not carry a `blocked` state. Keeping the
 * row shape stable means #216's existing tests compile unchanged.
 */
export interface SceneRowViewModel {
  readonly sceneId: string;
  readonly title: string;
  readonly timestampIso: string;
  readonly dtgLabel: string;          // formatted by #215's formatDtg
  readonly thumbnailHref: string;     // webview URI
  readonly state:
    | { readonly kind: 'ok' }
    | { readonly kind: 'pending' };
}

/**
 * NEW. Header dropdown item.
 */
export interface StoryboardOptionViewModel {
  readonly storyboardId: string;
  readonly name: string;
  readonly sceneCount: number;        // informational only; spec does not require it
  readonly lastModifiedIso: string;   // used for default-selection ordering
}

/**
 * NEW. Transport row state.
 */
export interface TransportViewModel {
  readonly canGoBackward: boolean;    // false at first Scene or during transition
  readonly canGoForward: boolean;     // false at last Scene or during transition
  readonly sceneNumber: number;       // 1-based; 0 when empty Storyboard
  readonly sceneTotal: number;        // total Scene count in active Storyboard
  readonly transitionInFlight: boolean;
}

/**
 * NEW. Missing-data reason surface (serialisable representation of
 * #215's `MissingDataClassification`). Used by the hard-block modal's
 * body (real VS Code `showInformationMessage` in the extension; mirrored
 * by the Storybook-only `HardBlockModal` component for copy review).
 *
 * Not used as a row state — rows stay in `ok` / `pending` only; the
 * classification runs at step-onto time inside the service, not at
 * snapshot-emit time (design-fix 1).
 */
export type MissingDataReason =
  | { readonly kind: 'missing-features'; readonly missingIds: ReadonlyArray<string> }
  | { readonly kind: 'out-of-range' };
```

### Parent panel props

All new fields are **optional** with sensible defaults, so every
existing `StoryboardPanelProps` test from #216 compiles and passes
unchanged (design-fix 3). When the new fields are omitted, the panel
renders in its #216 shape — dropdown / overflow / transport controls
are simply not shown.

```ts
export interface StoryboardPanelProps {
  // ── Inherited from #216 (required, unchanged) ─────────────────────

  /** Ordered by `timestampIso` ascending. Empty when no active Storyboard has Scenes. */
  readonly scenes: readonly SceneRowViewModel[];

  /** Header label — null signals the "no Storyboards yet" empty state. */
  readonly activeStoryboardName: string | null;

  /** Drives the pending row. */
  readonly captureInFlight: boolean;

  /** Capture button click. */
  onCaptureClick(): void;

  /** Scene row click; this slice wires it to the playback service. */
  onSceneRowClick(sceneId: string): void;

  // ── NEW for #217 — all optional with defaults ─────────────────────

  /** Populates the dropdown. Default: `[]` — dropdown hidden. */
  readonly storyboards?: readonly StoryboardOptionViewModel[];

  /** Drives dropdown selection. Default: `null` — dropdown hidden. */
  readonly activeStoryboardId?: string | null;

  /** Drives the current-Scene highlight. Default: `null` — no highlight. */
  readonly currentSceneId?: string | null;

  /** Drives the transport row. Default: `undefined` — transport row hidden. */
  readonly transport?: TransportViewModel;

  /** Dropdown change. Default: no-op — dropdown still renders disabled if provided without a callback. */
  onActiveStoryboardChange?(storyboardId: string): void;

  /** Overflow menu actions (service delegates to #215 CRUD).
   *  Any omitted callback hides the corresponding menu item. */
  onCreateStoryboard?(): void;
  onRenameStoryboard?(storyboardId: string): void;
  onDeleteStoryboard?(storyboardId: string): void;

  /** Transport buttons. Omitted callbacks render the buttons disabled. */
  onTransportForward?(): void;
  onTransportBackward?(): void;
}
```

**Rendering rules for optional props**:
- If `storyboards` is missing or empty → no dropdown renders; the
  header shows only `activeStoryboardName` as a static label
  (matches #216).
- If `transport` is missing → transport row not rendered.
- If `currentSceneId` is missing or null → no row gets the highlight
  style.
- If any overflow-menu callback is omitted → that menu item is hidden.
  This lets Storybook stories and reduced hosts surface only a
  subset of controls.

### HardBlockModal presentational component (Storybook only)

```ts
export interface HardBlockModalProps {
  readonly sceneTitle: string;
  readonly reason: MissingDataReason;

  /** Labels kept on the props for translation. */
  readonly jumpPastLabel: string;
  readonly openForEditingLabel: string;

  onJumpPast(): void;
  onOpenForEditing(): void;
  onDismiss(): void;
}
```

> The real modal uses `vscode.window.showInformationMessage` (R3).
> The presentational `HardBlockModal` exists for Storybook demos +
> visual / copy review only.

---

## 4. SceneRectangleLayer — render-only entity

A presentational React component rendered inside `MapView`. Carries no
persisted state.

```ts
export interface SceneRectangleLayerProps {
  /**
   * All Scene Features for the active Storyboard. The layer renders
   * one `<Polygon>` per Scene using `scene.properties.viewport` (the
   * 4-corner ViewportPolygon).
   */
  readonly scenes: ReadonlyArray<SceneFeature>;

  /**
   * Scopes rendering. Caller passes only the active Storyboard's
   * Scenes; if this is `null`, the layer renders nothing.
   * Defence-in-depth: enforces FR-PLAY-016 at the prop boundary.
   */
  readonly activeStoryboardId: string | null;

  /** Currently-highlighted Scene id. The layer draws a slightly stronger
   *  outline on this rectangle if provided. */
  readonly currentSceneId: string | null;

  /**
   * Invoked on rectangle click with the clicked Scene's id (which
   * always matches one of the Scenes in `scenes`). The caller (the
   * playback service via `MapPanel`) decides the transport action.
   */
  onSceneRectangleClick(sceneId: string): void;
}
```

### Rendering rules (FR-PLAY-015 / FR-PLAY-016 / FR-PLAY-018)

- If `activeStoryboardId === null` OR `scenes.length === 0`: render
  nothing.
- Otherwise render one `<Polygon>` per Scene with:
  - `positions` derived from `scene.geometry.coordinates` (the
    GeoJSON Polygon written by #215's `viewportToPolygon` at capture
    time; best-effort on antimeridian — see R5). **Not**
    `scene.properties.viewport.corners` — `Viewport` is
    `{center, zoom, bearing}` only (Fix D).
  - `pathOptions.weight = scene.properties.id === currentSceneId ? 2 : 1`
  - `pathOptions.opacity = 0.6 - 0.1 * overlapRank` (clamped ≥ 0.3)
    where `overlapRank` is the 0-based index of this Scene among
    overlapping rectangles at the same centroid (stable sort by
    `timestamp`).
  - Click handler fires `onSceneRectangleClick(scene.properties.id)`;
    topmost (last-rendered) polygon captures the click.
- The parent Storyboard Feature is **never** rendered as a rectangle
  (FR-PLAY-015 — panel-only entity).

### Interaction with the main GeoJSON layer

- The main `MapView` GeoJSON layer already renders `StoryboardFeature`
  and `SceneFeature` if left un-filtered. The MapView's GeoJSON
  `filter` prop is extended in this slice to **exclude** both kinds
  (Storyboard never renders; Scenes render via `SceneRectangleLayer`).
  This keeps the "no Scene rectangles for non-active Storyboards"
  invariant at the only render surface.

---

## 5. Playback service — public state projection

The service exposes a small observable surface for the panel and the
map to subscribe to. It does **not** expose `TransportState` directly;
consumers get pre-projected view-models.

```ts
export interface StoryboardPlaybackSnapshot {
  readonly documentUri: string;
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly scenes: readonly SceneRowViewModel[];
  readonly activeStoryboardId: string | null;
  readonly currentSceneId: string | null;
  readonly transport: TransportViewModel;
}

export interface StoryboardPlaybackService {
  getSnapshot(documentUri: string): StoryboardPlaybackSnapshot;

  onSnapshotChange(listener: (snap: StoryboardPlaybackSnapshot) => void): Disposable;

  /** Called by the panel webview's postMessage bridge. */
  forward(documentUri: string): Promise<void>;
  backward(documentUri: string): Promise<void>;
  goToScene(documentUri: string, sceneId: string): Promise<void>;
  setActiveStoryboard(documentUri: string, storyboardId: string): void;

  /** Storyboard CRUD — delegates to #215. Rejected with no side effect
   *  if a transition is in flight for this documentUri (R9). */
  createStoryboard(documentUri: string, name: string, description?: string): Promise<void>;
  renameStoryboard(documentUri: string, storyboardId: string, newName: string): Promise<void>;
  deleteStoryboard(documentUri: string, storyboardId: string): Promise<void>;

  /** Lifecycle. */
  onPlotOpened(documentUri: string): void;          // runs validatePlot, seeds active
  onPlotClosed(documentUri: string): void;          // clears scrub override + context
  onPlotFeaturesChanged(documentUri: string): void; // recomputes sceneOrder; falls back if active deleted

  dispose(): void;
}
```

Full signatures + error vocabulary in
`contracts/playback-service.md`.

---

## 6. Type catalogue summary

| Type | File | Persisted? | Crosses webview? |
|---|---|---|---|
| `TransportState` | `apps/vscode/src/services/storyboardPlayback.ts` | No | No |
| `SceneRowViewModel` | `shared/components/src/panels/StoryboardPanel/types.ts` (edit) | No | Yes |
| `StoryboardOptionViewModel` | same file (new) | No | Yes |
| `TransportViewModel` | same file (new) | No | Yes |
| `MissingDataReason` | same file (new) | No | Yes |
| `StoryboardPanelProps` | same file (edit) | No | Via message projection |
| `HardBlockModalProps` | `shared/components/src/panels/StoryboardPanel/HardBlockModal.tsx` (new) | No | Storybook only |
| `SceneRectangleLayerProps` | `shared/components/src/MapView/SceneRectangleLayer.tsx` (new) | No | No |
| `StoryboardPlaybackSnapshot` | `apps/vscode/src/services/storyboardPlayback.ts` | No | Via message projection |

**No LinkML edits. No `@debrief/schemas` regeneration. No fixtures
added.**
