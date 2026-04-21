# Contract: Storyboard panel `postMessage` discriminated union

**Feature**: 217-storyboarding-playback
**File**: `apps/vscode/src/types/storyboardPanelMessages.ts` (extend)
**Status**: Language-neutral contract. All messages crossing the
extension ↔ webview boundary are members of these two discriminated
unions. No `any`, no `unknown`, no free-form payload.

This contract **extends** the #216 message set with dropdown, overflow
menu, transport, and active-state updates.

---

## 1. Outbound (extension → panel webview)

```ts
export type ExtensionToStoryboardPanelMessage =
  | { type: 'scenes';
      scenes: ReadonlyArray<SceneRowViewModel>;
      activeStoryboardName: string | null;
      activeStoryboardId: string | null; }                // existing from #216

  | { type: 'captureInFlight';
      inFlight: boolean; }                                // existing from #216

  // ── NEW for #217 ───────────────────────────────────────────────────
  | { type: 'snapshot';
      storyboards: ReadonlyArray<StoryboardOptionViewModel>;
      scenes: ReadonlyArray<SceneRowViewModel>;
      activeStoryboardId: string | null;
      currentSceneId: string | null;
      activeStoryboardName: string | null;
      transport: TransportViewModel; };
```

The new `snapshot` message replaces piece-meal updates — the service
computes the full `StoryboardPlaybackSnapshot` and broadcasts it
wholesale on every transport step, dropdown switch, CRUD op, or plot-
features change. The webview diffs internally via React key stability.

The existing `scenes` and `captureInFlight` messages are kept for
backward compatibility with the #216 capture flow and are still used by
`storyboardPanelView.ts`'s `refresh()` path. The service's outbound
broadcasts use `snapshot` exclusively.

### Invariants

- `activeStoryboardId === null` ↔ `storyboards.length === 0` OR the
  analyst has switched to "no storyboard" (not a currently exposed
  action, but reserved).
- `currentSceneId === null` ↔ `scenes.length === 0`.
- `transport.sceneTotal === scenes.length`.
- `transport.sceneNumber` is 1-based or 0 when `scenes.length === 0`.
- `transport.canGoForward` → `!transport.transitionInFlight &&
  transport.sceneNumber < transport.sceneTotal`.
- `transport.canGoBackward` → `!transport.transitionInFlight &&
  transport.sceneNumber > 1`.

---

## 2. Inbound (panel webview → extension)

```ts
export type StoryboardPanelMessage =
  | { type: 'ready' }                                                // existing from #216
  | { type: 'capture-clicked' }                                      // existing from #216
  | { type: 'scene-row-clicked'; sceneId: string }                   // existing from #216 — behaviour CHANGED (now drives playback)
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; message: string }  // existing from #216

  // ── NEW for #217 ───────────────────────────────────────────────────
  | { type: 'active-storyboard-changed'; storyboardId: string }
  | { type: 'transport-forward-clicked' }
  | { type: 'transport-backward-clicked' }
  | { type: 'create-storyboard-requested' }
  | { type: 'rename-storyboard-requested'; storyboardId: string }
  | { type: 'delete-storyboard-requested'; storyboardId: string };
```

### Behaviour-change: `scene-row-clicked`

- **Before (#216)**: extension logs only; no UI change.
- **After (#217)**: extension calls
  `storyboardPlaybackService.goToScene(documentUri, sceneId)`. The
  service runs the hard-block check inside `goToScene` — if the
  target Scene's `visible_feature_ids` no longer resolve or its
  timestamp falls outside the plot's time range, the native VS Code
  modal is surfaced. Rows themselves carry no pre-computed `blocked`
  state (design-fix 1) — classification runs only at step-onto time.

### Behaviour of management messages

Each of `create-storyboard-requested`, `rename-storyboard-requested`,
`delete-storyboard-requested` is handled by invoking the matching
VS Code command (`debrief.storyboard.create`, `.rename`, `.delete`) via
`vscode.commands.executeCommand`. This keeps the command palette and
the panel overflow menu wired to the same handler — no duplication.

### Behaviour of transport messages

`transport-forward-clicked` / `transport-backward-clicked` invoke
`debrief.storyboard.forward` / `.backward` via `executeCommand`.
Rationale: keeps the panel's button clicks and the scoped arrow keys
on the same code path (ensures in-flight gating + hard-block behaviour
are identical regardless of entry point).

### Behaviour of dropdown change

`active-storyboard-changed` is handled **synchronously**:
- Calls `service.setActiveStoryboard(documentUri, storyboardId)`.
- No VS Code command dispatch — this is pure state.
- The service emits a new snapshot within the same microtask, so
  the webview's next render frame sees the updated Scene list +
  rectangles (SC-003 — within the same user interaction).

---

## 3. Lifecycle

- On panel `ready`, the view provider calls
  `storyboardPlaybackService.getSnapshot(activePlotPath)` and posts
  the initial `snapshot` message.
- On `onSnapshotChange`, the view provider posts a new `snapshot`
  message. Snapshot equality is NOT checked — the service caller is
  responsible for only emitting on meaningful state changes.
- On panel visibility change (hidden → visible), the view provider
  re-posts the latest snapshot (React would re-mount with stale
  props otherwise).

---

## 4. Map-side messages (extension ↔ MapPanel webview)

Separate surface — see `contracts/map-view-flyto.md` for the
Leaflet-webview messages; `scene-rectangle-clicked` flows from the
MapPanel webview to the extension, which then calls
`service.goToScene(documentUri, sceneId)` (same entry point as
`scene-row-clicked`).

---

## 5. Testability

Unit tests for the view provider mock the webview and assert the
`postMessage` payload matches the discriminated-union variant exactly.
A TypeScript type test (`expectType<...>`) asserts the unions are
exhaustive — `default` cases in the handlers are `never`-typed and
compile-fail if a new variant is added without a handler update
(Article XV defence-in-depth).
