# E2E Testing Guide

How to write and run end-to-end tests for Debrief features that involve UI components. Covers both **Storybook component tests** (isolated React components) and **VS Code webview tests** (full extension running in code-server).

## 1. Two Kinds of E2E Test

| Kind | What It Tests | Runs In | Test Location |
|------|--------------|---------|---------------|
| **Storybook E2E** | Individual React components via Storybook stories | Storybook dev server (`localhost:6006`) | `shared/components/e2e/` |
| **VS Code Webview E2E** | Full extension: webviews, commands, sidebar panels | code-server (headless VS Code) | `tests/e2e/` |

**When to use which:**

- Adding or modifying a **shared component** (map, timeline, chart, feature list) → Storybook E2E
- Adding or modifying an **extension workflow** (open file → view tracks → run tool) → VS Code Webview E2E
- Major features often need **both**: Storybook tests for component correctness, webview tests for integration

## 2. Storybook E2E Tests

### Overview

Playwright drives a browser against Storybook's `iframe.html` endpoint. Each test loads a story by URL, interacts with it, and asserts on DOM state.

### Creating a Test

```typescript
// shared/components/e2e/MyComponent.spec.ts
import { test, expect } from '@playwright/test';

const STORIES = {
  default: '/iframe.html?id=category-mycomponent--default',
  light:   '/iframe.html?id=category-mycomponent--default&globals=theme:light',
  dark:    '/iframe.html?id=category-mycomponent--default&globals=theme:dark',
  vscode:  '/iframe.html?id=category-mycomponent--default&globals=theme:vscode',
};

test.describe('MyComponent', () => {
  test('renders default state', async ({ page }) => {
    await page.goto(STORIES.default);
    await page.waitForSelector('[data-testid="my-component"]');
    await expect(page.locator('[data-testid="my-component"]')).toBeVisible();
  });

  test('renders in all theme variants', async ({ page }) => {
    for (const [name, url] of Object.entries(STORIES)) {
      if (name === 'default') continue;
      await page.goto(url);
      await page.waitForSelector('[data-testid="my-component"]');
      await expect(page.locator('[data-testid="my-component"]')).toBeVisible();
    }
  });
});
```

### Running

```bash
# All Storybook E2E tests
pnpm --filter @debrief/components test:e2e

# Single file
pnpm --filter @debrief/components test:e2e MyComponent
```

### Speckit Integration

The `plan-template.md` and `tasks-template.md` already include Storybook E2E sections. When `/speckit.plan` identifies UI components, it populates the "Storybook E2E Testing" table. When `/speckit.tasks` generates task lists, it includes E2E test tasks alongside implementation tasks.

## 3. VS Code Webview E2E Tests

### The Problem

VS Code webviews use a three-layer iframe architecture:

```
Page (VS Code workbench at http://localhost:8080)
  └── iframe.webview (class="webview ready", same origin)
        └── pre/index.html (module script, MessageChannel)
              └── #active-frame (inner iframe, extension content)
                    └── Extension HTML + React app
```

In code-server, three blockers prevent the inner iframe from being created. A patch script and test helper solve all three.

### Architecture

```
┌─────────────────────────────────────────────┐
│ Playwright Test                              │
│  ├── global-setup.ts  → starts code-server  │
│  ├── patch-webview.sh → patches 2 files     │
│  ├── webview-injector.ts → MessagePort hack  │
│  └── *.spec.ts        → test files          │
├─────────────────────────────────────────────┤
│ code-server (openvscode-server)              │
│  ├── Extension installed via --install-ext   │
│  ├── pre/index.html (patched: SW + CSP)     │
│  └── workbench.js (patched: origin guard)    │
├─────────────────────────────────────────────┤
│ Debrief VS Code Extension                    │
│  ├── Map Panel (editor webview)              │
│  └── Activity Panel (sidebar webview)        │
└─────────────────────────────────────────────┘
```

### The Three Patches

Applied automatically by `tests/e2e/scripts/patch-webview.sh`:

| # | File | What | Why |
|---|------|------|-----|
| 1 | `pre/index.html` | Set `disableServiceWorker = true` | code-server's SW conflicts with the webview host's SW check; `workerReady` never resolves |
| 2 | `pre/index.html` | Comment out CSP meta tag | Modifying the inline script invalidates the SHA-256 hash; browser refuses to execute |
| 3 | `workbench.js` | Remove origin hash guard in `webview-ready` handler | The hash isn't ready when `webview-ready` arrives; message is silently dropped |

### The MessagePort Injection (Blocker 4)

Even with patches 1-3, code-server never calls `resolveWebviewView()` on the extension's provider — a code-server lifecycle bug. The test helper works around this by intercepting the `webview-ready` message and manually sending `content` via the transferred MessagePort.

**Helper**: `tests/e2e/helpers/webview-injector.ts`

```typescript
import { activateWebviewWithContent } from './helpers/webview-injector';

test('webview interaction', async ({ codeServerPage }) => {
  const page = codeServerPage.page;
  const inner = await activateWebviewWithContent(page, MY_HTML);

  // Now interact with content inside the webview
  await expect(inner.locator('.my-element')).toHaveText('Expected');
  await inner.locator('button').click();
});
```

### Real Extension Content

For testing with the actual extension bundles (not injected HTML):

**Map Panel** (editor webview):
- Opens when a STAC plot is clicked in the tree view
- Uses **route interception** for `vscode-resource.vscode-cdn.net` URLs:

```typescript
await page.route('**/*.vscode-resource.vscode-cdn.net/**', async (route) => {
  const url = route.request().url();
  const pathMatch = url.match(/vscode-cdn\.net(\/.*)/);
  const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  if (filePath && existsSync(filePath)) {
    const body = readFileSync(filePath);
    await route.fulfill({ body, contentType: inferContentType(filePath) });
  } else {
    await route.continue();
  }
});
```

**Activity Panel** (sidebar webview):
- Uses MessagePort injection with the real bundle inlined
- `buildActivityPanelHtml()` reads the bundle from the installed extension

**Finding the correct sidebar frame:**

```typescript
const hostFrames = page.frames().filter(f =>
  f.url().includes('workbench/contrib/webview/browser/pre')
);
for (const host of hostFrames) {
  const child = host.childFrames()[0];
  const isActivityPanel = await child.evaluate(
    () => !!document.querySelector('.debrief-activity-panel')
  ).catch(() => false);
  if (isActivityPanel) { sidebarFrame = child; break; }
}
```

### Page Objects

| Page Object | Location | Purpose |
|-------------|----------|---------|
| `CodeServerPage` | `tests/e2e/models/code-server-page.ts` | VS Code chrome: command palette, Quick Open, notifications, file opening |
| `DebriefWebview` | `tests/e2e/models/debrief-webview.ts` | Debrief content: map container, track features, catalog panel, layer list |

### Running

```bash
# Apply patches + run all webview tests
bash tests/e2e/scripts/patch-webview.sh
xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts

# Single test file
npx playwright test --config tests/e2e/playwright.config.ts test-load-display

# With Playwright UI (headed mode)
E2E_HEADED=1 npx playwright test --config tests/e2e/playwright.config.ts --ui

# With trace recording
npx playwright test --config tests/e2e/playwright.config.ts --trace on
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CODE_SERVER_URL` | `http://localhost:8080` | Base URL for code-server |
| `CODE_SERVER_AUTH` | `none` | Authentication mode |
| `E2E_HEADED` | unset | Set to `1` for headed Chromium (required for webview tests) |
| `CLAUDE_CODE` | unset | Set to `1` to use `@sparticuz/chromium` bundled binary |

### DOM Selectors Reference

| Selector | Component | Used By |
|----------|-----------|---------|
| `.leaflet-container` | Map container | US1: Load and Display |
| `.leaflet-interactive` | Track features on map | US1: Load and Display |
| `.catalog-overview` | STAC catalog panel | US1: Load and Display |
| `.catalog-overview__timeline` | Catalog timeline | US1: Load and Display |
| `.debrief-feature-row--selected` | Selected track highlight | US1: Load and Display |
| `.debrief-activity-panel` | Activity sidebar root | All stories |
| `.debrief-activity-panel__section-header` | Collapsible section headers | US2: Tool Execution |
| `.time-controller` | TimeController widget | US2: Tool Execution |
| `.time-controller__play-pause` | Play/pause button | US2: Tool Execution |
| `.tool-result-item` | Analysis result entries | US2: Tool Execution |
| `.provenance-source` | Provenance lineage markers | US2: Tool Execution |
| `.notification-toast-container` | VS Code notification toasts | US3: Error Feedback |

## 4. CI Configuration

### Storybook E2E in CI

Already integrated in `.github/workflows/ci.yml`. The Storybook dev server starts, Playwright runs against it, and results are reported.

### VS Code Webview E2E in CI

Runs as a separate CI job (see `specs/005-e2e-workflow-tests/plan.md`, Decision 8):

1. Build extension VSIX
2. Start code-server with extension sideloaded
3. Run `patch-webview.sh`
4. Run Playwright tests with `xvfb-run`

### Chromium in Cloud Sessions

Standard Playwright browser downloads are blocked in sandboxed environments. The project uses `@sparticuz/chromium` as a workaround:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test
npm install @sparticuz/chromium
```

Config requires `executablePath` pointing to the extracted binary and sandbox-disable flags. See `docs/project_notes/playwright-installation-research.md` for full details.

## 5. Adding E2E Tests for a New Feature (Checklist)

### For a Storybook component:

1. Create the component with `data-testid` attributes on key elements
2. Create a Storybook story with theme variant stories
3. Create `shared/components/e2e/{Component}.spec.ts`
4. Test default rendering, all three theme variants, and user interactions
5. Run `pnpm --filter @debrief/components test:e2e {Component}`
6. Capture screenshots to `specs/{feature}/evidence/screenshots/`

### For a VS Code extension workflow:

1. Identify which webview panels are involved (editor, sidebar, or both)
2. Add DOM selectors to the **Selectors Reference** above
3. Create or extend page objects in `tests/e2e/models/`
4. Create test file in `tests/e2e/test-{workflow}.spec.ts`
5. Use `frameLocator` chaining for webview content access
6. Run with `xvfb-run` for headed mode (required for webview iframe creation)
7. Capture screenshots to `tests/e2e/evidence/`

### Speckit workflow:

When using `/speckit.plan`, fill in both the "Storybook E2E Testing" section (for components) and the "VS Code Webview E2E Testing" section (for extension workflows). `/speckit.tasks` will generate the corresponding test tasks automatically.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `#active-frame` not created | Patches not applied | Run `bash tests/e2e/scripts/patch-webview.sh` |
| Webview loads but content is blank | `resolveWebviewView` not called | Use `webview-injector.ts` helper |
| `vscode-resource` URLs 404 | DNS unreachable in sandbox | Add route interception (see Section 3) |
| Chromium won't launch | Standard download blocked | Use `@sparticuz/chromium` (see Section 4) |
| Tests pass locally, fail in CI | Missing `xvfb-run` | Wrap command: `xvfb-run --auto-servernum npx playwright test ...` |
| Wrong sidebar frame selected | Multiple webview hosts | Use frame-finding pattern (see Section 3) |

## 7. File Reference

| File | Purpose |
|------|---------|
| `tests/e2e/playwright.config.ts` | Playwright config for VS Code webview tests |
| `tests/e2e/global-setup.ts` | Starts code-server before tests |
| `tests/e2e/global-teardown.ts` | Stops code-server after tests |
| `tests/e2e/scripts/patch-webview.sh` | Applies the three code-server patches |
| `tests/e2e/helpers/webview-injector.ts` | MessagePort injection for webview content |
| `tests/e2e/models/code-server-page.ts` | Page object for VS Code chrome |
| `tests/e2e/models/debrief-webview.ts` | Page object for Debrief webview content |
| `tests/e2e/fixtures/base.ts` | Custom Playwright fixtures |
| `shared/components/playwright.config.ts` | Playwright config for Storybook tests |
| `shared/components/e2e/*.spec.ts` | Storybook component E2E tests |
| `.specify/templates/plan-template.md` | Plan template with E2E sections |
| `.specify/templates/tasks-template.md` | Tasks template with E2E task patterns |
| `docs/project_notes/webview-e2e-research.md` | Original research notes (detailed) |
| `docs/project_notes/playwright-installation-research.md` | Chromium installation research |
