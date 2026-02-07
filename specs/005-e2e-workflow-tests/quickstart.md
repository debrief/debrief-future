# Quickstart: End-to-End Workflow Tests

## Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+ and uv
- Docker (for CI mode or containerised testing)
- code-server (for local mode): `npm install -g code-server`

## Quick Start (Local)

```bash
# 1. Install dependencies and build the extension
task install
pnpm run build --filter @debrief/vscode

# 2. Package the extension as .vsix
cd apps/vscode && pnpm run package && cd ../..

# 3. Install extension in code-server
code-server --install-extension apps/vscode/debrief-*.vsix

# 4. Start code-server with test workspace
code-server --auth none --port 8080 tests/e2e/test-workspace/

# 5. In another terminal, run the tests
npx playwright test --config tests/e2e/playwright.config.ts
```

## Quick Start (Docker)

```bash
# 1. Build the Docker image
docker compose -f docker/code-server/docker-compose.yml build

# 2. Run tests (starts code-server + runs Playwright + tears down)
docker compose -f docker/code-server/docker-compose.yml up --abort-on-container-exit
```

## Running Individual Test Files

```bash
# Load and display workflow (P1)
npx playwright test --config tests/e2e/playwright.config.ts test-load-display

# Analysis tool workflow (P2)
npx playwright test --config tests/e2e/playwright.config.ts test-analysis-tool

# Error feedback workflow (P3)
npx playwright test --config tests/e2e/playwright.config.ts test-error-feedback
```

## Debugging

```bash
# Run with Playwright UI (headed mode)
npx playwright test --config tests/e2e/playwright.config.ts --ui

# Run with trace recording
npx playwright test --config tests/e2e/playwright.config.ts --trace on

# View last test report
npx playwright show-report
```

## Test Structure

```
tests/e2e/
├── playwright.config.ts          # Config (baseURL, timeouts, retries)
├── global-setup.ts               # Starts code-server before all tests
├── global-teardown.ts            # Stops code-server after all tests
├── fixtures/base.ts              # Custom fixture: codeServerPage
├── models/
│   ├── code-server-page.ts       # VS Code chrome interactions
│   └── debrief-webview.ts        # Debrief component interactions
├── test-workspace/               # Pre-configured workspace for tests
├── test-load-display.spec.ts     # P1: File loading workflow
├── test-analysis-tool.spec.ts    # P2: Tool execution workflow
└── test-error-feedback.spec.ts   # P3: Error handling workflow
```

## Key Patterns

### Accessing Webview Content

VS Code webviews use nested iframes. Use Playwright's `frameLocator()`:

```typescript
// Access Debrief components inside the webview
const webview = page
  .frameLocator("iframe.webview.ready")
  .frameLocator("#active-frame");

// Interact with the map
await webview.locator(".leaflet-container").waitFor();
```

### Using Page Objects

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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CODE_SERVER_URL` | `http://localhost:8080` | Base URL for code-server |
| `CODE_SERVER_AUTH` | `none` | Authentication mode |
| `CLAUDE_CODE` | unset | Set to `1` to use @sparticuz/chromium |
