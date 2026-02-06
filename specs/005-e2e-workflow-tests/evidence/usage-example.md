# Usage Example: Running E2E Tests

## Local Quickstart (5 steps)

```bash
# 1. Install project dependencies
task install

# 2. Build the VS Code extension
pnpm run build --filter @debrief/vscode

# 3. Package as .vsix
cd apps/vscode && pnpm run package && cd ../..

# 4. Install extension in code-server and start it
code-server --install-extension apps/vscode/debrief-*.vsix
code-server --auth none --port 8080 tests/e2e/test-workspace/

# 5. In another terminal, run the tests
npx playwright test --config tests/e2e/playwright.config.ts
```

## Docker Quickstart (2 steps)

```bash
# 1. Build the Docker image (includes code-server + services + extension)
docker compose -f docker/code-server/docker-compose.yml build

# 2. Start code-server and run tests
docker compose -f docker/code-server/docker-compose.yml up -d
npx playwright test --config tests/e2e/playwright.config.ts
docker compose -f docker/code-server/docker-compose.yml down
```

## Running Individual Test Suites

```bash
# P1: File loading workflow
npx playwright test --config tests/e2e/playwright.config.ts test-load-display

# P2: Analysis tool workflow
npx playwright test --config tests/e2e/playwright.config.ts test-analysis-tool

# P3: Error feedback workflow
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

## Key Pattern: Accessing Webview Content

```typescript
import { test } from './fixtures/base';
import { DebriefWebview } from './models/debrief-webview';

test('loads REP file and shows tracks', async ({ codeServerPage }) => {
  // Open file via VS Code Quick Open
  await codeServerPage.openFile('samples/boat1.rep');

  // Drill into VS Code's nested webview iframes
  const frame = await codeServerPage.getWebviewFrame();
  const debrief = new DebriefWebview(frame);

  // Interact with Debrief components inside the webview
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
| `CHROMIUM_PATH` | unset | Explicit path to chromium binary |

## File Structure

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
│   ├── samples/                  # Symlinked REP fixtures
│   └── .vscode/settings.json    # Extension config
├── test-load-display.spec.ts     # P1: File loading workflow
├── test-analysis-tool.spec.ts    # P2: Tool execution workflow
└── test-error-feedback.spec.ts   # P3: Error handling workflow
```
