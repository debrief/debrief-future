# Data Model: End-to-End Workflow Tests

## Test Environment Model

The e2e test environment consists of interconnected components that together provide a browser-automatable VS Code instance running the Debrief extension with sample data.

```
┌─────────────────────────────────────────────────────┐
│  Docker Container (CI) or Local (Dev)               │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ code-server   │    │  Python Services          │   │
│  │ (VS Code web) │    │  ├── debrief-io           │   │
│  │               │◄───│  ├── debrief-stac         │   │
│  │  Debrief Ext  │    │  └── debrief-calc         │   │
│  └──────┬───────┘    └──────────────────────────┘   │
│         │ :8080                                      │
└─────────┼───────────────────────────────────────────┘
          │ HTTP
┌─────────┼───────────────────────────────────────────┐
│  Playwright Test Runner                              │
│         │                                            │
│  ┌──────▼───────┐                                   │
│  │   Browser     │                                   │
│  │  (Chromium)   │                                   │
│  │               │                                   │
│  │  ┌─────────────────────────────────┐             │
│  │  │ VS Code Web UI (DOM)            │             │
│  │  │  ┌───────────────────────────┐  │             │
│  │  │  │ iframe.webview.ready      │  │             │
│  │  │  │  ┌─────────────────────┐  │  │             │
│  │  │  │  │ #active-frame       │  │  │             │
│  │  │  │  │  ┌───────────────┐  │  │  │             │
│  │  │  │  │  │ Debrief       │  │  │  │             │
│  │  │  │  │  │ Components    │  │  │  │             │
│  │  │  │  │  │ (map, catalog)│  │  │  │             │
│  │  │  │  │  └───────────────┘  │  │  │             │
│  │  │  │  └─────────────────────┘  │  │             │
│  │  │  └───────────────────────────┘  │             │
│  │  └─────────────────────────────────┘             │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

## Entity Descriptions

### Test Environment

| Property | Type | Description |
|----------|------|-------------|
| mode | "docker" or "local" | Whether code-server runs in Docker or locally |
| base_url | string | URL to access code-server (default: `http://localhost:8080`) |
| workspace_path | string | Absolute path to the test workspace inside code-server |
| extension_vsix | string | Path to the packaged Debrief extension |
| auth | "none" | Authentication mode (always none for testing) |

### Test Workspace

| Property | Type | Description |
|----------|------|-------------|
| samples/ | directory | REP files for test scenarios (symlinks to io fixtures) |
| .vscode/settings.json | file | Extension configuration (catalog location, default tool settings) |
| catalog/ | directory | Pre-initialised STAC catalog (or created fresh per test) |

### Page Object: CodeServerPage

Encapsulates VS Code chrome interactions.

| Method | Description |
|--------|-------------|
| `waitForReady()` | Wait for VS Code to fully load (extensions activated) |
| `openFile(path)` | Open a file in the editor via explorer or command palette |
| `executeCommand(command)` | Trigger a VS Code command via command palette |
| `getNotifications()` | Read notification messages from VS Code's notification area |
| `getWebviewFrame(title)` | Access a webview panel's iframe by panel title |

### Page Object: DebriefWebview

Encapsulates Debrief webview component interactions. Operates within the nested iframe context.

| Method | Description |
|--------|-------------|
| `waitForMapReady()` | Wait for Leaflet map to initialise inside the webview |
| `getTrackCount()` | Count visible track features on the map |
| `selectTrack(name)` | Click a track feature to select it |
| `getCatalogEntries()` | List items in the STAC catalog panel |
| `getFeatureCount(plotId)` | Get feature count for a specific plot |
| `verifyProvenance(featureId)` | Check provenance chain for a feature |

### Iframe Hierarchy

VS Code webviews use a two-level iframe nesting:

| Level | Selector | Content |
|-------|----------|---------|
| 0 | `page` | VS Code main window (editor, sidebar, panels) |
| 1 | `iframe.webview.ready` | Outer webview container (VS Code managed) |
| 2 | `#active-frame` | Inner content frame (Debrief React components) |

**Access pattern**:
```
page.frameLocator("iframe.webview.ready").frameLocator("#active-frame")
```

## Data Flow Under Test

| Step | User Action | Extension Code | Python Service | Observable Result |
|------|-------------|----------------|----------------|-------------------|
| 1 | Open REP file | File watcher triggers parse | io.parse() | Editor shows file |
| 2 | — | Extension stores features | stac.add_features() | Catalog panel updates |
| 3 | — | Extension renders map | — | Map shows track lines |
| 4 | Select track | Click handler in webview | — | Track highlighted |
| 5 | Run tool | Command palette / context menu | calc.run() | — |
| 6 | — | Extension stores results | stac.add_features() | Catalog feature count increases |
| 7 | — | Extension renders results | — | Map shows analysis overlay |
