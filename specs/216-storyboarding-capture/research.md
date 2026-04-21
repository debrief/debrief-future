# Research: Storyboarding — Capture

**Feature**: 216-storyboarding-capture
**Date**: 2026-04-21

## Scope

This feature ships the **Map Viewer capture flow** — a single
`Ctrl/Cmd+Alt+C` keystroke that snapshots live map state
(viewport + time-slider `currentTime` + visible-feature set) into a
schema-validated **Scene** Feature inside a **Storyboard** attached to
the plot. First-capture UX asks for a Storyboard name; duplicate-
timestamp collisions resolve through a Replace / Offset (+1 s) /
Cancel prompt; on success a minimal Storyboard panel auto-opens to
confirm persistence.

The spec is deliberately narrow: **capture only**. Playback (`flyTo`,
time-slider tween, scrub-window lock, on-map rectangles, hard-block
missing-data gate) belongs to #217. Edit operations (rename,
description, delete + undo, update-to-current, duplicate, copy-to-
other-storyboard, stale detection) belong to #218.

Six research questions must be resolved before Phase 1 can proceed:

- **R1** — Map Viewer state-snapshot mechanism: where the three inputs
  (viewport + currentTime + visible-feature IDs) live, and how to
  atomically read a consistent snapshot at shortcut-press time.
- **R2** — Thumbnail integration: reuse of #174's
  `requestThumbnailCapture()` pipeline and the per-Scene PNG storage
  contract (where the PNG lands, what goes into
  `SceneProperties.thumbnail_asset_ref`).
- **R3** — Duplicate-timestamp resolution UX primitive: which VS Code
  API gives us a three-button Replace / Offset / Cancel prompt that
  blocks writes until resolved.
- **R4** — First-capture Storyboard-name quick-pick: how to surface
  inline name-collision feedback in VS Code's native `showQuickPick`
  (or `showInputBox`) without introducing a custom webview.
- **R5** — Minimal Storyboard panel placement: whether to land the
  panel as a new `WebviewViewProvider` under the Debrief view
  container, as a `WebviewPanel`, or as part of the existing Activity
  Panel, and what the view ID should be for #217/#218 to extend.
- **R6** — Actor (provenance author) + single-flight guard + plot
  dirty-flag mechanism: three small infrastructure questions grouped
  because each has one obvious answer that falls out of existing
  patterns.

No `[NEEDS CLARIFICATION]` markers survive Phase 0.

---

## R1 — Map Viewer state snapshot: viewport + currentTime + visibleFeatureIds

### Decision

Read all three inputs synchronously from the **already-populated
session-state store** (`@debrief/session-state`) at shortcut-press
time, **not** from a round-trip to the webview. The command handler
calls:

```ts
const state = sessionStore.getState();
const viewport       = state.spatial.viewport;        // ViewportPolygon | null
const currentTime    = state.temporal.currentTime;    // number | null  (epoch-ms)
const hiddenIds      = state.features.hiddenFeatureIds;  // string[]
const visibleIds     = computeVisibleIds(plot.features, hiddenIds);
```

If any of the three is unavailable (`viewport === null` or
`currentTime === null`) the capture is rejected with an error toast
**before** the thumbnail pipeline is invoked (FR-CAP-009 /
SC-004-adjacent). `visibleFeatureIds` is derived by filtering
`plot.features` (the plot's live FeatureCollection, already held by
the extension in `MapPanel.currentPlot`) and excluding anything whose
`properties.id` appears in `hiddenFeatureIds`; the result is handed
to #215's `createScene`, which canonicalises (trim / dedupe / sort)
and hashes it.

The `viewport` is a `ViewportPolygon` — a 4-corner polygon **plus
an authoritative `zoom: number` slot** (defined in
`session-state.yaml` and generated into
`@debrief/schemas`). `MapPanel` already writes the live zoom level
into this slot on every Leaflet `moveend`
(`apps/vscode/src/webview/mapPanel.ts:770`). Scene Properties
require `viewport: { center: [lon, lat]; zoom; bearing: 0 }` — so
the capture handler projects:

```ts
const sceneViewport = {
  center: calculateViewportCenter(viewport),  // @debrief/utils (shipped by #203)
  zoom:   viewport.zoom,                       // already populated by MapPanel
  bearing: 0,
};
```

No new zoom-inference helper is needed. (An earlier draft of this
spec proposed `inferZoomFromPolygon` in `@debrief/utils`; it was
dead work because the zoom was already authoritative.)

### Rationale

- **Consistent snapshot** — `session-state` is the single source of
  truth (per the spatial / temporal / features slice decomposition).
  Reading `getState()` once captures a coherent tuple without the
  three values drifting across async boundaries (which would happen
  if we asked the webview to `postMessage` the three values back
  separately).
- **Synchronous** — `getState()` is a Zustand read; no IO. The
  command handler stays straight-line (fits the "orchestration only"
  shape — Article IV).
- **Matches existing precedent** — `saveSession`, `exportPng`, and
  the `logPanelView` all read session state the same way. No new
  pattern introduced.
- **Failure mode is explicit** — if `viewport` is null (map hasn't
  reported a bounds yet after plot open) we short-circuit with a
  clear toast. No silent fallback to "whole-world" or "last-known"
  values.

### Alternatives considered

1. **Post-and-wait via webview `postMessage`** — ask the MapPanel
   webview to send the live viewport + rendered feature IDs back.
   *Rejected*: adds a round-trip (~5–30 ms) onto the critical-path,
   introduces a second async boundary before the thumbnail call (which
   already blocks on a MapPanel round-trip), and duplicates state
   that's already in the store.
2. **Derive `visibleFeatureIds` from the webview's `renderedLayerIds`
   message** — currently not part of the MapPanel protocol; would
   require an API addition. *Rejected* in favour of deriving from
   `hiddenFeatureIds`, which is already authoritative.
3. **Let the caller pass viewport / timestamp / visibleIds as command
   arguments** — would force every trigger surface (keybinding,
   toolbar button, programmatic call) to compute them. *Rejected*:
   pushes state-derivation into every consumer; the command must own
   the snapshot.

---

## R2 — Thumbnail integration + per-Scene PNG storage

### Decision

Reuse #174's **existing** `MapPanel.requestThumbnailCapture(timeoutMs)`
method verbatim. It already returns a `{ largePngBase64, smallPngBase64 }`
pair captured from the live Leaflet DOM via the round-trip to the
webview. No new capture primitive is introduced.

**Per-Scene storage** extends #174's file-layout convention. #174
writes plot-level `thumbnail.png` + `thumbnail-sm.png` directly under
the STAC Item directory. #216 adds a sibling per-Scene directory:

```text
{catalog}/{plot_id}/
├── item.json                   # EDIT: +asset entry per Scene thumbnail
├── thumbnail.png               # plot-level (unchanged, #174)
├── thumbnail-sm.png            # plot-level (unchanged, #174)
└── scene-thumbnails/           # NEW: all Scene thumbnails
    ├── scene-{ulid}.png        # 800 × 600
    └── scene-{ulid}-sm.png     # 200 × 150
```

`item.json.assets` gains one pair of entries per Scene, keyed by
`scene-thumbnail-{sceneId}` and `scene-thumbnail-{sceneId}-sm`:

```json
{
  "scene-thumbnail-01HW0XGE7Z4YQZ2QZ6KMN9VPJK": {
    "href": "./scene-thumbnails/scene-01HW0XGE7Z4YQZ2QZ6KMN9VPJK.png",
    "type": "image/png",
    "title": "Scene thumbnail",
    "roles": ["thumbnail"]
  },
  "scene-thumbnail-01HW0XGE7Z4YQZ2QZ6KMN9VPJK-sm": {
    "href": "./scene-thumbnails/scene-01HW0XGE7Z4YQZ2QZ6KMN9VPJK-sm.png",
    "type": "image/png",
    "title": "Scene thumbnail (small)",
    "roles": ["thumbnail"]
  }
}
```

`SceneProperties.thumbnail_asset_ref` stores the **asset key**
(`scene-thumbnail-01HW…`), not the href. This matches #174's
convention and makes the panel component's render path a pure lookup:
`item.assets[scene.thumbnail_asset_ref].href`.

The write is implemented in a new
`apps/vscode/src/services/sceneThumbnailService.ts`:

```ts
export async function writeSceneThumbnail(
  stacItemPath: string,          // absolute path to the plot's STAC Item dir
  sceneId: string,                // ULID from the newly-created SceneFeature
  largePng: string,               // base64 from requestThumbnailCapture
  smallPng: string,
): Promise<{ assetKey: string }>; // returns "scene-thumbnail-{sceneId}"
```

Atomicity: the service writes both PNG files first, then updates
`item.json` last (matching #174's order). If either PNG write fails,
`item.json` is not touched and the command handler surfaces a
thumbnail-failure toast — the Scene is **never** created when the
thumbnail cannot be persisted (FR-CAP-008, SC-002).

### Synchronous requirement — FR-CAP-007

The spec says the thumbnail request must be "synchronous" before the
Scene is persisted. This is satisfied by `await`ing
`requestThumbnailCapture` + `writeSceneThumbnail` in the command
handler **before** calling #215's `createScene`. The command handler
is an async function; the user's UI perceives a single atomic action
(shortcut → scene row). "Synchronous" in the spec means **ordered**
(thumbnail-before-Scene), not "non-Promise".

### Timeout

`requestThumbnailCapture` default timeout is 5 s. If the timeout
fires, the result is `{ largePngBase64: null, smallPngBase64: null }`
and the command handler treats this identically to a hard thumbnail
failure: no Scene created, error toast surfaced.

### Rationale

- Reusing #174 is strictly cheaper than reintroducing the capture
  primitive. #174 already handles `crossOrigin: 'anonymous'` on tile
  layers, modern-screenshot DOM capture, and offscreen-canvas
  downscale.
- Per-Scene asset keys keyed by `sceneId` avoid any asset-key
  collision across Storyboards (ULIDs are unique within a plot).
- Storing the **asset key** (not href) in `thumbnail_asset_ref` is
  consistent with the STAC Item pattern the rest of the codebase
  already uses (tracks, overlays, track results).
- Atomic-per-file + item.json-last matches #174's existing
  invariant; we reuse the same helper shape.

### Alternatives considered

1. **Embed thumbnail as base64 directly in
   `SceneProperties.thumbnail_asset_ref`** — keeps the plot self-
   contained. *Rejected*: balloons the GeoJSON FeatureCollection (each
   Scene adds ~55 KB of base64 to the plot file), blows save/load
   time at scale, and breaks the STAC-first file-layout convention.
2. **Write thumbnails to a separate side-car file (not STAC asset)**
   — e.g. `scene-{ulid}.png` under an opaque dir. *Rejected*: STAC
   asset registration is how every other binary artefact in the plot
   is discovered; skipping it would orphan the PNGs from the STAC
   catalog layer.
3. **Share the plot-level `thumbnail.png` for every Scene** —
   *rejected*: each Scene captures a different viewport + time, so
   sharing the plot-level thumbnail would defeat the purpose (every
   Scene row in the panel would look identical).
4. **Defer thumbnail generation to save-time** — *rejected*: the
   panel would display a placeholder on first capture, which
   contradicts FR-CAP-013 (panel shows the Scene with thumbnail on
   success).

---

## R3 — Duplicate-timestamp resolution UX primitive

### Decision

Use **`vscode.window.showInformationMessage(…, { modal: true }, …buttons)`**
as the Replace / Offset (+1 s) / Cancel prompt primitive. The handler
catches `DuplicateTimestampError` from #215's `createScene`, inspects
`err.conflictingSceneId`, builds a message that names the conflicting
Scene by its title, and awaits the user's click:

```ts
try {
  const { plot: next, scene } = await createScene(plot, input);
  // …
} catch (err) {
  if (err instanceof DuplicateTimestampError) {
    const choice = await vscode.window.showInformationMessage(
      `A scene already exists at ${formatDtg(input.timestamp)}.`,
      { modal: true },
      'Replace',
      'Offset (+1 s)',
      // Cancel is implicit — returns undefined when dismissed
    );
    switch (choice) {
      case 'Replace':        return replaceExistingScene(…);
      case 'Offset (+1 s)':  return retryWithOffset(input, +1000);
      case undefined:        return;  // Cancel / dismiss
    }
  }
  throw err;  // non-duplicate errors propagate
}
```

The modal blocks the VS Code UI until a button is clicked. No write
occurs until the user resolves the prompt (FR-CAP-010). "Offset (+1
s)" recurses: if the new `timestamp + 1000ms` also collides, the
prompt surfaces again, each retry adding another second (per spec
Assumption: "compounded per Offset press if the new timestamp also
collides"). An internal safety limit of **5 consecutive offsets**
is enforced to prevent a pathological loop on a pre-populated
Storyboard; exceeding it surfaces a distinct error toast ("Too many
consecutive offset retries — pick a different moment in time.") and
abandons the write.

"Replace" is implemented as `deleteScene(plot, { sceneId:
err.conflictingSceneId, ... })` followed by `createScene(plot, input)`
on the returned plot. The sequence is wrapped in a single
`try { ... }` and the plot reference is only swapped into MapPanel
after the create returns.

### Rationale

- **Modal is the right primitive** — the spec is explicit that no
  write happens until the prompt resolves. A non-modal notification
  would allow the user to dismiss / forget it, violating SC-003
  ("100% of duplicate-timestamp collisions present the prompt").
- **Three buttons fit `showInformationMessage`** — the VS Code API
  accepts up to four button strings, with dismissal returning
  `undefined` (maps naturally to Cancel).
- **`{ modal: true }` is officially supported** — documented since
  VS Code 1.52; blocks until user resolution; renders as a centred
  dialog rather than a corner toast.
- **No custom webview needed** — a custom modal would require a new
  webview panel and message-bus plumbing just to surface three
  buttons. That's explicitly too much code for the outcome
  (simplest-thing-that-works principle).
- **"Replace" delegates to #215's `deleteScene` + `createScene`** —
  no new CRUD op needed. Provenance automatically records a `delete`
  LogEntry before the removed Scene vanishes (per #215's spec), then
  a `create` LogEntry on the new Scene.

### Safety rail — 5-consecutive-offset cap

Not called out in the spec, but a defensive invariant: if a user's
Storyboard has Scenes at `t`, `t+1s`, `t+2s`, `t+3s`, `t+4s`, and the
user attempts capture at `t`, blind recursion would surface the
prompt 5+ times. Cap at 5 consecutive offsets and surface a clear
dead-end toast. This is a bug-safety rail, not a feature; tested via
an induced-collision fixture.

### Alternatives considered

1. **`showQuickPick` with three items** — rejected; quick-picks
   don't block the editor like a modal, and they open in the
   command-palette slot (visually removed from the Map Viewer).
2. **Custom webview modal inside the Storyboard panel** — rejected
   on cost (postMessage plumbing + focus management).
3. **Non-modal toast with action buttons
   (`showWarningMessage` without `modal: true`)** — rejected; user
   could proceed with other actions while the toast sits there, and
   a subsequent shortcut press would race the pending resolution.
4. **Default "Replace" with an Undo toast** — rejected; hides the
   destructive-write decision behind a small toast; violates the
   "no silent overwrites" success criterion (SC-003).

---

## R4 — First-capture Storyboard-name quick-pick

### Decision

Use **`vscode.window.showInputBox`** (not `showQuickPick`) for the
first-capture Storyboard-name prompt. The inline name-collision
check feeds `InputBoxOptions.validateInput`, which VS Code renders
below the input field as an inline error while keeping Enter
disabled until the text is valid:

```ts
const existingNames = new Set(
  plot.features
    .filter(isStoryboardFeature)
    .map((f) => f.properties.name),
);

const name = await vscode.window.showInputBox({
  title: 'Name your Storyboard',
  prompt: 'This name appears in the Storyboard panel dropdown.',
  placeHolder: 'e.g. MARSTRIKE 26 — Day 1',
  ignoreFocusOut: true,
  validateInput: (candidate: string) => {
    const trimmed = candidate.trim();
    if (trimmed.length === 0) return 'Name cannot be empty.';
    if (existingNames.has(trimmed))
      return `A Storyboard called "${trimmed}" already exists on this plot.`;
    return null;  // valid
  },
});

if (name === undefined) {
  // User dismissed (Esc) — no Storyboard, no Scene, plot not dirtied.
  return;
}
```

The spec calls this a "quick-pick" informally, but VS Code's
`showQuickPick` is a list-selection primitive — wrong affordance
for free-text entry. `showInputBox` is the correct primitive and
already ships inline-error-while-typing ergonomics.

On dismissal (`Esc` or focus-out with `ignoreFocusOut: false` — but
we use `ignoreFocusOut: true` so focus changes don't abort) the
handler returns `undefined` and the capture flow aborts before any
state mutation (FR-CAP-003 + edge case "Quick-pick dismissed without
a name").

### Rationale

- **`showInputBox` has inline validation built in** — `validateInput`
  renders the error message below the input box and disables Enter
  while validation fails. No custom webview needed.
- **`ignoreFocusOut: true`** — clicking the map to check framing
  should not cancel the prompt. Matches VS Code UX for
  long-running prompts (e.g. the "branch name" prompt in the Git
  extension).
- **Collision check runs against the current plot** — we read
  `plot.features` (already held by the extension) and filter by
  `isStoryboardFeature` (already exported by #215's type guards).
- **Trim on comparison** — leading/trailing whitespace is collapsed
  so `"Day 1"` and `"Day 1 "` are recognised as duplicates.
- **Accepts Unicode / markdown** — no input filtering beyond the
  empty-after-trim check. Storyboard names are user-facing labels.

### Alternatives considered

1. **`showQuickPick` with a single "Create new…" item that cascades
   into a text input** — rejected; two modal steps where one
   suffices.
2. **Custom webview inside the minimal Storyboard panel** —
   rejected on cost, matches R3.
3. **Post-validate** — accept any name, then after create, if
   `DuplicateStoryboardName` fires, re-prompt. *Rejected*: less
   responsive, and the user has to retype the colliding name. Inline
   `validateInput` is cheap.

### Edge case interaction — active Storyboard exists

If the plot already has at least one Storyboard, the first-capture
quick-pick **is not shown**. The handler instead calls #215's
`getActiveStoryboardDefault(plot)` and appends the new Scene to the
returned Storyboard (FR-CAP-005). Only when
`getActiveStoryboardDefault` returns `null` does the input-box fire.

---

## R5 — Minimal Storyboard panel placement

### Decision

Ship a **new `WebviewViewProvider`** registered under the existing
Debrief view container (the left sidebar that hosts the Log Panel,
STAC browser, and Time Controller). The new view is contributed as:

```jsonc
// apps/vscode/package.json contributions
"views": {
  "debrief": [
    { "id": "debrief.storyboardPanel",
      "name": "Storyboard",
      "type": "webview",
      "when": "debrief.plotOpen"        // hidden until a plot is open
    }
  ]
}
```

The provider class lives at `apps/vscode/src/views/storyboardPanelView.ts`
and mirrors `logPanelView.ts` in shape:

- Receives the current plot + active-Storyboard id via a
  `SessionManager` subscription.
- Posts an initial `{type: 'scenes', scenes: SceneRowViewModel[]}`
  message on resolve.
- Replaces the scene list on plot-change or post-capture.
- Imports the React component `<StoryboardPanel/>` from
  `@debrief/components` as a type-only import (runtime bundle lands
  in the webview side via `webview/web/storyboardPanel.tsx`).

"Minimal" scope for this spec: the panel renders the active
Storyboard's scene list (thumbnail, DTG title, secondary timestamp
line) + a "Capture" button that invokes the same command the
keybinding triggers. **Not** in scope here: multi-Storyboard
dropdown, overflow menu (create / rename / delete), Scene reorder,
transport controls, on-map rectangle overlay, stale indicator. Those
are all #217/#218. The view ID `debrief.storyboardPanel` is
deliberately chosen as the extension point for #217 to grow the
panel in place rather than introduce a second view.

Auto-open on first capture is implemented via
`commands.executeCommand('debrief.storyboardPanel.focus')` — the
view ID + `.focus` suffix is VS Code's built-in focus command.

### Rationale

- **WebviewViewProvider is the sidebar-panel primitive** — used by
  LogPanel (#072/#176), STAC browser (#077), and time-range view.
  Zero new infrastructure.
- **View ID is stable for #217/#218** — those specs extend the
  existing provider (swap the React component, add messages) without
  introducing a second view.
- **Visibility `when: "debrief.plotOpen"`** — the panel doesn't
  clutter the sidebar for users who haven't opened a plot. The
  existing context key (set in `extension.ts` line 638 / mapPanel.ts
  line 811) already tracks this.
- **"Capture" button inside the panel** — gives users without
  keyboard muscle-memory a second trigger surface that also obeys
  the `debrief.mapFocused` precondition (the button calls the
  command; the command re-checks state).

### Alternatives considered

1. **`WebviewPanel` in the editor area** — rejected; editor-area
   panels compete with the actual Map Viewer for screen space and
   aren't appropriate for a passive-read confirmation panel.
2. **Fold into the Activity Panel as a fourth section** —
   *rejected*: the Activity Panel is task-focused (selection,
   properties, filters), not plot-timeline. Storyboards have their
   own information architecture that #217/#218 will grow.
3. **Re-use the Log Panel** — rejected; the Log Panel shows
   provenance (Analysis Log); Storyboard is a distinct capability
   with a different selection model (Scenes, not LogEntries).
4. **Defer panel UI entirely; confirm via toast only** —
   rejected; FR-CAP-013 explicitly requires the panel to auto-open
   and show the Scene list.

---

## R6 — Actor + single-flight guard + plot dirty flag

Three small integration questions grouped because each has one
obvious answer that falls out of existing patterns.

### R6a — Actor value for provenance

#215's CRUD module expects an `actor: string` on every mutation input,
written into `LogEntry.agent`. VS Code exposes **no stable user
identity** across hosts (desktop VS Code, code-server, web-shell), so:

**Decision**: use `os.userInfo().username` (Node stdlib) as the actor
when running in a host with an OS user (desktop VS Code, Linux/macOS
code-server), falling back to the literal string `"vscode-user"`
when `os.userInfo()` throws (some containerised code-server
deployments). The value is captured at extension-activation time
and cached on `SessionManager`, not re-read per mutation.

This is not a security boundary — it's an attribution helper for the
Analysis Log. #218's edit suite may later offer an explicit "Actor
override" setting; this spec doesn't introduce one.

### R6b — Single-flight capture guard

FR-CAP edge case: "Capture triggered during a thumbnail capture
that's already in flight — the second press is ignored to prevent
overlapping #174 calls".

**Decision**: a module-level `captureInFlight: boolean` in
`commands/captureScene.ts`. Set to `true` at command entry, reset in
a `finally` block. While `true`, subsequent invocations return
immediately with an unobtrusive status-bar message ("Capture in
progress…") — **not** an error toast; this is a UX hint, not a
failure.

The guard is intentionally a module-scoped variable rather than a
session-state flag because:
- It's extension-host-only state; the webview doesn't need to know.
- It spans exactly one async operation (thumbnail → CRUD write).
- Session-state is for user-visible plot state; this is a command-
  handler concurrency primitive.

Scope of "in flight": from the moment the handler starts, through
the thumbnail request, through the #215 CRUD call, through the
per-Scene PNG write, through the view-focus command. A failed
capture resets the guard; a successful capture resets the guard.

### R6c — Plot dirty-flag mechanism

The session store's `markDirty()` method — signature
`activeSession.getState().markDirty(): void` (no arguments; the
dirty flag is per-active-session, not per-plot-id) — is the single
entry point for marking a plot as having unsaved changes. The
store's dirty middleware already wires `markDirty()` calls to the
VS Code dirty indicator via
`services/session-state/src/store/middleware/dirty.ts`. Capture
calls `markDirty` **after** features have been pushed into
`MapPanel.setFeatures(...)` with the new Storyboard + Scene, and
**after** the per-Scene thumbnail PNG has been written (so that
save-close-reopen restores a consistent plot — the Scene reference
and the thumbnail file agree).

If #215's CRUD returns the same features reference (no-op —
impossible in practice but defensively checked), `markDirty` is
still called because capture conceptually always produces a write.

**Decision**: one `activeSession.getState().markDirty()` call at
the end of the happy path, immediately before the panel-focus
command. No dirty-flag changes on any failure path (SC-002).

### Rationale

- **Actor**: Matches precedent set by the LogPanel's existing
  `LogEntry.agent` field — always populated, never trusted as a
  security claim.
- **Single-flight**: The simplest correct primitive. A queue would
  surface visual complexity (pending rows, toast about "queued");
  silent ignore with a status-bar hint matches VS Code's native
  non-reentrant command behaviour for other "long-running"
  commands.
- **Dirty**: Placing `markDirty` at the end of the happy path keeps
  dirty == "there's a write to save". Partial-failure paths never
  reach it. SC-002's "plot's dirty state is unchanged by a failed
  op" is then a structural guarantee, not a conditional.

### Alternatives considered

- **R6a**: Use `context.extension.publisher` or similar — rejected;
  that's the extension identity, not the user. Use a UUID per
  session — rejected; loses human-readability.
- **R6b**: Queue the second press — rejected as surplus complexity;
  spec permits silent ignore. Use a promise-based mutex with the
  `async-mutex` package — rejected; no new dep needed for one
  boolean.
- **R6c**: Mark dirty at the start of the command and unmark on
  failure — rejected; race-condition-prone. Leaves dirty-state
  visibly flickering for the user. End-of-happy-path is simpler
  and matches the spec's language.

---

## Phase-0 Exit

All six questions resolved. No `NEEDS CLARIFICATION` markers remain
in Technical Context. Proceed to Phase 1 Design.