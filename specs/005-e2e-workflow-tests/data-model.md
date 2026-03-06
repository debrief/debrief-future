# Data Model: End-to-End Workflow Tests

**Revised**: 2026-03-06 — Updated for dual-platform test architecture

## Dual-Platform Test Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  PLATFORM 1: Web-Shell (Fast Feedback)                        │
│                                                                │
│  ┌──────────────┐    ┌──────────────────────────┐             │
│  │ Vite Dev     │    │  Mock Services            │             │
│  │ Server       │    │  ├── Mock STAC data       │             │
│  │              │◄───│  ├── Mock calc results    │             │
│  │  React App   │    │  └── Fixture GeoJSON      │             │
│  └──────┬───────┘    └──────────────────────────┘             │
│         │ :5173                                                │
│  ┌──────▼───────┐                                             │
│  │ Playwright   │  13 spec files, 81+ tests                   │
│  └──────────────┘                                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  PLATFORM 2: VS Code E2E (True End-to-End)                    │
│                                                                │
│  Docker Container (CI) or Local (Dev)                          │
│  ┌──────────────┐    ┌──────────────────────────┐             │
│  │ openvscode/  │    │  Real Python Services     │             │
│  │ code-server  │    │  ├── debrief-io           │             │
│  │              │◄───│  ├── debrief-stac         │             │
│  │  Debrief Ext │    │  └── debrief-calc         │             │
│  └──────┬───────┘    └──────────────────────────┘             │
│         │ :8080                                                │
└─────────┼──────────────────────────────────────────────────────┘
          │ HTTP
┌─────────┼──────────────────────────────────────────────────────┐
│  Playwright Test Runner                                        │
│  ┌──────▼───────┐                                             │
│  │   Chromium   │  8 spec files → expanding to 13+            │
│  │  ┌───────────────────────────────────────────┐             │
│  │  │ VS Code Web UI                            │             │
│  │  │  ┌─────────────────────────────────────┐  │             │
│  │  │  │ iframe.webview.ready                │  │             │
│  │  │  │  ┌───────────────────────────────┐  │  │             │
│  │  │  │  │ #active-frame                 │  │  │             │
│  │  │  │  │  ┌─────────────────────────┐  │  │  │             │
│  │  │  │  │  │ Debrief Components      │  │  │  │             │
│  │  │  │  │  │ (map, catalog, tools)   │  │  │  │             │
│  │  │  │  │  └─────────────────────────┘  │  │  │             │
│  │  │  │  └───────────────────────────────┘  │  │             │
│  │  │  └─────────────────────────────────────┘  │             │
│  │  └───────────────────────────────────────────┘             │
│  └──────────────┘                                             │
└────────────────────────────────────────────────────────────────┘
```

## Entity Descriptions

### Web-Shell Test Environment

| Property | Type | Description |
|----------|------|-------------|
| server | Vite dev server | Built-in dev server from `apps/web-shell` |
| base_url | string | `http://localhost:5173` (default) |
| data_source | mock fixtures | Pre-configured mock STAC catalog + GeoJSON |
| runner | `run-playwright.mjs` | Chromium extraction for sandboxed environments |

### VS Code E2E Test Environment

| Property | Type | Description |
|----------|------|-------------|
| mode | "docker" or "local" | Docker for CI; local openvscode-server for dev |
| server | openvscode-server or code-server | Resolution order in `global-setup.ts` |
| base_url | string | `http://localhost:8080` (default) |
| workspace_path | string | `tests/e2e/test-workspace/` |
| extension_vsix | string | Built from `apps/vscode/` |
| python_services | real | debrief-io, debrief-stac, debrief-calc installed in virtualenv |
| auth | "none" | No authentication for testing |

### Test Workspace

| Property | Type | Description |
|----------|------|-------------|
| samples/ | directory | Real REP files: boat1.rep, boat2.rep, malformed.rep |
| local-store/ | directory | Pre-built STAC catalog with exercise-alpha and training-run-1 |
| local-store/catalog.json | file | Root STAC catalog referencing sample plots |

### Page Object: CodeServerPage

Encapsulates VS Code chrome interactions. Located at `tests/e2e/models/code-server-page.ts`.

| Method | Description |
|--------|-------------|
| `waitForReady()` | Wait for VS Code to fully load (extensions activated) |
| `openFile(path)` | Open a file via explorer or command palette |
| `executeCommand(command)` | Trigger a VS Code command via command palette |
| `getNotifications()` | Read notification messages from VS Code's notification area |
| `getWebviewFrame(title)` | Access a webview panel's iframe by panel title |

### Webview Access Helpers

Located at `tests/e2e/helpers/webview-injector.ts`.

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

### Web-Shell (mock data path)

| Step | User Action | Component | Data Source | Observable Result |
|------|-------------|-----------|-------------|-------------------|
| 1 | Browse catalog | CatalogOverview | Mock STAC fixtures | Timeline entries displayed |
| 2 | Open plot | AnalysisView | Mock GeoJSON | Map shows track features |
| 3 | Select track | FeatureList | Session state | Track highlighted on map |
| 4 | Run tool | ToolPanel | Mock calc result | Result message displayed |

### VS Code E2E (real service path)

| Step | User Action | Extension Code | Python Service | Observable Result |
|------|-------------|----------------|----------------|-------------------|
| 1 | Open REP file | File watcher triggers | io.parse(boat1.rep) | Editor shows file |
| 2 | — | Store features | stac.add_features() | STAC catalog updated |
| 3 | — | Render map | — | Map shows real track lines |
| 4 | Select track | Webview click handler | — | Track highlighted |
| 5 | Run tool | Command palette | calc.run() | — |
| 6 | — | Store results | stac.add_features() | Feature count increases |
| 7 | — | Render results | — | Map shows analysis overlay |

## Spec File Category Mapping

| # | Web-Shell Spec | VS Code E2E Spec | Status |
|---|---------------|-------------------|--------|
| 1 | catalog-browse.spec.ts | test-load-display.spec.ts | Exists (has .skip) |
| 2 | plot-load.spec.ts | test-load-display.spec.ts | Exists (has .skip) |
| 3 | tool-execution.spec.ts | test-analysis-tool.spec.ts | Exists (has .skip) |
| 4 | selection-sync.spec.ts | (to create) | Planned |
| 5 | time-controller.spec.ts | (to create) | Planned |
| 6 | drawing.spec.ts | (to create) | Planned |
| 7 | tune-prov.spec.ts | test-tune-prov.spec.ts | Exists (has .skip) |
| 8 | capture-log-evidence.spec.ts | (to create) | Planned |
| 9 | event-log-propagation.spec.ts | (to create) | Planned |
| 10 | log-edit-face.spec.ts | (to create) | Planned |
| 11 | log-panel.spec.ts | (to create) | Planned |
| 12 | styling-tools.spec.ts | (to create) | Planned |
| 13 | undo-redo-split.spec.ts | (to create) | Planned |
