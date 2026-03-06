# Quickstart: End-to-End Workflow Tests

**Revised**: 2026-03-06 — Updated for dual-platform test strategy

## Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+ and uv
- Docker (for VS Code E2E CI mode)
- openvscode-server or code-server (for VS Code E2E local mode)

## Web-Shell Tests (Fast Feedback)

```bash
# Run web-shell E2E tests (mock data, no VS Code needed)
cd apps/web-shell && node run-playwright.mjs

# Or run specific spec files
cd apps/web-shell && npx playwright test playwright/tests/plot-load.spec.ts
```

The web-shell suite uses `run-playwright.mjs` which handles Chromium extraction in sandboxed environments (CI, Claude Code).

## VS Code E2E Tests (True End-to-End)

### Option 1: Docker (CI-equivalent, recommended)

```bash
# 1. Build workspace dependencies
pnpm --filter @debrief/session-state --filter @debrief/components build

# 2. Build and package the VS Code extension
cd apps/vscode && pnpm run build && pnpm run package && cd ../..

# 3. Build and start the Docker container
docker compose -f docker/code-server/docker-compose.yml build
docker compose -f docker/code-server/docker-compose.yml up -d

# 4. Run VS Code E2E tests
CODE_SERVER_URL=http://localhost:8080 npx playwright test --config tests/e2e/playwright.config.ts

# 5. Tear down
docker compose -f docker/code-server/docker-compose.yml down
```

### Option 2: Local openvscode-server

```bash
# 1. Install openvscode-server (or code-server as fallback)
# See: https://github.com/nicedoc/openvscode-server

# 2. Build and package the extension
cd apps/vscode && pnpm run build && pnpm run package && cd ../..

# 3. Run tests (global-setup.ts auto-starts openvscode-server)
npx playwright test --config tests/e2e/playwright.config.ts
```

### Option 3: Cloud Environment Setup

```bash
# Use the cloud setup script (installs openvscode-server + Chromium)
bash tests/e2e/scripts/cloud-e2e-setup.sh

# Then run tests
npx playwright test --config tests/e2e/playwright.config.ts
```

## Running Both Suites

```bash
# Run web-shell tests (fast)
cd apps/web-shell && node run-playwright.mjs && cd ../..

# Run VS Code E2E tests (Docker)
docker compose -f docker/code-server/docker-compose.yml up -d
CODE_SERVER_URL=http://localhost:8080 npx playwright test --config tests/e2e/playwright.config.ts
docker compose -f docker/code-server/docker-compose.yml down
```

## Running Individual Test Files

```bash
# Web-shell
cd apps/web-shell
npx playwright test playwright/tests/plot-load.spec.ts
npx playwright test playwright/tests/tool-execution.spec.ts
npx playwright test playwright/tests/selection-sync.spec.ts

# VS Code E2E
npx playwright test --config tests/e2e/playwright.config.ts test-load-display
npx playwright test --config tests/e2e/playwright.config.ts test-analysis-tool
npx playwright test --config tests/e2e/playwright.config.ts test-error-feedback
```

## Debugging

```bash
# Playwright UI mode (headed)
npx playwright test --config tests/e2e/playwright.config.ts --ui

# With trace recording
npx playwright test --config tests/e2e/playwright.config.ts --trace on

# View last test report
npx playwright show-report

# Headed mode in CI (requires xvfb)
E2E_HEADED=1 xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts
```

## Test Structure

```
# Web-shell (13 spec files, mock data)
apps/web-shell/playwright/tests/
├── catalog-browse.spec.ts         # Catalog navigation
├── capture-log-evidence.spec.ts   # Log capture
├── drawing.spec.ts                # Drawing tools
├── event-log-propagation.spec.ts  # Event propagation
├── log-edit-face.spec.ts          # Log editing
├── log-panel.spec.ts              # Log panel
├── plot-load.spec.ts              # Plot loading
├── selection-sync.spec.ts         # Selection synchronization
├── styling-tools.spec.ts          # Styling tools
├── time-controller.spec.ts        # Time controller
├── tool-execution.spec.ts         # Tool execution
├── tune-prov.spec.ts              # Provenance tuning
└── undo-redo-split.spec.ts        # Undo/redo/split

# VS Code E2E (8 existing, expanding to 13+, real Python services)
tests/e2e/
├── playwright.config.ts           # Config (baseURL, timeouts, Chromium)
├── global-setup.ts                # Server start + config seeding
├── global-teardown.ts             # Server stop
├── fixtures/base.ts               # Custom fixture: codeServerPage
├── helpers/webview-injector.ts    # Iframe access helpers
├── models/code-server-page.ts     # VS Code chrome page object
├── scripts/                       # Setup scripts
├── test-workspace/                # Real REP files + STAC store
├── test-load-display.spec.ts      # P1: File loading
├── test-analysis-tool.spec.ts     # P2: Tool execution
├── test-error-feedback.spec.ts    # P3: Error handling
├── test-tune-prov.spec.ts         # Provenance tuning
├── test-real-webview.spec.ts      # Webview interaction
├── test-webview-probe.spec.ts     # Webview probing
├── test-preview-smoke.spec.ts     # Preview smoke
└── test-heroku-smoke.spec.ts      # Heroku deployment
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CODE_SERVER_URL` | `http://localhost:8080` | Base URL for openvscode-server/code-server |
| `CHROMIUM_PATH` | unset | Explicit path to Chromium binary |
| `CLAUDE_CODE` | unset | Set to `1` to use @sparticuz/chromium flags |
| `E2E_HEADED` | unset | Set to `1` for headed mode (use with xvfb-run) |
| `CI` | unset | Set by GitHub Actions; enables `forbidOnly` |

## Key Patterns

### Accessing Webview Content (VS Code E2E)

```typescript
// Navigate through VS Code's nested iframe structure
const webview = page
  .frameLocator("iframe.webview.ready")
  .frameLocator("#active-frame");

await webview.locator(".leaflet-container").waitFor();
```

### Using Page Objects (VS Code E2E)

```typescript
import { test } from "../fixtures/base";

test("loads REP file and shows tracks", async ({ codeServerPage }) => {
  const webview = await codeServerPage.getWebviewFrame("Map");
  const debrief = new DebriefWebview(webview);

  await codeServerPage.openFile("samples/boat1.rep");
  await debrief.waitForMapReady();

  const trackCount = await debrief.getTrackCount();
  expect(trackCount).toBeGreaterThan(0);
});
```

### Using test.fixme() for Missing Features

```typescript
test.fixme("should display bearing overlay after calc", async ({ codeServerPage }) => {
  // Bearing overlay rendering not yet implemented
  // Backlog item: #NNN
});
```
