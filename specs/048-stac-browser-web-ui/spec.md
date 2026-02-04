# Spec 048: STAC Browser Web UI (Integration Test Shell)

**Status**: draft
**Backlog Item**: 048 (Feature)
**Complexity**: Medium (Sonnet)

## Problem

Reviewing cross-cutting integration between UI components (STAC browser, map panel, activity panel) requires launching VS Code, which has slow iteration cycles. There is no way to:

1. Review component integration in a browser
2. Run Playwright tests against the integrated UI
3. Verify state synchronization between components works correctly

## Goal

Create a standalone web application that composes existing `@debrief/components` (MapView, ActivityPanel, CatalogOverview, etc.) backed by mock services. This provides:

1. **Browser-based review** — load STAC catalog, select plot, see it in map, interact with activity panel
2. **Playwright testability** — full E2E tests against integrated components
3. **Architecture validation** — proves components work together outside VS Code

The web shell is **not** a production alternative to VS Code — it's a development/testing tool.

## Design Principles

1. **Compose existing components** — use `@debrief/components` (MapView, ActivityPanel, TimeController, etc.)
2. **Reuse session-state** — same Zustand store as VS Code
3. **Valid APIs** — mocks implement real service interfaces, just with static/in-memory data
4. **No IO service** — skip REP import; load GeoJSON directly from mock STAC
5. **Mock tools** — 2-3 simple JS tools demonstrating the tool execution flow

## Architecture

### Key Insight: Components Already Exist

`@debrief/components` exports everything needed:

| Component | Purpose | VS Code Status |
|-----------|---------|----------------|
| `MapView` | Leaflet map with selection, temporal rendering | **Not used** (has custom `web/map.ts`) |
| `TimeController` | Time scrubber, playback controls | Used in activity panel webview |
| `FeatureList` | Layers panel | Used in activity panel webview |
| `ActivityPanel` | Unified sidebar | Used in activity panel webview |
| `ToolsPanel` | Tool list with active state | Used in activity panel webview |
| `CatalogOverview` | STAC catalog browser | **Not used** (has custom TreeDataProvider) |
| `useSelection` | Selection state hook | Available |
| `ThemeProvider` | VS Code theme integration | Used |

The web shell simply **composes these components** with mock data. No MessageBridge abstraction needed — the components are already framework-agnostic React.

### VS Code Migration Path

This spec also establishes the path for VS Code to adopt `@debrief/components/MapView`:

1. **Current**: VS Code uses vanilla JS `webview/web/map.ts` (744 lines)
2. **Target**: VS Code webview uses `<MapView />` from `@debrief/components` (291 lines)
3. **Benefit**: Single map implementation, tested in Storybook, works in web shell and VS Code

### Web Shell Structure

```
apps/web-shell/
├── index.html              # Entry point
├── src/
│   ├── main.tsx            # React app entry
│   ├── App.tsx             # Shell layout composing @debrief/components
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
│   └── hooks/
│       └── useSessionStore.ts  # Zustand store integration
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

### App.tsx — Composing Existing Components

The web shell is primarily just component composition:

```tsx
// apps/web-shell/src/App.tsx
import {
  MapView,
  ActivityPanel,
  CatalogOverview,
  TimeController,
  FeatureList,
  ToolsPanel,
  ThemeProvider,
  useSelection,
} from '@debrief/components';
import { createSessionStore, subscribeToTemporal } from '@debrief/session-state';
import { MockStacService } from './mocks/stacService';
import { MockCalcService, mockTools } from './mocks/calcService';

function App() {
  // Session state (same store as VS Code uses)
  const [store] = useState(() => createSessionStore());
  const [temporal, setTemporal] = useState(store.getState());

  // Selection (using existing hook)
  const selection = useSelection();

  // Plot data
  const [features, setFeatures] = useState<DebriefFeature[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogOverviewItem[]>([]);

  // Mock services
  const stacService = useMemo(() => new MockStacService(), []);
  const calcService = useMemo(() => new MockCalcService(), []);

  // Subscribe to temporal changes
  useEffect(() => {
    return subscribeToTemporal(store, setTemporal);
  }, [store]);

  // Load catalog on mount
  useEffect(() => {
    stacService.listItems().then(setCatalogItems);
  }, [stacService]);

  const handleSelectPlot = async (itemId: string) => {
    const data = await stacService.loadPlotData(itemId);
    setFeatures(data.features);
    store.getState().setTimeRange(data.timeExtent);
  };

  return (
    <ThemeProvider>
      <div className="web-shell">
        <aside className="sidebar">
          <CatalogOverview
            items={catalogItems}
            onSelectItem={handleSelectPlot}
          />
          <ActivityPanel
            timeController={
              <TimeController
                store={store}
                timeRange={temporal.timeRange}
              />
            }
            featureList={
              <FeatureList
                features={features}
                selectedIds={selection.selectedIds}
                onSelect={selection.toggle}
              />
            }
            toolsPanel={
              <ToolsPanel
                tools={mockTools}
                selection={selection}
                onExecute={(toolId) => calcService.execute(toolId, selection)}
              />
            }
          />
        </aside>
        <main className="map-area">
          <MapView
            features={features}
            selectedIds={selection.selectedIds}
            onSelect={selection.toggle}
            onBackgroundClick={selection.clear}
            currentTime={temporal.currentTime?.epoch}
            displayMode={temporal.displayMode}
          />
        </main>
      </div>
    </ThemeProvider>
  );
}
```

### Mock Services

#### Mock StacService

Implements the same interface as the real `StacService` but reads from bundled fixtures:

```typescript
// apps/web-shell/src/mocks/stacService.ts
import catalogData from './fixtures/catalog.json';
import samplePlotData from './fixtures/sample-plot/data.geojson';
import anotherPlotData from './fixtures/another-plot/data.geojson';

const plotDataMap: Record<string, DebriefFeatureCollection> = {
  'sample-plot': samplePlotData,
  'another-plot': anotherPlotData,
};

export class MockStacService {
  async listItems(): Promise<CatalogOverviewItem[]> {
    return catalogData.links
      .filter(link => link.rel === 'item')
      .map(link => ({
        id: link.href.split('/')[0],
        title: link.title,
        bbox: [-5, 50, 2, 55],  // From fixture
        timeRange: ['2024-01-15T08:00:00Z', '2024-01-15T12:00:00Z'],
      }));
  }

  async loadPlotData(itemId: string): Promise<{ features: DebriefFeature[], timeExtent: [string, string] }> {
    const data = plotDataMap[itemId];
    if (!data) throw new Error(`Unknown plot: ${itemId}`);

    const features = data.features as DebriefFeature[];
    const timeExtent = calculateTimeExtent(features);
    return { features, timeExtent };
  }
}
```

#### Mock CalcService

Provides 2-3 simple tools implemented in JavaScript:

```typescript
// apps/web-shell/src/mocks/calcService.ts
import { Tool, ToolExecutionResult } from '@debrief/components';
import * as turf from '@turf/turf';

export const mockTools: Tool[] = [
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
];

export class MockCalcService {
  constructor(private getFeatures: () => DebriefFeature[]) {}

  async execute(toolId: string, selectedIds: Set<string>): Promise<ToolExecutionResult> {
    const features = this.getFeatures().filter(f => selectedIds.has(f.id));

    switch (toolId) {
      case 'track-length':
        const totalLength = features.reduce((sum, f) =>
          sum + turf.length(f, { units: 'kilometers' }), 0);
        return {
          success: true,
          features: { type: 'FeatureCollection', features: [] },
          message: `Total length: ${totalLength.toFixed(2)} km`,
          durationMs: 5,
        };

      case 'bounding-box':
        const bbox = turf.bbox(turf.featureCollection(features));
        const bboxPolygon = turf.bboxPolygon(bbox);
        return {
          success: true,
          features: { type: 'FeatureCollection', features: [bboxPolygon] },
          durationMs: 3,
        };

      default:
        return { success: false, error: 'Unknown tool', durationMs: 0 };
    }
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
| `apps/web-shell/src/App.tsx` | Shell layout composing `@debrief/components` |
| `apps/web-shell/src/App.css` | Shell layout styles |
| `apps/web-shell/src/mocks/stacService.ts` | Mock STAC service |
| `apps/web-shell/src/mocks/calcService.ts` | Mock calc service with JS tools |
| `apps/web-shell/src/mocks/fixtures/catalog.json` | Static STAC catalog |
| `apps/web-shell/src/mocks/fixtures/sample-plot/item.json` | Sample plot metadata |
| `apps/web-shell/src/mocks/fixtures/sample-plot/data.geojson` | Sample plot tracks |
| `apps/web-shell/src/mocks/fixtures/another-plot/item.json` | Second plot metadata |
| `apps/web-shell/src/mocks/fixtures/another-plot/data.geojson` | Second plot tracks |
| `apps/web-shell/vite.config.ts` | Vite build config |
| `apps/web-shell/package.json` | Dependencies |
| `apps/web-shell/tsconfig.json` | TypeScript config |
| `apps/web-shell/playwright/playwright.config.ts` | Playwright config |
| `apps/web-shell/playwright/tests/*.spec.ts` | E2E tests |

## Files to Modify

| File | Change |
|------|--------|
| `pnpm-workspace.yaml` | Add `apps/web-shell` |

## Future: VS Code MapView Migration

After the web shell is working, VS Code should migrate from `webview/web/map.ts` (744 lines of vanilla JS) to `@debrief/components/MapView` (291 lines of React):

| File | Change |
|------|--------|
| `apps/vscode/src/webview/web/map.ts` | Replace with React wrapper that renders `<MapView />` |
| `apps/vscode/src/webview/mapPanel.ts` | Simplify to just pass props, remove manual renderers |

This is out of scope for this spec but establishes the direction.

## Acceptance Criteria

1. Web shell loads in browser without errors
2. `CatalogOverview` displays mock catalog items with bbox and time range
3. Clicking an item loads plot features into `MapView`
4. `MapView` renders tracks from GeoJSON
5. Selecting tracks in `MapView` updates `FeatureList` selection via shared `useSelection`
6. `TimeController` scrubbing updates `MapView` temporal rendering
7. `ToolsPanel` shows tools with correct active/inactive state based on selection
8. Executing a mock tool shows result (message or result layer)
9. All Playwright tests pass
10. `@debrief/session-state` store is used for temporal state

## Testing Strategy

1. **Playwright E2E tests** — primary test mechanism, covers all acceptance criteria
2. **Storybook stories** — individual components already have stories
3. **Vitest unit tests** — for mock service logic (track length calculation, etc.)

## Component Reuse Verification

This spec validates that `@debrief/components` work correctly when composed:

| Integration | What's Tested |
|-------------|---------------|
| `MapView` ↔ `useSelection` | Selection state flows to map highlight |
| `MapView` ↔ `session-state` | Temporal position updates track rendering |
| `FeatureList` ↔ `useSelection` | List selection syncs with map |
| `TimeController` ↔ `session-state` | Scrubber updates store, store updates map |
| `ToolsPanel` ↔ `useSelection` | Tool active state reflects selection |
| `CatalogOverview` ↔ data loading | Item click loads features |

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
