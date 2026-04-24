# Contract: VS Code Command Contributions

**Files**:
- `apps/vscode/src/commands/storyboardEdit.ts` (new handlers)
- `apps/vscode/package.json` (contributions)
- `apps/vscode/src/extension.ts` (registration)

Every command is contributed with `when:
"debrief.storyboardActive"` (context set by #217's
`StoryboardPlaybackService`) so it only appears in the command
palette while a plot with ≥ 1 Storyboard is open. All user-facing
strings route through the existing `messages.ts` (Article XI).

## New commands (10 total)

| Command ID | Title (palette) | Args | Handler |
|------------|-----------------|------|---------|
| `debrief.storyboard.renameScene` | *Storyboard: Rename Scene* | `{ documentUri, sceneId }` | `renameSceneHandler` |
| `debrief.storyboard.describeScene` | *Storyboard: Edit Scene Description* | `{ documentUri, sceneId }` | `describeSceneHandler` |
| `debrief.storyboard.deleteScene` | *Storyboard: Delete Scene* | `{ documentUri, sceneId }` | `deleteSceneHandler` |
| `debrief.storyboard.updateSceneToCurrent` | *Storyboard: Update Scene to Current* | `{ documentUri, sceneId }` | `updateToCurrentHandler` |
| `debrief.storyboard.duplicateScene` | *Storyboard: Duplicate Scene* | `{ documentUri, sceneId }` | `duplicateSceneHandler` |
| `debrief.storyboard.copySceneToOtherStoryboard` | *Storyboard: Copy Scene to Another Storyboard* | `{ documentUri, sceneId }` | `copyToOtherHandler` |
| `debrief.storyboard.refreshSceneThumbnail` | *Storyboard: Refresh Scene Thumbnail* | `{ documentUri, sceneId }` | `refreshThumbnailHandler` |
| `debrief.storyboard.refreshAllStaleThumbnails` | *Storyboard: Refresh All Stale Thumbnails* | `{ documentUri, storyboardId }` | `refreshAllStaleHandler` |
| `debrief.storyboard.renameStoryboard` | *Storyboard: Rename Storyboard* | `{ documentUri, storyboardId }` | `renameStoryboardHandler` |
| `debrief.storyboard.describeStoryboard` | *Storyboard: Edit Storyboard Description* | `{ documentUri, storyboardId }` | `describeStoryboardHandler` |

## Reused / replaced commands

| Command ID | Status | Notes |
|------------|--------|-------|
| `debrief.storyboard.editScene` | **Replaced** | #217's `storyboardEditStub.ts` registers a no-op; this slice replaces the registration with `StoryboardEditService.openSceneForMissingDataEdit`. The stub file is deleted. |

## Handler contracts

All handlers share this skeleton:

```ts
async function handler(args: HandlerArgs): Promise<void> {
  try {
    // 1. Resolve prompts (if any) — input box / quick pick / modal
    // 2. Delegate to StoryboardEditService
    // 3. Pattern-match on the result kind
    // 4. Surface a toast on failure (never silent per Article I.3)
  } catch (err) {
    // Unexpected only — #215 / #174 errors are pattern-matched above
    logger.error(err);
    await vscode.window.showErrorMessage(messages.storyboardEdit.unexpectedError(err));
  }
}
```

### `renameSceneHandler`

1. Inline rename is webview-driven — the handler is the **fallback
   path** when invoked from the command palette. Shows
   `window.showInputBox({ value: scene.title, prompt: 'Rename scene' })`.
2. `Escape` / empty input ⇒ no-op.
3. Delegates to `editService.renameScene`.

### `describeSceneHandler`

1. Description is webview-driven — the handler is the **fallback
   path**. Opens the edit form expanded by dispatching a
   `setSceneEditFormOpen` postMessage to the panel; returns.
2. (No `showInputBox` here — markdown editing needs the preview
   surface. Palette invocation opens the form; does not enter any
   text.)

### `deleteSceneHandler`

1. Delegates directly to `editService.deleteScene` — no confirmation
   prompt at this layer (the undo toast is the safety net).
2. On `kind: "unknown-scene"` ⇒ red toast (shouldn't happen from the
   panel; could happen from a stale command palette invocation).

### `updateToCurrentHandler`

1. Reads the current map view from the `MapPanel` via the existing
   `mapPanel.getCurrentView()` accessor (exposed by #217 for its
   capture path; reused here).
2. Delegates to `editService.updateSceneToCurrent`.
3. Pattern-match on result:
   - `"ok"` ⇒ success toast.
   - `"thumbnail-failed"` ⇒ red toast: *"Update failed — could not
     produce thumbnail. Scene not changed."* (spec UI States).
   - `"duplicate-timestamp-collision"` ⇒ modal prompt with
     Replace / Offset (+1 s) / Cancel; on Replace ⇒ call
     `editService.deleteScene` for the conflicting Scene, then
     retry this command; on Offset ⇒ retry with
     `suggestedOffsetTimestamp`; on Cancel ⇒ no-op.

### `duplicateSceneHandler`

1. Fetches source Scene timestamp; computes default offset
   (+1 s) as ISO-8601.
2. `window.showInputBox({ value: defaultOffset, prompt: 'Timestamp
   for duplicate', validateInput: isoDateTimeValidator })`.
3. Delegates to `editService.duplicateScene`.
4. On `"duplicate-timestamp-collision"` ⇒ modal Replace / Offset /
   Cancel (same pattern as above).

### `copyToOtherHandler`

1. Lists sibling Storyboards on the same plot (via the panel's
   current view model, passed through the command args).
2. `window.showQuickPick(siblings, { placeHolder: 'Destination
   storyboard' })`.
3. Delegates to `editService.copySceneToOtherStoryboard`.
4. Pattern-match:
   - `"ok"` ⇒ success toast.
   - `"duplicate-timestamp-collision"` ⇒ Replace / Offset / Cancel.
   - `"deep-copy-failed"` ⇒ red toast: *"Could not copy thumbnail.
     Scene not copied."*

### `refreshThumbnailHandler`

1. Delegates to `editService.refreshSceneThumbnail`.
2. On `"thumbnail-failed"` ⇒ red toast: *"Refresh failed — could
   not produce thumbnail. Existing thumbnail kept."*

### `refreshAllStaleHandler` (FR-EDIT-025, added per review fold-in)

1. Delegates to `editService.refreshAllStaleThumbnails`.
2. Surfaces per-Scene result in the Log Panel (each refresh emits
   its own card); surfaces a rollup confirmation toast at the end:
   *"Refreshed N scenes. (M failed — see Log Panel.)"*
3. If every Scene succeeded ⇒ green toast. If any failed ⇒ orange
   toast naming the failed count; individual failures' details live
   in the Log Panel cards.
4. No-op (with info toast) if there are no stale Scenes on the
   active Storyboard.

### `renameStoryboardHandler`

1. `window.showInputBox({ value: storyboard.name, prompt: 'Rename
   storyboard', validateInput: (v) => v.trim() === '' ? 'Name cannot
   be empty' : null })`.
2. Delegates to `editService.renameStoryboard`.
3. On `DuplicateStoryboardNameError` ⇒ re-prompt with an error
   message (repeat until user cancels or enters a unique name).

### `describeStoryboardHandler`

Analogous to `describeSceneHandler` — opens the Storyboard
description editor inside the panel header via postMessage.

## Menu contributions

```jsonc
// apps/vscode/package.json — "menus" section
{
  "commandPalette": [
    { "command": "debrief.storyboard.renameScene", "when": "debrief.storyboardActive" },
    // …one entry per command, all gated on debrief.storyboardActive
  ]
}
```

No context-menu entries are added — every edit op is reachable from
the panel's overflow menu, not from the editor or explorer context
menu. This keeps the extension's context-menu surface small.

## Keybinding contributions

**None.** Every edit op is invoked via overflow-menu click or
palette. The `Left` / `Right` keys stay owned by #217's transport,
with the `when` clause unchanged.

## Error-toast message registry

All user-facing strings live in a new
`apps/vscode/src/messages/storyboardEdit.ts` module, keyed by error
case. Messages are pure functions of their inputs:

```ts
export const storyboardEdit = {
  unexpectedError: (err: unknown): string =>
    `Storyboard edit failed: ${stringifyError(err)}`,
  updateToCurrentThumbnailFailed: (): string =>
    `Update failed — could not produce thumbnail. Scene not changed.`,
  refreshThumbnailFailed: (): string =>
    `Refresh failed — could not produce thumbnail. Existing thumbnail kept.`,
  deepCopyFailed: (): string =>
    `Could not copy thumbnail. Scene not copied.`,
  duplicateTimestampConflict: (existingSceneTitle: string): string =>
    `A scene already exists at this timestamp: "${existingSceneTitle}". Replace / Offset / Cancel.`,
  storyboardNameConflict: (existingName: string): string =>
    `A storyboard named "${existingName}" already exists. Pick a different name.`,
} as const;
```

## Test gates for this contract

- Every command must be registered exactly once (no duplicate
  registrations vs. #217's stub).
- Every command's `when` clause evaluates `false` when no plot is
  open (verified by unit test mocking the VS Code API).
- Every handler must pattern-match every non-ok result kind — the
  test harness asserts exhaustiveness via a TypeScript
  `assertNever` at the end of each `switch`.
- Every `showErrorMessage` call routes through
  `messages.storyboardEdit.*` — ESLint rule
  `no-restricted-syntax: literal strings in vscode.window.show*Message`
  enforces this at lint time.
