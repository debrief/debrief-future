# Web Shell Playwright Test Restoration Requirements

> This document describes the prerequisites for restoring the skipped Playwright
> tests in `apps/web-shell/playwright/tests/`. All test bodies are preserved
> using `test.describe.skip()` — removing `.skip` is all that's needed once
> prerequisites are met.

## Current State

The Playwright infrastructure is working:

- **Chromium** installed via `pnpm exec playwright install chromium` (CI) or
  `@sparticuz/chromium` extraction (cloud/sandboxed environments)
- **Vite dev server** auto-starts via `webServer` config in
  `playwright.config.ts`
- **Page objects** (`CatalogPage`, `AnalysisPage`, `TimeController`) are
  scaffolded and ready

### Skipped Test Files

| File | Tests | Capability | Priority |
|------|-------|-----------|----------|
| `catalog-browse.spec.ts` | 4 | STAC catalog browsing | P1 |
| `plot-load.spec.ts` | 6 | Plot loading and map rendering | P1 |
| `selection-sync.spec.ts` | 5 | Map ↔ panel selection sync | P2 |
| `time-controller.spec.ts` | 13 | TimeController playback | P2 |
| `tool-execution.spec.ts` | 6 | Analysis tool execution | P3 |
| **Total** | **34** | | |

---

## Restoration Sequence

Tests should be restored in order — each phase builds on the previous.

### Phase 1: Catalog Browse + Plot Load (P1)

These are foundational — every other test suite depends on catalog navigation
and plot loading.

**Required app components**:

1. **Web Shell welcome view** rendering at `/`
   - Header with title "Debrief Web Shell" and subtitle "STAC Catalog Browser"
   - CSS class: `.web-shell--welcome`

2. **CatalogOverview component** with timeline
   - Shows STAC items as timeline bars or points
   - CSS classes: `.catalog-overview`, `.catalog-overview__timeline`,
     `.catalog-overview__timeline-bar`, `.catalog-overview__timeline-point`
   - Tooltip on hover: `.catalog-overview__tooltip`

3. **STAC test data** loaded at startup
   - At least two items: "Exercise Alpha" and "Training Run 1"
   - Items must be visible in the timeline

4. **Analysis view** opening on double-click
   - Transition from `.web-shell--welcome` to `.web-shell--analysis`
   - Leaflet map with `.leaflet-container` and `.leaflet-interactive` features
   - Activity panel: `.debrief-activity-panel`
   - Sidebar: `.web-shell__sidebar`
   - Map container: `.web-shell__map-container`
   - Back button: `.web-shell__back-button` (text "Back to Catalog")

**DOM selectors tested** (catalog-browse.spec.ts):

| Selector | Purpose |
|----------|---------|
| `h1` | Main heading |
| `.web-shell__subtitle` | Subtitle text |
| `.catalog-overview` | Catalog overview container |
| `.catalog-overview__timeline` | Timeline container |
| `.catalog-overview__timeline-bar` | Timeline bar items |
| `.catalog-overview__timeline-point` | Timeline point items |
| `.catalog-overview__tooltip` | Hover tooltip |

**DOM selectors tested** (plot-load.spec.ts):

| Selector | Purpose |
|----------|---------|
| `.web-shell--analysis` | Analysis view container |
| `.web-shell__back-button` | Back navigation button |
| `.web-shell__map-container` | Map container |
| `.leaflet-container` | Leaflet map |
| `.leaflet-interactive` | GeoJSON features on map |
| `.web-shell__sidebar` | Sidebar panel |
| `.debrief-activity-panel` | Activity panel |
| `.web-shell--welcome` | Welcome view (after back) |

**To restore**:
- Remove `.skip` from `catalog-browse.spec.ts` and `plot-load.spec.ts`
- Restore `expect` import: change `import { test }` to `import { test, expect }`
- Verify all CSS selectors match the actual app DOM
- Ensure STAC test data loads on startup

### Phase 2: Selection Sync + Time Controller (P2)

Depends on Phase 1 (catalog navigation and plot loading).

**Required app components** (beyond Phase 1):

1. **Feature list in activity panel**
   - Feature rows: `.debrief-feature-row`
   - Feature names: `.debrief-feature-row__name`
   - Selected state: `.debrief-feature-row--selected` (or class matching `/selected/`)

2. **Map ↔ panel selection synchronization**
   - Clicking a map feature updates the panel selection
   - Clicking a feature row updates the map selection
   - Background click clears selection

3. **TimeController component** in the activity panel
   - Container: `.time-controller`
   - State attribute: `data-state="ready"` when loaded with time data
   - Controls row: `.time-controller__controls`
   - Play/pause button: `.time-controller__play-pause`
   - Scrubber: `.time-controller__scrubber` with `value` attribute (0–100)
   - Display mode toggle: `.time-controller__display-mode`
   - Speed selector: `.time-controller__speed`
   - Time display: `.time-controller__time-display`

**DOM selectors tested** (selection-sync.spec.ts):

| Selector | Purpose |
|----------|---------|
| `.leaflet-interactive` | Map features (click to select) |
| `.debrief-feature-list` | Feature list container |
| `.debrief-feature-row` | Individual feature rows |
| `.debrief-feature-row` class `/selected/` | Selected feature state |

**DOM selectors tested** (time-controller.spec.ts — via page objects):

| Selector | Purpose |
|----------|---------|
| `.time-controller` | TimeController container |
| `.time-controller[data-state]` | State indicator |
| `.time-controller__controls` | Controls row |
| `.time-controller__play-pause` | Play/pause button |
| `.time-controller__scrubber` | Time scrubber slider |
| `.time-controller__display-mode` | Display mode toggle |
| `.time-controller__speed` | Speed selector |
| `.time-controller__time-display` | Current time display |

**To restore**:
- Remove `.skip` from `selection-sync.spec.ts` and `time-controller.spec.ts`
- Restore `expect` import in `selection-sync.spec.ts`
- `time-controller.spec.ts` uses page objects, so also verify `TimeController`
  component class (`playwright/components/TimeController.ts`) matches the DOM
- Verify feature list and TimeController render with correct selectors

### Phase 3: Tool Execution (P3)

Depends on Phase 1 (plot loading) and Phase 2 (selection).

**Required app components** (beyond Phase 2):

1. **Tools panel** in activity panel
   - Container: `.debrief-tools-panel`
   - Tool items: `.debrief-tools-panel__item--active`,
     `.debrief-tools-panel__item--inactive`
   - Run buttons on active tools

2. **Tool execution pipeline**
   - Track Length tool: activates when a track is selected
   - Bounding Box tool: activates with any feature
   - Results display: `.web-shell__tool-message` with dismiss button
   - Result contains "km" for track length

3. **Selection → tool activation linkage**
   - No selection → tools inactive
   - Track selected → Track Length + Bounding Box active
   - Any feature selected → Bounding Box active

**DOM selectors tested** (tool-execution.spec.ts):

| Selector | Purpose |
|----------|---------|
| `.debrief-tools-panel` | Tools panel container |
| `.debrief-tools-panel__item--inactive` | Inactive tool item |
| `.debrief-tools-panel__item--active` | Active tool item |
| `.debrief-tools-panel__item--active button` | Run button |
| `.debrief-feature-row` | Feature row (for selection) |
| `.web-shell__tool-message` | Tool result message |
| `.web-shell__tool-message button` | Dismiss button |

**To restore**:
- Remove `.skip` from `tool-execution.spec.ts`
- Restore `expect` import
- Verify tool activation logic and result message rendering

---

## Test Infrastructure

### Already Working

| Component | Location |
|-----------|----------|
| Playwright config | `apps/web-shell/playwright/playwright.config.ts` |
| CatalogPage page object | `apps/web-shell/playwright/pages/CatalogPage.ts` |
| AnalysisPage page object | `apps/web-shell/playwright/pages/AnalysisPage.ts` |
| TimeController component object | `apps/web-shell/playwright/components/TimeController.ts` |
| Vite dev server auto-start | `webServer` in playwright config |
| Cloud runner (sparticuz) | `apps/web-shell/run-playwright.mjs` |

### CI Configuration

The CI workflow (`.github/workflows/ci.yml`) installs Playwright browsers with:
```yaml
- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps chromium
```

Both root and `apps/web-shell` use `@playwright/test: ^1.57.0` (resolves to
1.58.2) to ensure a single browser install covers all workspaces.

### Running Locally

```bash
# Install browsers (first time only)
pnpm exec playwright install chromium

# Run web-shell tests
pnpm --filter @debrief/web-shell test
```

### Running in Cloud/Sandboxed Environment

```bash
# Uses @sparticuz/chromium extraction
cd apps/web-shell
node run-playwright.mjs
```
