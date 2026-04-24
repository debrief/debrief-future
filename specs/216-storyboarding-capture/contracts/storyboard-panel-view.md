# Contract: Storyboard Panel View

**Feature**: 216-storyboarding-capture
**Status**: Language-neutral contract. Drives `apps/vscode/src/views/storyboardPanelView.ts`, `apps/vscode/src/webview/web/storyboardPanel.tsx`, and `shared/components/src/panels/StoryboardPanel/`.

## 1. VS Code view contribution

### `views` contribution (`apps/vscode/package.json`)

```jsonc
"views": {
  "debrief": [
    {
      "id": "debrief.storyboardPanel",
      "name": "Storyboard",
      "type": "webview",
      "when": "debrief.plotOpen",
      "icon": "$(device-camera-video)"
    }
  ]
}
```

The view is contributed to the existing `debrief` view container
(left sidebar, shared with Log Panel, STAC browser, Time
Controller). `when: "debrief.plotOpen"` keeps the view hidden until
a plot is open; context key already managed by `extension.ts`.

The view id `debrief.storyboardPanel` is stable — #217 extends this
same provider rather than registering a new view.

## 2. Extension-side provider

```ts
// apps/vscode/src/views/storyboardPanelView.ts

export class StoryboardPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "debrief.storyboardPanel";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly sessionManager: SessionManager,
    private readonly sessionStore: SessionStoreApi,
    private readonly mapPanel: MapPanel,
  ) {}

  resolveWebviewView(
    view: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void>;

  /** Called by captureScene command after a new Scene lands. */
  refresh(): void;

  /** Called by captureScene to toggle pending-row state. */
  setCaptureInFlight(inFlight: boolean): void;
}
```

**Lifecycle**:

- `resolveWebviewView` is called by VS Code the first time the view
  becomes visible (or after `debrief.storyboardPanel.focus`).
- The provider sets `view.webview.options.enableScripts = true` and
  builds the HTML shell (matches `logPanelView.ts` line-by-line for
  nonce generation + CSP).
- On webview `'ready'` message, the provider computes the initial
  `{type: 'scenes'}` payload and posts it.
- On `SessionManager` plot-change events, the provider recomputes
  and reposts.
- On `refresh()` (called by the capture command), the provider
  recomputes the scene list from the current plot and posts.

**Active-storyboard resolution for the view**:

```ts
private computeActiveStoryboardId(plot: Plot | null): string | null {
  if (!plot) return null;
  const sb = getActiveStoryboardDefault(plot);
  return sb?.properties.id ?? null;
}
```

The panel shows Scenes for the currently active Storyboard only.
Multi-Storyboard dropdown belongs to #217.

## 3. Extension → Webview messages

```ts
export type ExtensionMessage =
  | {
      type: "scenes";
      scenes: SceneRowViewModel[];               // ordered by timestamp asc
      activeStoryboardName: string | null;
      activeStoryboardId: string | null;
    }
  | {
      type: "captureInFlight";
      inFlight: boolean;
    }
  | {
      type: "theme";
      theme: "light" | "dark" | "vscode";         // routed from ThemeProvider
    };
```

`SceneRowViewModel` defined in
[data-model.md §4](../data-model.md#4-scenerowviewmodel-panel-webview-boundary).

## 4. Webview → Extension messages

```ts
export type WebviewMessage =
  | { type: "ready" }                             // post on React mount
  | { type: "capture-clicked" }                   // "Capture" button
  | { type: "scene-row-clicked"; sceneId: string } // #216 logs only; #217 will flyTo
  | { type: "log"; level: "debug" | "warn" | "error"; message: string };
```

Messages use VS Code's standard `postMessage` + `onDidReceiveMessage`
channels. No payload carries a raw filesystem path (Article X).

`capture-clicked` causes the provider to invoke
`vscode.commands.executeCommand('debrief.captureScene')` — the same
entry point as the keybinding. Because the command itself re-checks
`debrief.mapFocused`, pressing the panel button while the map is
not focused is a no-op with the same `cancelled / rejected` logic
as the keybinding (the button is disabled in CSS when
`debrief.mapFocused === false` — via the `when` clause on the
`view/title` menu contribution).

## 5. Webview entry point

```ts
// apps/vscode/src/webview/web/storyboardPanel.tsx

import { StoryboardPanel } from "@debrief/components";

declare const acquireVsCodeApi: () => { postMessage: (msg: WebviewMessage) => void };

const vscode = acquireVsCodeApi();

function sendMessage(msg: WebviewMessage): void {
  vscode.postMessage(msg);
}

const Root: React.FC = () => {
  const [scenes, setScenes] = React.useState<SceneRowViewModel[]>([]);
  const [activeStoryboardName, setActiveStoryboardName] =
    React.useState<string | null>(null);
  const [captureInFlight, setCaptureInFlight] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark" | "vscode">("vscode");

  React.useEffect(() => {
    const onMessage = (evt: MessageEvent<ExtensionMessage>) => {
      switch (evt.data.type) {
        case "scenes":
          setScenes(evt.data.scenes);
          setActiveStoryboardName(evt.data.activeStoryboardName);
          break;
        case "captureInFlight":
          setCaptureInFlight(evt.data.inFlight);
          break;
        case "theme":
          setTheme(evt.data.theme);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    sendMessage({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <StoryboardPanel
        scenes={scenes}
        activeStoryboardName={activeStoryboardName}
        captureInFlight={captureInFlight}
        onCaptureClick={() => sendMessage({ type: "capture-clicked" })}
        onSceneRowClick={(sceneId) =>
          sendMessage({ type: "scene-row-clicked", sceneId })
        }
      />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
```

## 6. React component contract (`@debrief/components` → `StoryboardPanel`)

```ts
export interface StoryboardPanelProps {
  /** Ordered by timestampIso ascending. Empty when no active Storyboard. */
  scenes: SceneRowViewModel[];
  /** Header label. Empty state when null. */
  activeStoryboardName: string | null;
  /** When true, renders a pending row with spinner + placeholder thumb. */
  captureInFlight: boolean;
  /** Fires on the "Capture" button in the panel toolbar. */
  onCaptureClick(): void;
  /** Fires on row click; #216 hosts log only. */
  onSceneRowClick(sceneId: string): void;
}

export const StoryboardPanel: React.FC<StoryboardPanelProps>;
```

### States

| State | Condition | Rendering |
|---|---|---|
| **Empty (no Storyboard)** | `activeStoryboardName === null` | Centred copy: "No Storyboards yet. Press Ctrl/Cmd+Alt+C on the map to capture your first Scene." |
| **Empty Storyboard** | Active Storyboard present, `scenes.length === 0` | Header shows Storyboard name; body shows "No Scenes yet" |
| **Populated** | `scenes.length > 0` | Header shows Storyboard name + Scene count; body scrolls a list of `<SceneRow/>` |
| **Capturing** | `captureInFlight === true` | Prepends a pending row with a spinner + "Capturing…" caption above existing rows |

### Accessibility

- Each scene row has `role="listitem"`, `aria-label="{dtgLabel} — {title}"`, and a `data-testid="scene-row"`.
- Capture button has `aria-label="Capture scene"` and `data-testid="capture-button"`.
- Panel root has `data-testid="storyboard-panel"` for E2E selectors.

### Theming

- Uses `vscrui` icons + `ThemeProvider` tokens (light / dark / vscode).
- Thumbnail rendered as plain `<img>` with `loading="lazy"` and
  explicit `width/height` attrs from the fixed 200×150 small-
  thumbnail size.
- No custom CSS outside of the existing `panels.css` token set.

## 7. Test matrix

### Unit tests — `StoryboardPanel.test.tsx`

| Test | Covers |
|---|---|
| `renders empty-state copy when activeStoryboardName is null` | Empty (no Storyboard) |
| `renders empty-Storyboard copy when scenes is empty but name is set` | Empty Storyboard |
| `renders one row per scene in timestamp order` | Populated rendering + ordering |
| `renders pending row when captureInFlight is true` | Capturing state |
| `clicking capture button invokes onCaptureClick` | Capture wiring |
| `clicking a scene row invokes onSceneRowClick with sceneId` | Row wiring |
| `each row renders thumbnail, DTG label, and timestamp title` | Visual contract |
| `scene row has aria-label and data-testid` | Accessibility |

### Storybook stories — `StoryboardPanel.stories.tsx`

| Story | Purpose |
|---|---|
| `Empty` | No active Storyboard (first-capture invitation copy) |
| `EmptyStoryboard` | Active Storyboard, no Scenes yet |
| `WithOneScene` | Single Scene row |
| `WithThreeScenes` | Three rows, ascending timestamp |
| `Capturing` | Pending row + three rows (demonstrates in-flight UI) |

### Storybook E2E tests — `shared/components/e2e/StoryboardPanel.spec.ts`

See [plan.md § Storybook E2E Testing](../plan.md#storybook-e2e-testing).

## 8. #217 / #218 extension points

The shape stays stable for later specs:

| Future need | How this contract accommodates |
|---|---|
| Multi-Storyboard dropdown (#217) | Provider adds a `{type: 'storyboards', …}` message + the React component gains an optional `storyboards` prop + `onSelectStoryboard` handler. No breaking change to existing prop names. |
| Transport (Play / Pause / step) (#217) | New message types + new React subcomponents. Existing `SceneRow` unchanged. |
| On-map rectangle overlay (#217) | Implemented in `MapPanel`, not in this panel — orthogonal extension. |
| Stale indicator (#218) | `SceneRowViewModel.state` already has a discriminated union; add `"stale"` variant. |
| Overflow menu (create / rename / delete Storyboard) (#217) | Menu contribution on the view; new webview button; new messages. |

Every one of these is an **additive** change to the contracts
above — nothing in #216's shape blocks them.