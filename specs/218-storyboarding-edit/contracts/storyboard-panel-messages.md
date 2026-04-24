# Contract: `StoryboardPanel` postMessage delta

**Files**:
- `apps/vscode/src/types/storyboardPanelMessages.ts` (extend
  discriminated union)
- `apps/vscode/src/views/storyboardPanelView.ts` (dispatch new
  inbound variants to `StoryboardEditService`)
- `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
  (emit new outbound variants; handle new inbound variants)

This is an **additive** extension of the discriminated union
established by #216 / #217. Existing variants are unchanged.

## Outbound (panel → extension): 10 new variants

```ts
// added to StoryboardPanelToHostMessage
type StoryboardPanelToHostMessage =
  | { kind: "scene-row-clicked"; sceneId: string }                          // from #217 (unchanged)
  | ...existing #217 variants
  | { kind: "scene-title-rename-committed"; sceneId: string; newTitle: string }  // NEW
  | { kind: "scene-description-edit-submitted"; sceneId: string; description: string | null }  // NEW
  | { kind: "scene-delete-requested"; sceneId: string }  // NEW
  | { kind: "scene-undo-delete-clicked"; sceneId: string }  // NEW
  | { kind: "scene-update-to-current-clicked"; sceneId: string }  // NEW
  | { kind: "scene-duplicate-clicked"; sceneId: string }  // NEW
  | { kind: "scene-copy-to-other-clicked"; sceneId: string; destinationStoryboardId: string }  // NEW
  | { kind: "scene-refresh-thumbnail-clicked"; sceneId: string }  // NEW
  | { kind: "storyboard-refresh-all-stale-clicked"; storyboardId: string }  // NEW (FR-EDIT-025)
  | { kind: "storyboard-name-rename-committed"; storyboardId: string; newName: string }  // NEW
  | { kind: "storyboard-description-edit-submitted"; storyboardId: string; description: string | null };  // NEW
```

## Inbound (extension → panel): 3 new variants

```ts
// added to HostToStoryboardPanelMessage
type HostToStoryboardPanelMessage =
  | ...existing #216 / #217 variants (state-updated, transport-state, hard-block-modal-shown)
  | { kind: "scene-edit-form-open"; sceneId: string; missingDataContext: MissingDataContext | null }  // NEW — used by #217 hard-block "Open for editing" action
  | { kind: "scene-stale-flags-updated"; staleByScene: ReadonlyArray<{ sceneId: string; stale: boolean; unresolvedFeatureIds: readonly string[] }> }  // NEW
  | { kind: "scene-undo-toast-shown"; sceneId: string; sceneTitle: string; deletedAt: string };  // NEW
```

Where `MissingDataContext` is derived from #215's
`detectMissingDataForScene`:

```ts
type MissingDataContext =
  | { kind: "missing-features"; ids: readonly string[] }
  | { kind: "out-of-range"; scenario: "before-start" | "after-end" };
```

## Dispatch contract (extension side)

`storyboardPanelView.ts` gains a small switch in its
`onDidReceiveMessage`:

```ts
switch (msg.kind) {
  // …existing cases from #216 / #217…
  case "scene-title-rename-committed":
    await editService.renameScene({ documentUri, sceneId: msg.sceneId, newTitle: msg.newTitle, actor });
    break;
  case "scene-description-edit-submitted":
    await editService.describeScene({ documentUri, sceneId: msg.sceneId, description: msg.description, actor });
    break;
  case "scene-delete-requested":
    await editService.deleteScene({ documentUri, sceneId: msg.sceneId, actor });
    break;
  case "scene-undo-delete-clicked":
    await editService.undoDeleteScene({ documentUri, sceneId: msg.sceneId, actor });
    break;
  case "scene-update-to-current-clicked":
    // Resolve via the command handler, which owns the
    // collision-prompt UX surface
    await vscode.commands.executeCommand("debrief.storyboard.updateSceneToCurrent",
      { documentUri, sceneId: msg.sceneId });
    break;
  case "scene-duplicate-clicked":
    await vscode.commands.executeCommand("debrief.storyboard.duplicateScene", ...);
    break;
  case "scene-copy-to-other-clicked":
    // Panel already chose destination via its own quick-pick (served
    // by the list of Storyboards in the view model); the service
    // handles collision
    ...
  case "scene-refresh-thumbnail-clicked":
    await vscode.commands.executeCommand("debrief.storyboard.refreshSceneThumbnail", ...);
    break;
  case "storyboard-name-rename-committed":
    await editService.renameStoryboard(...);
    break;
  case "storyboard-description-edit-submitted":
    await editService.describeStoryboard(...);
    break;
  default:
    return assertNever(msg);  // TS exhaustiveness guard
}
```

## Props → view model transformation

`storyboardPanelView.ts`'s `refresh()` method (which already builds
the `StoryboardPanelProps` from the plot FeatureCollection for
#216 / #217) gets two new responsibilities:

1. **Attach stale flags** — for each Scene, read
   `editService.getStaleFlag(documentUri, sceneId)` and populate
   `stale` + `unresolvedFeatureIds` on the `SceneEditViewModel`.
2. **Attach pending deletes** — for each Scene in
   `editService.getPendingDeletes(documentUri)`, set
   `pendingDelete: true` on that row's view model (the row will
   render in the "pending" list rather than the main scrolling list).

## Lifecycle — edit-form open from hard-block

The full hand-off from #217 to #218:

1. #217's playback service detects `detectMissingDataForScene !==
   "ok"` on advance; posts `hard-block-modal-shown`.
2. Panel renders #217's `HardBlockModal` with two actions.
3. User clicks *Open for editing* → panel posts
   `hard-block-open-for-editing-clicked` (already defined by #217).
4. #217's command handler (`debrief.storyboard.editScene`) is
   invoked. **This handler is now owned by #218** (R6).
5. The #218 handler calls `editService.openSceneForMissingDataEdit`,
   which:
   a. posts `scene-edit-form-open` **inbound** to the panel with
      the missing-data context pre-populated;
   b. (no #215 write yet — the user is now at the edit form,
      deciding what to do).
6. Panel renders the edit form expanded on the target Scene with
   the missing-data details panel visible (two buttons:
   *Update to current* / *Delete*).
7. User chooses → the appropriate outbound message fires
   (`scene-update-to-current-clicked` or `scene-delete-requested`).
8. Edit service writes via #215; the Scene refreshes; the modal
   (if #217's was still open) dismisses on the next `state-updated`
   tick.

## Versioning

The message `kind` discriminator is the stable contract. New
variants are **additive only** — existing consumers ignore unknown
kinds (via the default branch's `assertNever` becoming a
`no-op + log` in future versions, per the established pattern).

No breaking changes to #216 / #217's message variants.
