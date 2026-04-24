# Contract: Storyboard Panel postMessage (webview ↔ extension)

**Feature**: 230 | **Phase**: 1 | **Date**: 2026-04-24

This contract extends `apps/vscode/src/types/storyboardPanelMessages.ts` with the 3 new inbound + 11 new outbound message types required to wire the edit suite through the panel. Message shapes originate from #218; this document makes the contract explicit for the web-shell harness mock port (which MUST faithfully mirror these shapes).

Parent unions:

- `ExtensionToStoryboardPanelMessage` — messages sent by the VS Code extension host to the webview (or by the mock port in the harness)
- `WebviewToExtensionMessage` — messages dispatched by the webview via `vscode.postMessage`

---

## Inbound (Extension → Webview) — additions

### I1. `scene-edit-form-open`

Request that the webview open the inline edit form for a specific Scene. Emitted when the user invokes "Edit description" via a command-palette entry (not via the in-panel chevron — that dispatch is local to the reducer).

```ts
{
  type: 'scene-edit-form-open';
  sceneId: SceneId;
}
```

**Reducer handling**: Sets `editFormOpenFor = sceneId`. If another row's form was open, it collapses.

---

### I2. `scene-stale-flags-updated`

Full replacement of the stale-flag map. Emitted whenever the service re-evaluates staleness (after a feature mutation, after a thumbnail refresh, on plot open).

```ts
{
  type: 'scene-stale-flags-updated';
  flags: readonly {
    sceneId: SceneId;
    stale: boolean;
    unresolvedFeatureIds: readonly string[];
  }[];
}
```

**Reducer handling**: Replaces `staleFlags` entirely with the new map. Does not merge.

**Ordering**: MUST NOT arrive before the first `'scenes'` / `'snapshot'` message for a plot (so every `sceneId` in `flags` corresponds to a known row).

---

### I3. `scene-undo-toast-shown`

Push a new Undo toast descriptor (or `null` to clear).

```ts
{
  type: 'scene-undo-toast-shown';
  toast: UndoToastDescriptor | null;
}
```

**Reducer handling**: Sets `pendingUndoToast = toast`. `null` clears the toast without an outbound dismiss event.

---

## Outbound (Webview → Extension) — additions

All outbound edit-suite actions are **standalone events** (FR-009). Each carries only the minimum identity required to route to the right service method; no derived state, no composed multi-intent payloads.

### O1. `scene-title-rename-committed`

```ts
{
  type: 'scene-title-rename-committed';
  sceneId: SceneId;
  newTitle: string;  // trimmed; min length 1 enforced at form boundary before dispatch
}
```

### O2. `scene-description-edit-submitted`

```ts
{
  type: 'scene-description-edit-submitted';
  sceneId: SceneId;
  description: string | null;  // null clears the description
}
```

### O3. `scene-delete-requested`

```ts
{
  type: 'scene-delete-requested';
  sceneId: SceneId;
}
```

### O4. `scene-undo-delete-clicked`

```ts
{
  type: 'scene-undo-delete-clicked';
  sceneId: SceneId;
}
```

### O5. `scene-update-to-current-clicked`

```ts
{
  type: 'scene-update-to-current-clicked';
  sceneId: SceneId;
}
```

### O6. `scene-duplicate-clicked`

```ts
{
  type: 'scene-duplicate-clicked';
  sceneId: SceneId;
}
```

### O7. `scene-copy-to-other-clicked`

```ts
{
  type: 'scene-copy-to-other-clicked';
  sceneId: SceneId;
  // Destination storyboard picked by the extension via showQuickPick —
  // NOT carried in this event. The extension prompts and routes.
}
```

### O8. `scene-refresh-thumbnail-clicked`

```ts
{
  type: 'scene-refresh-thumbnail-clicked';
  sceneId: SceneId;
}
```

### O9. `storyboard-refresh-all-stale-clicked`

```ts
{
  type: 'storyboard-refresh-all-stale-clicked';
  storyboardId: StoryboardId;
}
```

### O10. `storyboard-name-rename-committed`

```ts
{
  type: 'storyboard-name-rename-committed';
  storyboardId: StoryboardId;
  newName: string;
}
```

### O11. `storyboard-description-edit-submitted`

```ts
{
  type: 'storyboard-description-edit-submitted';
  storyboardId: StoryboardId;
  description: string | null;
}
```

---

## Contract Invariants

1. **Statelessness per message**: every outbound action carries only identity + payload-required fields. No action carries the result of another action (FR-009).
2. **No fire-and-forget retries**: the webview dispatches each action exactly once per user intent. Service-side failures route back as inbound messages (stale flag, undo toast, error notification), not as webview-driven retries.
3. **Ordering guarantees from extension**:
   - A `'scene-stale-flags-updated'` MUST follow the first `'scenes'` / `'snapshot'` for the plot.
   - A `'scene-undo-toast-shown'` with a specific `sceneId` MUST NOT precede the service's successful soft-delete of that Scene.
   - The refresh payload from `storyboardPanelView.refresh()` is the same `'scenes'` message shape extended with `sceneEditViewModels`, `pendingUndoToast`, and `storyboardEditViewModel` — no new message type at the top level (FR-008, bounded payload).
4. **Reducer purity**: for any action A and state S, `reducer(S, A)` is a pure function (no side effects, no network, no time-reading). Side effects (postMessage dispatch) happen in event handlers that read state BEFORE dispatching.
5. **Harness parity**: the web-shell mock port MUST accept and emit these exact shapes. Any drift = test escapes production defects.

---

## Refresh Payload Extension

`storyboardPanelView.refresh()` emits a `'scenes'` message whose payload is extended to include the new edit-suite view-models. Shape:

```ts
{
  type: 'scenes';
  sceneRows: readonly SceneRowViewModel[];             // existing — unchanged
  activeStoryboardName: string;                        // existing
  activeStoryboardId: StoryboardId | null;             // existing
  storyboards: readonly StoryboardSummary[];           // existing
  sceneEditViewModels: Readonly<Record<SceneId, SceneEditViewModel>>;  // NEW — FR-020
  pendingUndoToast: UndoToastDescriptor | null;        // NEW — FR-020
  storyboardEditViewModel: StoryboardEditViewModel | null;  // NEW — FR-020
}
```

**Performance constraint**: computing `sceneEditViewModels` MUST stay O(active-storyboard Scenes) (FR-008 — preserves #218 invariant R4/13A). An inline comment at the build site calls this out so future changes don't silently degrade the polish-loop UX.

---

## Error Surface

- If a `sceneId` in an outbound action does not correspond to a known Scene on the extension side (e.g. race: user clicked Delete on a Scene that was just deleted by another workflow), the extension logs a warning and emits no follow-up state change. The webview's reducer does not crash; the user-visible result is a no-op + a subtle warning in the output channel.
- If an inbound message carries an unknown `type`, the reducer logs `console.warn` and passes through state unchanged. Forward-compat affordance.
