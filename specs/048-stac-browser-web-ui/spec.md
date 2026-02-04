# Spec 048: STAC Browser Web UI (Integration Test Shell)

**Status**: draft
**Backlog Item**: 048 (Feature)
**Complexity**: Medium (Sonnet)

## Problem

Reviewing cross-cutting integration between UI components (STAC browser, map panel, activity panel) requires launching VS Code, which has slow iteration cycles. There is no way to:

1. Review component integration in a browser
2. Run Playwright tests against the integrated UI
3. Verify the message protocol and state synchronization work correctly

## Goal

Create a standalone web application that hosts the same UI components used in VS Code, backed by mock services. This provides:

1. **Browser-based review** — load STAC catalog, select plot, see it in map, interact with activity panel
2. **Playwright testability** — full E2E tests against integrated components
3. **Architecture validation** — mock services implement the same APIs, validating contracts

The web shell is **not** a production alternative to VS Code — it's a development/testing tool.

## Design Principles

1. **Same components** — reuse actual webview code, not reimplementations
2. **Valid APIs** — mocks implement real service interfaces, just with static/in-memory data
3. **No IO service** — skip REP import; load GeoJSON directly from mock STAC
4. **Mock tools** — 2-3 simple JS tools demonstrating the tool execution flow
5. **Message bridge abstraction** — decouple from `acquireVsCodeApi()` so same code works in both environments

## Architecture

### Message Bridge Abstraction

Create an interface that abstracts VS Code's webview API:

```typescript
// shared/components/src/MessageBridge/types.ts
interface MessageBridge {
  postMessage(msg: WebviewToHostMessage): void;
  onMessage(handler: (msg: HostToWebviewMessage) => void): () => void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

// VS Code implementation
class VsCodeMessageBridge implements MessageBridge {
  private vscode = acquireVsCodeApi();
  // ... delegates to vscode API
}

// Web implementation
class WebMessageBridge implements MessageBridge {
  private state: unknown;
  private handlers: Set<(msg: HostToWebviewMessage) => void>;
  // ... uses in-memory state, direct function calls
}
```

The existing webview code (`map.ts`, activity panel) gets refactored to accept a `MessageBridge` instead of calling `acquireVsCodeApi()` directly.

### Web Shell Structure

```
apps/web-shell/
├── index.html              # Entry point
├── src/
│   ├── main.tsx            # React app entry
│   ├── App.tsx             # Shell layout (sidebar + main area)
│   ├── components/
│   │   ├── StacBrowser.tsx # Tree view of mock catalog
│   │   └── Shell.tsx       # Orchestrates panels
│   ├── mocks/
│   │   ├── stacService.ts  # Mock StacService with static data
│   │   ├── calcService.ts  # Mock CalcService with JS tools
│   │   └── fixtures/       # Static STAC catalog + GeoJSON
│   │       ├── catalog.json
│   │       ├── sample-plot/
│   │       │   ├── item.json
│   │       │   └── data.geojson
│   │       └── another-plot/
│   │           ├── item.json
│   │           └── data.geojson
│   ├── services/
│   │   ├── webHost.ts      # "Extension host" equivalent for web
│   │   └── messageBridge.ts
│   └── store/              # Reuses @debrief/session-state
├── playwright/
│   ├── playwright.config.ts
│   └── tests/
│       ├── catalog-browse.spec.ts
│       ├── plot-load.spec.ts
│       ├── selection-sync.spec.ts
│       └── tool-execution.spec.ts
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Mock Services

#### Mock StacService

Implements the same interface as the real `StacService` but reads from bundled fixtures:

```typescript
// apps/web-shell/src/mocks/stacService.ts
import catalogData from './fixtures/catalog.json';
import samplePlotItem from './fixtures/sample-plot/item.json';
import samplePlotData from './fixtures/sample-plot/data.geojson';

class MockStacService {
  async listCatalogs(store: StacStore): Promise<Catalog[]> {
    // Return static catalog list
  }

  async listItems(store: StacStore, catalog: Catalog): Promise<StacItemSummary[]> {
    // Return items from fixtures
  }

  async loadPlotData(store: StacStore, itemPath: string): Promise<PlotData | null> {
    // Return GeoJSON from fixtures
  }
}
```

#### Mock CalcService

Provides 2-3 simple tools implemented in JavaScript:

```typescript
// apps/web-shell/src/mocks/calcService.ts
const mockTools: Tool[] = [
  {
    id: 'track-length',
    name: 'Track Length',
    description: 'Calculate total length of selected tracks',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'bounding-box',
    name: 'Bounding Box',
    description: 'Compute bounding box of selection',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'midpoint',
    name: 'Midpoint',
    description: 'Find midpoint between two locations',
    requirements: [{ kind: 'POINT', min: 2, max: 2 }],
  },
];

class MockCalcService {
  async listTools(): Promise<Tool[]> {
    return mockTools;
  }

  async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    // Simple JS implementations
    switch (request.toolId) {
      case 'track-length':
        return this.calculateTrackLength(request.featureIds);
      case 'bounding-box':
        return this.calculateBoundingBox(request.featureIds);
      case 'midpoint':
        return this.calculateMidpoint(request.featureIds);
      default:
        return { success: false, error: 'Unknown tool', durationMs: 0 };
    }
  }
}
```

### Web Host

The "extension host" equivalent that orchestrates services and message passing:

```typescript
// apps/web-shell/src/services/webHost.ts
class WebHost {
  private stacService = new MockStacService();
  private calcService = new MockCalcService();
  private sessionStore: ReturnType<typeof createSessionStore> | null = null;
  private messageBridge: WebMessageBridge;

  constructor() {
    this.messageBridge = new WebMessageBridge();
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    this.messageBridge.onHostMessage((msg) => {
      switch (msg.type) {
        case 'webviewReady':
          // Send initial data
          break;
        case 'selectionChanged':
          this.handleSelectionChanged(msg);
          break;
        // ... other message types
      }
    });
  }

  async openPlot(itemPath: string) {
    const data = await this.stacService.loadPlotData(mockStore, itemPath);
    this.sessionStore = createSessionStore();
    this.messageBridge.postToWebview({
      type: 'loadPlot',
      plot: data,
    });
  }
}
```

### Component Integration

The shell layout mirrors VS Code's panel arrangement:

```
┌─────────────────────────────────────────────────────────┐
│  STAC Browser (sidebar)  │  Map Panel (main area)       │
│  ─────────────────────   │                              │
│  📁 Mock Store           │     [Leaflet Map]            │
│    📄 Sample Plot        │                              │
│    📄 Another Plot       │                              │
│                          │                              │
├──────────────────────────┼──────────────────────────────┤
│  Activity Panel          │                              │
│  ─────────────────────   │                              │
│  Time: [slider]          │                              │
│  Tools: [list]           │                              │
│  Selection: [display]    │                              │
└─────────────────────────────────────────────────────────┘
```

### Fixture Data

Create minimal but realistic STAC fixtures:

**catalog.json**:
```json
{
  "type": "Catalog",
  "id": "mock-store",
  "stac_version": "1.0.0",
  "description": "Mock STAC store for integration testing",
  "links": [
    { "rel": "self", "href": "./catalog.json" },
    { "rel": "item", "href": "./sample-plot/item.json" },
    { "rel": "item", "href": "./another-plot/item.json" }
  ]
}
```

**sample-plot/item.json**:
```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "sample-plot",
  "geometry": null,
  "bbox": [-5.0, 50.0, 2.0, 55.0],
  "properties": {
    "title": "Sample Exercise",
    "datetime": null,
    "start_datetime": "2024-01-15T08:00:00Z",
    "end_datetime": "2024-01-15T12:00:00Z"
  },
  "assets": {
    "data": {
      "href": "./data.geojson",
      "type": "application/geo+json"
    }
  },
  "links": []
}
```

**sample-plot/data.geojson**: Contains 2-3 tracks with times array, matching the format `stacService.loadPlotData()` expects.

## Message Protocol Compliance

The web shell uses the **exact same message types** as defined in `apps/vscode/src/webview/messages.ts`:

- `LoadPlotMessage`
- `UpdateTracksMessage`
- `SelectionChangedMessage`
- `SetCurrentTimeMessage`
- `AddResultLayerMessage`
- etc.

This ensures the mock validates the real protocol.

## Playwright Test Strategy

### Test Categories

1. **Catalog browsing** — verify STAC tree renders, items are listed
2. **Plot loading** — select plot, verify map renders tracks
3. **Selection sync** — click track on map, verify activity panel updates
4. **Tool execution** — select features, run tool, verify result layer appears
5. **Time filtering** — move time slider, verify track rendering updates

### Example Test

```typescript
// apps/web-shell/playwright/tests/selection-sync.spec.ts
import { test, expect } from '@playwright/test';

test('selecting track on map updates activity panel', async ({ page }) => {
  await page.goto('/');

  // Open a plot
  await page.click('[data-testid="stac-item-sample-plot"]');

  // Wait for map to render
  await page.waitForSelector('[data-testid="map-track"]');

  // Click on a track
  await page.click('[data-testid="map-track-vessel-1"]');

  // Verify selection appears in activity panel
  await expect(page.locator('[data-testid="selection-display"]'))
    .toContainText('vessel-1');

  // Verify tools become active
  await expect(page.locator('[data-testid="tool-track-length"]'))
    .not.toHaveAttribute('disabled');
});
```

### Test Data Attributes

Add `data-testid` attributes to components for reliable Playwright selectors:

| Component | Selector | Purpose |
|-----------|----------|---------|
| STAC tree item | `data-testid="stac-item-{id}"` | Select plot to open |
| Map track | `data-testid="map-track-{id}"` | Click to select |
| Time slider | `data-testid="time-slider"` | Scrub time |
| Tool button | `data-testid="tool-{id}"` | Execute tool |
| Selection display | `data-testid="selection-display"` | Verify selection |
| Result layer | `data-testid="result-layer-{id}"` | Verify tool output |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web-shell/index.html` | HTML entry point |
| `apps/web-shell/src/main.tsx` | React app bootstrap |
| `apps/web-shell/src/App.tsx` | Shell layout |
| `apps/web-shell/src/components/StacBrowser.tsx` | Catalog tree view |
| `apps/web-shell/src/components/Shell.tsx` | Panel orchestration |
| `apps/web-shell/src/mocks/stacService.ts` | Mock STAC service |
| `apps/web-shell/src/mocks/calcService.ts` | Mock calc service with JS tools |
| `apps/web-shell/src/mocks/fixtures/*.json` | Static STAC data |
| `apps/web-shell/src/services/webHost.ts` | Web "extension host" |
| `apps/web-shell/src/services/messageBridge.ts` | Message abstraction |
| `apps/web-shell/vite.config.ts` | Vite build config |
| `apps/web-shell/package.json` | Dependencies |
| `apps/web-shell/playwright/playwright.config.ts` | Playwright config |
| `apps/web-shell/playwright/tests/*.spec.ts` | E2E tests |

## Files to Modify

| File | Change |
|------|--------|
| `apps/vscode/src/webview/map.ts` | Accept MessageBridge instead of direct vscode API |
| `shared/components/src/index.ts` | Export MessageBridge types |
| `pnpm-workspace.yaml` | Add `apps/web-shell` |

## Acceptance Criteria

1. Web shell loads in browser without errors
2. STAC browser displays mock catalog with items
3. Clicking an item loads plot data into map
4. Map renders tracks from GeoJSON
5. Selecting tracks updates activity panel selection display
6. Time slider filters track rendering
7. Mock tools appear in tools list based on selection
8. Executing a mock tool adds result layer to map
9. All Playwright tests pass
10. Mock services implement same interfaces as real services

## Testing Strategy

1. **Playwright E2E tests** — primary test mechanism, covers all acceptance criteria
2. **Storybook stories** — for individual components (existing)
3. **Unit tests** — for mock service logic (track length calculation, etc.)

## Out of Scope

- REP file import (no IoService mock)
- File system access (all data bundled as fixtures)
- Real Python tool execution
- Production deployment
- Authentication or multi-user
- Persistence across sessions

## Future Considerations

Once the web shell is working:

1. **CI integration** — run Playwright tests on PR
2. **Visual regression** — screenshot comparison in CI
3. **Expand fixtures** — add more realistic test scenarios
4. **Performance testing** — measure render times with large datasets
