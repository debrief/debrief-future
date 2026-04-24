# Data Model: Storyboard Edit Reducer State

**Feature**: 230 | **Phase**: 1 | **Date**: 2026-04-24

This feature introduces **no new persisted data**. All state described here is ephemeral webview display state owned by the `useStoryboardEditReducer` hook. Service-layer entities (`Scene`, `Storyboard`, `LogEntry`, `UndoBufferEntry`, `StaleFlag`) are unchanged from #215/#218 and are referenced here only insofar as the reducer mirrors them.

---

## Entities

### E1. `StoryboardEditReducerState`

Top-level shape maintained by `useReducer`. Single source of truth for the panel's ephemeral display state.

| Field | Type | Derivation / Source | Notes |
|-------|------|---------------------|-------|
| `editFormOpenFor` | `sceneId \| null` | Local — set by `'expand-row-toggle'` / `'scene-edit-form-open'` / `'scene-edit-form-close'` | At most one Scene's form is open at a time (FR-004). |
| `pendingUndoToast` | `UndoToastDescriptor \| null` | Inbound — set by `'scene-undo-toast-shown'` message from extension | Cleared on `'scene-undo-toast-dismissed'` (local) or `null` inbound. |
| `staleFlags` | `ReadonlyMap<sceneId, StaleFlagEntry>` | Inbound — set by `'scene-stale-flags-updated'` message | Full replacement on each inbound (not merge). |
| `sceneRows` | `readonly SceneRowViewModel[]` | Inbound — set by `'scenes'` / `'snapshot'` message | Existing from #218; unchanged shape. |
| `activeStoryboardId` | `storyboardId \| null` | Inbound — set by `'scenes'` / `'snapshot'` | Existing. |
| `activeStoryboardName` | `string` | Inbound | Existing. |
| `storyboards` | `readonly StoryboardSummary[]` | Inbound | Existing. |
| `currentSceneId` | `sceneId \| null` | Inbound | Existing (transport highlight). |
| `transport` | `TransportState` | Inbound | Existing. |
| `captureInFlight` | `boolean` | Inbound | Existing. |
| `theme` | `'light' \| 'dark' \| 'vscode'` | Inbound | Existing. |
| `overflowMenuOpenFor` | `sceneId \| null` | Local — set by `'overflow-menu-open'` / `'overflow-menu-close'` | At most one overflow menu open at a time. |
| `overflowMenuAnchorRect` | `DOMRect \| null` | Local — set by `'overflow-menu-open'` | Positioning reference for the menu popover. |

**State invariants**:

- If `editFormOpenFor === X`, then `X` MUST be present in `sceneRows` (else the form's anchor row has disappeared — reducer MUST close the form).
- If `overflowMenuOpenFor !== null`, then `overflowMenuAnchorRect !== null`.
- `staleFlags` never contains a `sceneId` absent from `sceneRows` (ordering invariant: reducer applies `'scenes'` before or alongside `'scene-stale-flags-updated'`).

---

### E2. `UndoToastDescriptor`

Session-scoped descriptor identifying a just-deleted Scene that can still be restored.

| Field | Type | Notes |
|-------|------|-------|
| `sceneId` | `sceneId` | The deleted Scene's ID (still unique within plot; used on Undo click to route to the service). |
| `sceneTitle` | `string` | Display string for the toast. |
| `storyboardId` | `storyboardId` | Which Storyboard the Scene was deleted from (for routing on Undo). |
| `deletedAt` | `ISO8601 string` | For ordering if multiple undo toasts stack (future — v1 shows one at a time). |

**Lifecycle**:

1. User chooses Delete → service soft-deletes → service emits `'scene-undo-toast-shown'` with descriptor.
2. Reducer stores descriptor; toast renders.
3. **Branch A**: User clicks Undo → reducer dispatches `'scene-undo-delete-clicked'` outbound postMessage → service restores → service emits `'scene-undo-toast-shown'` with `null` → reducer clears.
4. **Branch B**: User dismisses the toast (close button) → reducer dispatches local `'scene-undo-toast-dismissed'` → reducer clears (no outbound). Service's session buffer finalises on plot close regardless (FR-010).
5. **Branch C**: Another Scene is deleted → service emits a new descriptor → reducer replaces.

---

### E3. `StaleFlagEntry`

Per-Scene marker of whether source features have diverged since capture.

| Field | Type | Notes |
|-------|------|-------|
| `sceneId` | `sceneId` | Key. |
| `stale` | `boolean` | True iff source features have diverged. |
| `unresolvedFeatureIds` | `readonly string[]` | Feature IDs whose state differs from capture; shown in tooltip. Empty array if `stale === false`. |

**Derivation**: Computed authoritatively by the extension-side `storyboardEditService.getStaleFlag(docUri, sceneId)` (from #218). Webview never computes staleness — it only mirrors.

---

### E4. `SceneEditViewModel` *(existing from #218, reiterated for contract)*

Per-Scene display bundle emitted by the enriched `storyboardPanelView.refresh()`.

| Field | Type | Notes |
|-------|------|-------|
| `sceneId` | `sceneId` | |
| `title` | `string` | |
| `description` | `string \| null` | |
| `thumbnailHref` | `string \| null` | May be `null` if thumbnail capture failed. |
| `staleReason` | `'features-moved' \| 'features-deleted' \| null` | Null when not stale. |
| `pendingDeleteReason` | `string \| null` | For in-flight deletes awaiting service confirmation. |
| `editFormOpen` | `boolean` | **Note**: `editFormOpenFor` in reducer state is authoritative; this field is for renderer convenience only and MUST reflect `state.editFormOpenFor === vm.sceneId`. |
| `state` | `'idle' \| 'pending-delete' \| 'refreshing' \| 'editing'` | Aggregate render state. |

Already defined at `shared/components/src/panels/StoryboardPanel/types.ts`; this feature does not modify the shape, only the emission site (extends `refresh()` to emit it alongside existing rows).

---

### E5. `StoryboardEditViewModel` *(new aggregate)*

Storyboard-level display bundle for header rename/describe + refresh-all-stale.

| Field | Type | Notes |
|-------|------|-------|
| `storyboardId` | `storyboardId` | |
| `name` | `string` | |
| `description` | `string \| null` | |
| `staleSceneCount` | `number` | Derived: `staleFlags.filter(s => s.stale).length`. Drives "Refresh all stale (N)" button enablement. |
| `pendingRename` | `boolean` | True while a rename round-trip is in flight. |

---

## Action Union (reducer contract)

```ts
type StoryboardEditAction =
  // Inbound (extension → webview) — mirror of ExtensionToStoryboardPanelMessage extensions
  | { type: 'scenes-message'; payload: ScenesMessage }
  | { type: 'snapshot-message'; payload: SnapshotMessage }
  | { type: 'scene-edit-form-open'; sceneId: SceneId }
  | { type: 'scene-stale-flags-updated'; flags: readonly StaleFlagEntry[] }
  | { type: 'scene-undo-toast-shown'; toast: UndoToastDescriptor | null }
  | { type: 'capture-in-flight'; inFlight: boolean }
  | { type: 'theme-changed'; theme: 'light' | 'dark' | 'vscode' }

  // Local (user interaction in webview)
  | { type: 'expand-row-toggle'; sceneId: SceneId }
  | { type: 'scene-edit-form-close' }
  | { type: 'scene-undo-toast-dismissed' }
  | { type: 'overflow-menu-open'; sceneId: SceneId; anchorRect: DOMRect }
  | { type: 'overflow-menu-close' };
```

Reducer is **pure**. Every action produces a new state reference (referential equality); fields untouched by an action retain their prior references (so `React.memo` on child components bails out correctly).

---

## Validation Rules

- `sceneId` values must match `/^[a-zA-Z0-9_-]{1,128}$/` (inherited from #215).
- `storyboardId` values follow the same pattern.
- Outbound actions referencing a `sceneId` that is not present in `sceneRows` are silently dropped by the reducer (defensive — should not happen in practice; logged to console.warn).
- `StaleFlagEntry.unresolvedFeatureIds` is always a fresh array on emission (never mutated in place).

---

## State Transitions (selected)

### T1. Open edit form via chevron

```text
Initial: { editFormOpenFor: null }
Action:  { type: 'expand-row-toggle', sceneId: 'S1' }
Result:  { editFormOpenFor: 'S1' }

Next:    { type: 'expand-row-toggle', sceneId: 'S2' }
Result:  { editFormOpenFor: 'S2' }      // S1's form closes; S2's opens

Next:    { type: 'expand-row-toggle', sceneId: 'S2' }
Result:  { editFormOpenFor: null }       // Toggle off
```

### T2. Delete + undo

```text
Initial:  { sceneRows: [S1, S2], pendingUndoToast: null }
Inbound:  { type: 'scene-undo-toast-shown', toast: { sceneId: 'S1', ... } }
Result:   { sceneRows: [S2] (service already soft-deleted),
            pendingUndoToast: { sceneId: 'S1', ... } }

Outbound: postMessage({ type: 'scene-undo-delete-clicked', sceneId: 'S1' })
(service processes, restores row, re-emits scenes)

Inbound:  { type: 'scenes-message', payload: { sceneRows: [S1, S2] } }
Inbound:  { type: 'scene-undo-toast-shown', toast: null }
Result:   { sceneRows: [S1, S2], pendingUndoToast: null }
```

### T3. Stale → refresh → clear

```text
Inbound:  { type: 'scene-stale-flags-updated',
            flags: [{ sceneId: 'S1', stale: true, unresolvedFeatureIds: ['f1', 'f2'] }] }
Result:   { staleFlags: Map([['S1', {stale:true, ...}]]) }

Outbound: postMessage({ type: 'scene-refresh-thumbnail-clicked', sceneId: 'S1' })
(service refreshes, re-evaluates staleness)

Inbound:  { type: 'scene-stale-flags-updated', flags: [] }   // or [{S1, stale:false, []}]
Result:   { staleFlags: Map() }                               // badge clears
```

### T4. Overflow menu open → item click → close

```text
Action:   { type: 'overflow-menu-open', sceneId: 'S1', anchorRect: DOMRect }
Result:   { overflowMenuOpenFor: 'S1', overflowMenuAnchorRect: DOMRect }

User clicks "Delete":
Outbound: postMessage({ type: 'scene-delete-requested', sceneId: 'S1' })
Action:   { type: 'overflow-menu-close' }
Result:   { overflowMenuOpenFor: null, overflowMenuAnchorRect: null }
```

---

## Non-entities (explicitly not introduced)

- **No new LinkML schema nodes** — staleness / undo / edit-view-model shapes all live in TypeScript only (they are webview display state, not domain data).
- **No new database tables or files** — session-scoped state lives in memory.
- **No new store slices in `@debrief/session-state`** — the reducer state is panel-local.

---

## References

- **`SceneEditViewModel`** and **`SceneUndoToastDescriptor`**: already defined at `shared/components/src/panels/StoryboardPanel/types.ts` (from #218).
- **`ExtensionToStoryboardPanelMessage` / `WebviewToExtensionMessage`**: defined at `apps/vscode/src/types/storyboardPanelMessages.ts` (extended by this feature — see `contracts/postmessage-contract.md`).
- **`SceneRowViewModel`**: existing from #218; unchanged.
