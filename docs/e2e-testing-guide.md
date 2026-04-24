# E2E Testing Guide

How to write and run end-to-end tests for Debrief features that involve UI components. Covers **Storybook component tests** (isolated React components), **web-shell workflow tests** (full extension workflows via a standalone React host — the default path for extension E2E and blog/PR screenshots), and **VS Code webview tests** (full extension running in code-server — optional, for chrome-level concerns only).

## 1. Three Kinds of E2E Test

| Kind | What It Tests | Runs In | Test Location |
|------|--------------|---------|---------------|
| **Storybook E2E** | Individual React components via Storybook stories | Storybook dev server (`localhost:6006`) | `shared/components/e2e/` |
| **Web-Shell E2E** (default for extension workflows) | Full workflows using the same shared components as the VS Code extension, hosted in a standalone React app (MapView, FilterBar, FeatureList, drawing tools, LogPanel, PropertiesPanel, GoldenLayout, etc.) | `apps/web-shell` (Vite dev server) | `apps/web-shell/playwright/tests/` |
| **VS Code Webview E2E** (optional, chrome-level only) | Tests that genuinely require real VS Code chrome (command palette, sidebar host, notification toasts) | code-server (headless VS Code) | `tests/e2e/` |

**When to use which:**

- Adding or modifying a **shared component** (map, timeline, chart, feature list) → Storybook E2E
- Adding or modifying an **extension workflow** (open file → view tracks → run tool → edit properties) → **Web-Shell E2E**. This is also the source of record for the screenshots and GIFs that land in `specs/[feature]/evidence/screenshots/` and later in blog posts.
- Testing behaviour that depends on the real VS Code chrome (command palette invocation, sidebar host lifecycle, native notifications) → VS Code Webview E2E. For everything else prefer web-shell — the code-server path was explored in #142, is unreliable, and is not the source of blog/PR screenshots.
- Major features often need **both** Storybook tests (component correctness) and Web-Shell tests (workflow integration + screenshots).

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

## 3. Web-Shell E2E Tests

### Overview

`apps/web-shell/` is a small Vite/React app that mounts the same shared components the VS Code extension uses — MapView, FilterBar, FeatureList, drawing tools, GoldenLayout panels, LogPanel, PropertiesPanel, TimeController. Playwright drives it in a regular browser page, which avoids every class of flake we hit when driving code-server (service-worker collisions, CSP hash invalidation, `resolveWebviewView` lifecycle bugs, etc.). This is the default path for full-workflow E2E tests and is the **source of record** for the screenshots and GIFs that land in `specs/[feature]/evidence/screenshots/` and later in blog posts.

### Test Layout

```
apps/web-shell/
  playwright/
    playwright.config.ts          # config — uses bundled chromium when CLAUDE_CODE=1
    global-setup.ts
    pages/
      AnalysisPage.ts             # panels, filters, tool runs, properties form
      CatalogPage.ts              # STAC catalog browsing
      index.ts
    tests/
      properties-screenshots.spec.ts   # multi-theme + interaction GIF (reference pattern)
      drawing.spec.ts                  # workflow interaction pattern
      plot-load.spec.ts                # load + render pattern
      ...
  run-playwright.mjs              # cloud runner: extracts @sparticuz/chromium then runs tests
```

### Creating a Test

Model on `properties-screenshots.spec.ts` (screenshot + GIF capture) or `drawing.spec.ts` (workflow interaction). Write evidence directly into the feature's evidence folder:

```typescript
// apps/web-shell/playwright/tests/my-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../../specs/NNN-my-feature/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

test('captures the key workflow', async ({ page }) => {
  await page.goto('/');
  // ... interact using page objects from apps/web-shell/playwright/pages/
  await page.screenshot({ path: `${EVIDENCE_DIR}/workflow-default.png` });
});
```

Reuse page objects in `apps/web-shell/playwright/pages/` rather than re-implementing selectors — extend them with new accessors where needed.

### Theme Variants

For multi-theme screenshots (`component-light.png`, `component-dark.png`, `component-vscode.png`), inject a small CSS override that sets the VS Code CSS variables on `:root`. See `properties-screenshots.spec.ts`'s `applyTheme()` helper for the canonical pattern.

### Interaction GIFs

Enable `recordVideo` in the test's context options, drive the workflow, then convert the resulting `.webm` to `.gif` (ffmpeg). `properties-screenshots.spec.ts` shows the full pattern including the move + rename step.

### Running

```bash
# Cloud session (Claude Code) — uses bundled @sparticuz/chromium
cd apps/web-shell && node run-playwright.mjs

# Single test file
cd apps/web-shell && node run-playwright.mjs my-workflow

# Local dev (macOS/Windows) — requires system Chromium
pnpm --filter @debrief/web-shell test
pnpm --filter @debrief/web-shell test my-workflow

# With Playwright UI
pnpm --filter @debrief/web-shell test:ui
```

### Speckit Integration

`plan-template.md` and `tasks-template.md` have a "Web-Shell E2E Testing" section. When `/speckit.plan` identifies an extension workflow, it populates that table. When `/speckit.tasks` generates tasks, it emits web-shell test + screenshot-capture tasks that write directly into the feature's evidence directory.

## 4. VS Code Webview E2E Tests (optional — chrome-level only)

> **Status**: Explored in #142 and documented below for reference. This path is **unreliable** and is **not** the source of record for screenshots or blog media — use web-shell (§3) for workflow E2E and screenshot capture. Reach for this path only when a test must exercise real VS Code chrome that the web-shell cannot simulate (command palette, sidebar host lifecycle, native notification toasts, VSIX install flows).

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

## 5. CI Configuration

### Storybook E2E in CI

Already integrated in `.github/workflows/ci.yml`. The Storybook dev server starts, Playwright runs against it, and results are reported.

### Web-Shell E2E in CI

Runs as part of the main CI pipeline — see `CLAUDE.md` "Before Pushing" for the exact step:

```sh
cd apps/web-shell && node run-playwright.mjs
```

The runner extracts `@sparticuz/chromium` on first run, starts the Vite dev server via Playwright's `webServer` config, then runs the suite.

### VS Code Webview E2E in CI (optional)

Not currently wired into the main CI gate. Historical reference: `specs/005-e2e-workflow-tests/plan.md`, Decision 8 documented a separate CI job that built the extension VSIX, started code-server with it sideloaded, ran `patch-webview.sh`, and invoked Playwright via `xvfb-run`. If you re-enable this for chrome-level tests, follow that pattern.

### Chromium in Cloud Sessions

Standard Playwright browser downloads are blocked in sandboxed environments. The project uses `@sparticuz/chromium` as a workaround:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test
npm install @sparticuz/chromium
```

Config requires `executablePath` pointing to the extracted binary and sandbox-disable flags. See `docs/project_notes/playwright-installation-research.md` for full details.

## 6. Adding E2E Tests for a New Feature (Checklist)

### For a Storybook component:

1. Create the component with `data-testid` attributes on key elements
2. Create a Storybook story with theme variant stories
3. Create `shared/components/e2e/{Component}.spec.ts`
4. Test default rendering, all three theme variants, and user interactions
5. Run `pnpm --filter @debrief/components test:e2e {Component}`
6. Capture screenshots to `specs/{feature}/evidence/screenshots/`

### For an extension workflow (default — web-shell):

1. Identify which panels and shared components are exercised (map, filter bar, feature list, drawing, properties, log, catalog, time controller, …)
2. Reuse/extend page objects in `apps/web-shell/playwright/pages/` (`AnalysisPage`, `CatalogPage`); add new selectors there rather than duplicating
3. Create `apps/web-shell/playwright/tests/{workflow}.spec.ts` — model on `properties-screenshots.spec.ts` (screenshots + interaction GIF) or `drawing.spec.ts` (workflow interaction)
4. Write screenshots and GIFs **directly** into `specs/{feature}/evidence/screenshots/` from the spec file (see `properties-screenshots.spec.ts` for the canonical path-resolution pattern)
5. Run with `cd apps/web-shell && node run-playwright.mjs {workflow}` (cloud) or `pnpm --filter @debrief/web-shell test {workflow}` (local)

### For a chrome-level VS Code webview test (optional):

Only when a test genuinely requires real VS Code chrome that web-shell cannot simulate.

1. Identify which webview panels are involved (editor, sidebar, or both)
2. Add DOM selectors to the **Selectors Reference** above
3. Create or extend page objects in `tests/e2e/models/`
4. Create test file in `tests/e2e/test-{workflow}.spec.ts`
5. Use `frameLocator` chaining for webview content access
6. Run with `xvfb-run` for headed mode (required for webview iframe creation)
7. Capture evidence to `tests/e2e/evidence/` — but do **not** rely on this path for blog/PR screenshots; produce those via web-shell instead.

### Speckit workflow:

When using `/speckit.plan`, fill in:
- **"Storybook E2E Testing"** for isolated component tests
- **"Web-Shell E2E Testing"** for full extension workflows and any screenshots destined for evidence/blog

`/speckit.tasks` will generate the corresponding test tasks automatically, including screenshot-capture tasks that write into the feature's evidence directory.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Chromium won't launch | Standard download blocked | Use `@sparticuz/chromium` via `apps/web-shell/run-playwright.mjs` (see §5) |
| Web-shell test starts but page is empty | Vite dev server not ready | Check `playwright.config.ts` `webServer` block; increase `timeout` if cold-boot is slow |
| Screenshot written to the wrong folder | Incorrect relative path from spec file | Match the pattern in `properties-screenshots.spec.ts` — resolve against `fileURLToPath(import.meta.url)` |
| Theme override isn't applied | VS Code CSS variables not set on `:root` | Use the `applyTheme()` helper pattern from `properties-screenshots.spec.ts` |
| **Chrome-level only:** `#active-frame` not created | Patches not applied | Run `bash tests/e2e/scripts/patch-webview.sh` |
| **Chrome-level only:** Webview loads but content is blank | `resolveWebviewView` not called | Use `webview-injector.ts` helper |
| **Chrome-level only:** `vscode-resource` URLs 404 | DNS unreachable in sandbox | Add route interception (see §4) |
| **Chrome-level only:** Tests pass locally, fail in CI | Missing `xvfb-run` | Wrap command: `xvfb-run --auto-servernum npx playwright test ...` |
| **Chrome-level only:** Wrong sidebar frame selected | Multiple webview hosts | Use frame-finding pattern (see §4) |

## 8. File Reference

### Web-Shell E2E (default path)

| File | Purpose |
|------|---------|
| `apps/web-shell/playwright/playwright.config.ts` | Playwright config — uses bundled chromium when `CLAUDE_CODE=1` |
| `apps/web-shell/playwright/global-setup.ts` | Starts the Vite dev server before tests |
| `apps/web-shell/playwright/pages/AnalysisPage.ts` | Page object for panels, filters, tool runs, properties form |
| `apps/web-shell/playwright/pages/CatalogPage.ts` | Page object for STAC catalog browsing |
| `apps/web-shell/playwright/tests/*.spec.ts` | Web-shell workflow E2E tests |
| `apps/web-shell/run-playwright.mjs` | Cloud runner: extracts `@sparticuz/chromium`, then runs tests |

### Storybook E2E

| File | Purpose |
|------|---------|
| `shared/components/playwright.config.ts` | Playwright config for Storybook tests |
| `shared/components/e2e/*.spec.ts` | Storybook component E2E tests |

### VS Code Webview E2E (optional — chrome-level only)

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

### Speckit templates and research notes

| File | Purpose |
|------|---------|
| `.specify/templates/plan-template.md` | Plan template with E2E sections |
| `.specify/templates/tasks-template.md` | Tasks template with E2E task patterns |
| `.specify/templates/e2e-test-template.ts` | Storybook E2E boilerplate |
| `docs/project_notes/webview-e2e-research.md` | Original research notes on the code-server path |
| `docs/project_notes/playwright-installation-research.md` | Chromium installation research |
