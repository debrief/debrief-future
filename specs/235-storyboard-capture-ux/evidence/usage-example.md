# Usage Example — Storyboard Capture & Maintenance UX (#235)

This walkthrough demonstrates the user-visible behaviour shipped in this PR. The full quickstart (`quickstart.md` §1-§4) covers the spec-complete behaviour; what's marked **(deferred)** below is implemented at the code layer but not yet exposed in the default UI.

## VS Code (Phase 6 — fully shipped)

### 1. First capture in VS Code

**Before this spec**:
1. Press `Ctrl/Cmd+Alt+C`.
2. A quick-pick opens at the top of the window asking for the Storyboard name. **The map and time controller are occluded.**
3. Type a name, press Enter.
4. Quick-pick closes; the Scene appears in the panel.

**After this spec**:
1. Press `Ctrl/Cmd+Alt+C` (or click Capture Scene in the empty Storyboard panel).
2. The Storyboard panel auto-focuses and an inline naming row appears **inside the panel**. The map and time controller stay fully visible and operable.
3. Type a name. While typing, you can pan the map or nudge the playhead — the Scene's viewport / timestamp will track the latest values when you confirm.
4. Press Enter (or click Confirm). The naming row disappears; one Storyboard + one Scene Feature are persisted via #215's CRUD module; the panel re-renders with the new Scene row.

### 2. Duplicate-timestamp resolution in VS Code

**Before this spec**:
1. Press `Ctrl/Cmd+Alt+C` while the playhead is on an existing Scene's timestamp.
2. A modal dialog with `[Replace]` `[Offset (+1 s)]` `[Cancel]` opens at the centre of the window. **The map is occluded.**
3. Pick a button.

**After this spec**:
1. Press `Ctrl/Cmd+Alt+C`. The capture command's `createScene` call hits a `DuplicateTimestampError`.
2. An inline collision banner appears **above the conflicting Scene row in the panel**. Three buttons are visible: Replace / Offset (+1 s) / Cancel.
3. The map and time controller remain operable while the banner is up. Pan, zoom, scrub freely.
4. Pick a button. Replace deletes the conflicting Scene + retries; Offset advances the timestamp by 1 s and re-checks (FR-CAP-017a hides the Offset button when the next attempt would push past the plot's time range); Cancel aborts.

### 3. SC-009 — legacy elements removed

`grep showInputBox apps/vscode/src/commands/captureScene.ts` returns nothing. `grep showInformationMessage` ditto. The `'Replace'` / `'Offset (+1 s)'` modal arguments are also absent. The `captureScene.legacy-removal.test.ts` enforces this on every CI run.

## Web-shell (Phase 3 — production code shipped, gated UI)

### Prerequisite: enable the rail

Web-shell users open the Analysis view at `/?storyboardPanel=1` to see the storyboard rail on the right side. The default `/` URL is unchanged — existing tests + workflows are not disturbed by the new mount.

### 1. First capture

1. Navigate to `/?storyboardPanel=1` and double-click an exercise from the catalog.
2. The Analysis view loads with the storyboard rail visible on the right (360 px wide).
3. The rail shows the empty-state "No storyboards yet" header and a primary `[Capture Scene]` button.
4. Click Capture Scene. An inline naming row appears in the rail with the input auto-focused.
5. Type a name, press Enter. A FR-WEB-029a session-only badge appears in the rail header (warning that captures persist only for this tab — web-shell has no STAC write path yet, see #236). The Scene row appears below.

### 2. Duplicate-timestamp resolution

Same as VS Code — the host-driven naming row + collision banner are implemented in the `WebPanelHost` (the browser sibling of VS Code's `StoryboardPanelViewProvider`).

### 3. Maintenance ops (Phase 4 — handler bag wired)

The wired handlers in `apps/web-shell/src/handlers/storyboardHandlers.ts` cover:
- Rename a Scene title (in-row form → `updateScene`)
- Edit a Scene description (in-row form → `updateScene`)
- Delete a Scene (→ `deleteScene` + buffer for undo)
- Undo delete (→ `restoreScene` against the buffered snapshot)
- Refresh thumbnail (→ `captureSceneThumbnail` against the live `.leaflet-container`)
- Rename a Storyboard (→ `renameStoryboard`)
- Edit a Storyboard description (→ `describeStoryboard`)
- Delete a Storyboard with cascade (→ `deleteStoryboard`)

**(Deferred — additional UI needed)**:
- Update-to-current (re-capture viewport + timestamp + thumbnail)
- Duplicate at a new timestamp
- Copy to another Storyboard
- Create a new Storyboard via the overflow menu
- Active-Storyboard switching via the header dropdown
- Cascade-undo for delete-with-cascade

## Cross-host parity

Both hosts mount the **same** `StoryboardPanel` React component from `@debrief/components`. The VS Code host pushes state via `postMessage` and runs the resolver Promises on its `StoryboardPanelViewProvider`. The web-shell host uses the in-memory `WebPanelHost` and React's `useSyncExternalStore` to push the same state shape. Visual identity is structural — the panel renders identically modulo each host's CSS theme tokens.

The same `assertViewportControlsRemainAccessible(page)` Playwright helper exists in `apps/web-shell/playwright/helpers/viewport-invariants.ts` and is callable from both web-shell and (per the plan) the Storybook E2E run that validates the VS Code render.
