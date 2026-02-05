# Usage Example: STAC Browser Web UI

## Starting the Development Server

```bash
cd apps/web-shell
pnpm dev
```

Opens at http://localhost:5173

## Workflow

### 1. Welcome Page (Catalog Browse)

When you open the web shell, you see the **Welcome Page** with the STAC Catalog Browser:

- Header shows "Debrief Web Shell" and "STAC Catalog Browser"
- CatalogOverview component displays available plots
- Test data includes:
  - **Exercise Alpha** - Naval exercise south of Plymouth
  - **Training Run 1** - Single vessel training exercise

### 2. Opening a Plot (Analysis View)

Double-click on any catalog item to open the **Analysis View**:

- Left sidebar: **ActivityPanel** with:
  - Time Controller (playback controls)
  - Tools Panel (analysis tools)
  - Layers/Features list
- Right area: **MapView** showing:
  - Tracks as colored polylines
  - Points, shapes, and other features
  - Interactive selection

### 3. Selection Sync

- Click a track on the map → Highlights in feature list
- Click a feature in the list → Highlights on map
- Ctrl+click to multi-select
- Click empty map area to clear selection

### 4. Tool Execution

Select features to enable tools:

- **Track Length**: Select 1+ tracks → Shows total length in km
- **Bounding Box**: Select any features → Calculates bounds, adds result layer

Tool results appear as a toast message in the top-right corner.

### 5. Navigation

- Click "← Back to Catalog" to return to the welcome page
- All state resets when returning to catalog

## Running Tests

```bash
# Install Playwright browsers (first time)
pnpm exec playwright install chromium

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui
```

## File Structure

```
apps/web-shell/
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Two-view shell
│   ├── App.css           # Layout styles
│   └── mocks/
│       ├── stacService.ts  # Mock STAC operations
│       └── calcService.ts  # Mock calc tools
└── playwright/
    └── tests/
        ├── catalog-browse.spec.ts
        ├── plot-load.spec.ts
        ├── selection-sync.spec.ts
        └── tool-execution.spec.ts
```
