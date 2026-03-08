# Usage Example: Running Dual-Platform E2E Tests

## Quick Reference

| Suite | Command | Speed | Data |
|-------|---------|-------|------|
| Web-shell | `pnpm --filter @debrief/web-shell test` | ~30s | Mock |
| VS Code E2E | `npx playwright test --config tests/e2e/playwright.config.ts` | ~3min | Real |

## Web-Shell Tests (Fast, Mock Data)

```bash
# Run all 13 web-shell spec categories
pnpm --filter @debrief/web-shell test

# Run a single category
pnpm --filter @debrief/web-shell test -- --grep "selection"
```

## VS Code E2E Tests (Real Services)

### Option 1: Docker (Recommended)

```bash
# Build Docker image with code-server + Python services + extension
docker compose -f docker/code-server/docker-compose.yml build

# Start code-server container
docker compose -f docker/code-server/docker-compose.yml up -d

# Wait for readiness, then run tests
CODE_SERVER_URL=http://localhost:8080 \
  npx playwright test --config tests/e2e/playwright.config.ts

# Cleanup
docker compose -f docker/code-server/docker-compose.yml down
```

### Option 2: Local Development

```bash
# 1. Build and package extension
pnpm --filter @debrief/vscode build
cd apps/vscode && pnpm run package && cd ../..

# 2. Install in code-server and start
code-server --install-extension apps/vscode/debrief-*.vsix
code-server --auth none --port 8080 tests/e2e/test-workspace/

# 3. Run tests (separate terminal)
CODE_SERVER_URL=http://localhost:8080 \
  npx playwright test --config tests/e2e/playwright.config.ts
```

### Option 3: Cloud (Claude Code)

```bash
# Uses @sparticuz/chromium bundled binary
CLAUDE_CODE=1 npx playwright test --config tests/e2e/playwright.config.ts
```

## Running Specific Test Categories

```bash
# Restored specs (Phase 7)
npx playwright test --config tests/e2e/playwright.config.ts test-load-display
npx playwright test --config tests/e2e/playwright.config.ts test-analysis-tool
npx playwright test --config tests/e2e/playwright.config.ts test-error-feedback
npx playwright test --config tests/e2e/playwright.config.ts test-tune-prov

# New specs (Phase 8)
npx playwright test --config tests/e2e/playwright.config.ts test-selection-sync
npx playwright test --config tests/e2e/playwright.config.ts test-catalog-browse

# All VS Code E2E (excluding Heroku smoke)
npx playwright test --config tests/e2e/playwright.config.ts --grep-invert "Heroku"
```

## Key Pattern: Accessing Webview Content

```typescript
import { test, expect } from './fixtures/base';

test('loads REP file and shows tracks', async ({ codeServerPage }) => {
  // Open file via VS Code Quick Open
  await codeServerPage.openFile('samples/boat1.rep');

  // Drill into VS Code's nested webview iframes
  const frame = await codeServerPage.getWebviewFrame();

  // Wait for map and verify tracks rendered
  await frame.locator('.leaflet-container').waitFor({ state: 'visible' });
  const trackCount = await frame.locator('.leaflet-interactive').count();
  expect(trackCount).toBeGreaterThan(0);
});
```

## Debugging

```bash
# Playwright UI mode
npx playwright test --config tests/e2e/playwright.config.ts --ui

# Trace recording
npx playwright test --config tests/e2e/playwright.config.ts --trace on

# View HTML report
npx playwright show-report
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CODE_SERVER_URL` | `http://localhost:8080` | code-server base URL |
| `CLAUDE_CODE` | unset | Set to `1` for @sparticuz/chromium |
| `CHROMIUM_PATH` | unset | Explicit chromium binary path |
| `E2E_HEADED` | unset | Set to `1` for headed mode |
| `CI` | unset | Set in CI — enables `forbidOnly` |
