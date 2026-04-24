# Contract: VS Code command + keybinding contributions

**Feature**: 217-storyboarding-playback
**File**: `apps/vscode/package.json` (contributes section)
**Status**: Language-neutral contract. Each command has a 1:1 handler
under `apps/vscode/src/commands/` with a matching unit test.

> All strings shown here are displayed literals. User-facing strings
> route through the extension's `messages.ts` pattern for
> internationalisation (Article XI).

---

## 1. Command contributions

Added to `contributes.commands[]`:

| Command ID | Title | Handler file |
|---|---|---|
| `debrief.storyboard.forward` | `Storyboard: Forward` | `commands/storyboardTransport.ts#forward` |
| `debrief.storyboard.backward` | `Storyboard: Backward` | `commands/storyboardTransport.ts#backward` |
| `debrief.storyboard.clickScene` | *(hidden)* | `commands/storyboardTransport.ts#clickScene` |
| `debrief.storyboard.jumpPast` | *(hidden)* | `commands/storyboardTransport.ts#jumpPast` |
| `debrief.storyboard.editScene` | *(hidden)* | `commands/storyboardEditStub.ts#open` |
| `debrief.storyboard.create` | `Storyboard: Create…` | `commands/storyboardManagement.ts#create` |
| `debrief.storyboard.rename` | `Storyboard: Rename…` | `commands/storyboardManagement.ts#rename` |
| `debrief.storyboard.delete` | `Storyboard: Delete…` | `commands/storyboardManagement.ts#delete` |
| `debrief.storyboard.openPanel` | `Storyboard: Open Panel` | `views/storyboardPanelView.ts#reveal` |

`*(hidden)*` commands omit `title` or use an internal-only title
(VS Code hides them from the Command Palette via `command-palette`
menu filter below).

---

## 2. `menus.commandPalette` filter

```json
{
  "menus": {
    "commandPalette": [
      { "command": "debrief.storyboard.clickScene", "when": "false" },
      { "command": "debrief.storyboard.jumpPast",   "when": "false" },
      { "command": "debrief.storyboard.editScene",  "when": "false" },
      { "command": "debrief.storyboard.forward",    "when": "debrief.storyboardActive" },
      { "command": "debrief.storyboard.backward",   "when": "debrief.storyboardActive" }
    ]
  }
}
```

`create` / `rename` / `delete` / `openPanel` are visible unconditionally
in the palette (they are discoverable entry points).

---

## 3. Keybinding contributions

Appended to `contributes.keybindings[]`:

```json
[
  {
    "command": "debrief.storyboard.forward",
    "key": "right",
    "when": "debrief.storyboardActive && (debrief.mapFocused || focusedView == 'debrief.storyboardPanel')"
  },
  {
    "command": "debrief.storyboard.backward",
    "key": "left",
    "when": "debrief.storyboardActive && (debrief.mapFocused || focusedView == 'debrief.storyboardPanel')"
  }
]
```

No `mac` override — Left / Right arrows are the same key on all
platforms, and the `when` clause guarantees scope.

### `debrief.storyboardActive` context

- Owner: `StoryboardPlaybackService`
- Set `true` iff the service's current `TransportState` has
  `sceneOrder.length > 0` (i.e. the active Storyboard contains at
  least one Scene).
- Cleared on plot-close, on dropdown-switch-to-null, on deletion of
  the last Scene (empty active Storyboard), on deletion of the last
  Storyboard, or on service dispose.
- Set via `commands.executeCommand('setContext', 'debrief.storyboardActive', …)`.

---

## 4. Handler contracts

### 4.1 `storyboardTransport.ts`

```ts
export function registerStoryboardTransportCommands(
  context: vscode.ExtensionContext,
  service: StoryboardPlaybackService,
  sessionManager: SessionManager,
): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.commands.registerCommand('debrief.storyboard.forward', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      await service.forward(documentUri);
    }),

    vscode.commands.registerCommand('debrief.storyboard.backward', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      await service.backward(documentUri);
    }),

    vscode.commands.registerCommand('debrief.storyboard.clickScene', async (sceneId: string) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri || typeof sceneId !== 'string') return;
      await service.goToScene(documentUri, sceneId);
    }),

    vscode.commands.registerCommand('debrief.storyboard.jumpPast', async (payload: { blockedSceneId: string; direction: 'forward' | 'backward' }) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      await service.resolveHardBlockByJumpingPast(documentUri, payload.blockedSceneId, payload.direction);
    }),
  );
}
```

### 4.2 `storyboardManagement.ts`

```ts
export function registerStoryboardManagementCommands(
  context: vscode.ExtensionContext,
  service: StoryboardPlaybackService,
  sessionManager: SessionManager,
): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.commands.registerCommand('debrief.storyboard.create', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      const name = await vscode.window.showInputBox({
        prompt: messages.createStoryboardPrompt,
        validateInput: (value) => validateStoryboardName(value, service.getSnapshot(documentUri).storyboards),
      });
      if (!name) return;
      await service.createStoryboard(documentUri, name);
    }),

    vscode.commands.registerCommand('debrief.storyboard.rename', async (targetId?: string) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      const snapshot = service.getSnapshot(documentUri);
      const storyboardId = targetId ?? snapshot.activeStoryboardId;
      if (!storyboardId) return;
      const current = snapshot.storyboards.find((s) => s.storyboardId === storyboardId);
      if (!current) return;
      const newName = await vscode.window.showInputBox({
        prompt: messages.renameStoryboardPrompt,
        value: current.name,
        validateInput: (value) => validateStoryboardName(value, snapshot.storyboards, current.storyboardId),
      });
      if (!newName || newName === current.name) return;
      await service.renameStoryboard(documentUri, storyboardId, newName);
    }),

    vscode.commands.registerCommand('debrief.storyboard.delete', async (targetId?: string) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      const snapshot = service.getSnapshot(documentUri);
      const storyboardId = targetId ?? snapshot.activeStoryboardId;
      if (!storyboardId) return;
      const target = snapshot.storyboards.find((s) => s.storyboardId === storyboardId);
      if (!target) return;

      if (target.sceneCount > 0) {
        const choice = await vscode.window.showWarningMessage(
          messages.deleteStoryboardConfirm(target.name, target.sceneCount),
          { modal: true },
          messages.deleteLabel,
        );
        if (choice !== messages.deleteLabel) return;
      }
      await service.deleteStoryboard(documentUri, storyboardId);
    }),
  );
}
```

### 4.3 `storyboardEditStub.ts`

```ts
export function registerStoryboardEditStubCommand(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
  service: StoryboardPlaybackService,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'debrief.storyboard.editScene',
    (sceneId: string) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri || typeof sceneId !== 'string') return;
      const snapshot = service.getSnapshot(documentUri);
      const scene = snapshot.scenes.find((s) => s.sceneId === sceneId);
      if (!scene) return;
      void vscode.window.showInformationMessage(
        messages.editSceneStub(scene.title, scene.timestampIso),
      );
    },
  );
}
```

Replaced by a full editor surface in #218.

---

## 5. `validateStoryboardName` helper

```ts
export function validateStoryboardName(
  candidate: string,
  existing: readonly StoryboardOptionViewModel[],
  ignoreId?: string,
): string | null {
  const trimmed = candidate.trim();
  if (trimmed.length === 0) return messages.nameEmpty;
  if (trimmed.length > 120)  return messages.nameTooLong;
  const collision = existing.find(
    (s) => s.name === trimmed && s.storyboardId !== ignoreId,
  );
  if (collision) return messages.nameInUse(trimmed);
  return null;
}
```

Inline-validation strings shown in VS Code's `showInputBox` — no modal
rejection needed.

---

## 6. Testing contract

| Test name | Asserts |
|---|---|
| `forward advances to next scene on happy path` | snapshot updates; `transitionId` briefly non-null; `timeFilter` clamped |
| `forward is no-op at last scene` | snapshot unchanged; no `flyTo` call |
| `forward is no-op during in-flight transition` | snapshot unchanged |
| `forward surfaces hard-block modal when next scene has missing features` | `ModalPromptPort.showHardBlock` called; snapshot unchanged until resolution |
| `backward mirrors forward` | same as forward, in reverse |
| `clickScene triggers goToScene via command` | service.goToScene called with correct args |
| `create → CRUD success → selection becomes the new Storyboard` | service.createStoryboard + snapshot change |
| `rename → validateStoryboardName rejects duplicate` | showInputBox.validateInput returns the `messages.nameInUse` string; CRUD not invoked |
| `delete empty Storyboard skips confirmation` | no showWarningMessage call; service.deleteStoryboard invoked |
| `delete non-empty Storyboard requires confirmation` | showWarningMessage called; service invoked iff user clicks *Delete* |
| `editScene stub surfaces details toast` | showInformationMessage called with title + DTG |
