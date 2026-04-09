/**
 * E2E: Tabular Results Panel — canonical VS Code webview test
 *
 * Feature: 178-vscode-tabular-results
 *
 * This test uses the full Hybrid A+D pipeline (CDN interceptor +
 * MessagePort injector) to load the real Debrief extension inside
 * openvscode-server and verify that:
 *
 *   1. The new `debrief-results` view container was registered by the
 *      extension manifest (package.json contributes.viewsContainers.panel).
 *   2. The `debrief.resultsPanel` webview view resolves — `WebviewViewProvider`
 *      is called when the view is focused.
 *   3. The bundled `resultsPanel.js` loads into the webview iframe and
 *      the React app mounts.
 *   4. The initial empty state ("No results to display") is rendered
 *      via the shared `DEFAULT_RESULTS_PANEL_LABELS`.
 *   5. Driving the webview via postMessage produces the expected UI
 *      transitions even inside the real VS Code chrome.
 *
 * The test captures screenshots inside the real VS Code window — with
 * the activity bar, title bar, and panel area visible — so the reader
 * can see exactly where the Results panel lives in VS Code.
 *
 * @see tests/e2e/test-webview-resolve.spec.ts — Patch 3 validation reference
 * @see docs/project_notes/webview-e2e-research.md — Hybrid A+D
 * @see docs/project_notes/code-server-cloud-testing.md — cloud setup
 */
import { test as base, expect } from '@playwright/test';
import { CodeServerPage } from './models/code-server-page';
import { installCdnInterceptor } from './helpers/cdn-interceptor';
import { installWebviewInterceptor } from './helpers/webview-injector';
import { generateWebviewHtml, hasWebviewBundle } from './helpers/extension-content';

/**
 * Custom fixture that installs the CDN interceptor and a single-entry
 * MessagePort interceptor that serves `resultsPanel.js` for every
 * `webview-ready` event.  This deliberately does not queue other
 * bundles — the test only exercises the Results panel view.
 */
const test = base.extend<{ codeServerPage: CodeServerPage }>({
  codeServerPage: async ({ page, context }, use) => {
    await installCdnInterceptor(context);

    if (!hasWebviewBundle('resultsPanel')) {
      throw new Error(
        'Results panel bundle not found — run `pnpm --filter debrief-vscode compile:webview`',
      );
    }
    const html = generateWebviewHtml('resultsPanel');

    const csPage = new CodeServerPage(page);
    await csPage.waitForReady();
    await installWebviewInterceptor(page, { html, allowScripts: true });

    await use(csPage);
  },
});

const SCREENSHOT_DIR =
  'specs/178-vscode-tabular-results/evidence/screenshots';

test.describe('Tabular Results Panel — Real VS Code Webview (Feature 178)', () => {
  test.setTimeout(60_000);

  test('view container registered, webview resolves, bundle mounts, empty state visible', async ({
    codeServerPage,
    page,
  }) => {
    // ── Step 1a: open the VS Code bottom panel area explicitly ──
    //
    // `workbench.action.togglePanel` (Ctrl+J) is a built-in VS Code
    // command that shows/hides the panel area.  We open it first so
    // the panel composite is visible — focusing a view in a hidden
    // panel area does not always auto-show it.
    await page.keyboard.press('Control+KeyJ');
    await page.waitForTimeout(500);

    // ── Step 1b: reveal the Debrief Results view via the command palette ──
    //
    // VS Code auto-generates a focus command for every registered view
    // using the pattern `<viewId>.focus`, labelled "<containerTitle>:
    // Focus on <viewName> View". For our manifest entry:
    //   contributes.viewsContainers.panel[{ id: "debrief-results", title: "Debrief Results" }]
    //   contributes.views["debrief-results"][{ id: "debrief.resultsPanel", name: "Results" }]
    // the focus command is surfaced as "Debrief Results: Focus on Results View".
    //
    // If the view container and view were NOT registered in package.json,
    // this command would not exist — so the fact that `executeCommand`
    // succeeds is itself proof of the extension manifest contribution
    // added in commit 956afcc.
    await codeServerPage.executeCommand('Debrief Results: Focus on Results View');
    await page.waitForTimeout(1_000);

    // ── Step 2: the panel area should be attached and the Debrief
    // Results composite should be its active content ──
    const panelArea = page.locator('.part.panel');
    await expect(panelArea).toBeAttached({ timeout: 10_000 });

    // ── Step 3: a webview iframe must be attached ──
    //
    // This is the key proof that `resolveWebviewView` fired on our new
    // `ResultsPanelViewProvider`. Without Patch 3 (visibility gate),
    // the callback would never fire in headless mode. Without the new
    // view container entry in package.json, no command would exist.
    await expect(page.locator('iframe.webview').first()).toBeAttached({
      timeout: 10_000,
    });

    // ── Step 4: wait for the bundle to render into #active-frame ──
    //
    // The Hybrid A+D interceptor takes over once the iframe loads
    // `pre/index.html`, serves `resultsPanel.js` inline, and the React
    // app mounts. We drill into the frame tree to find the element
    // rendered by the Results panel app.
    let innerFrame: import('@playwright/test').Frame | undefined;
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      for (const frame of page.frames()) {
        if (!frame.url().includes('webview')) continue;
        for (const child of frame.childFrames()) {
          const hasEmpty = await child
            .locator('[data-testid="results-panel-empty"]')
            .first()
            .isVisible()
            .catch(() => false);
          if (hasEmpty) {
            innerFrame = child;
            break;
          }
        }
        if (innerFrame) break;
      }
      if (innerFrame) break;
      await page.waitForTimeout(500);
    }
    expect(innerFrame, 'Results panel empty-state element must render').toBeDefined();

    // Empty-state placeholder text comes from the shared
    // `DEFAULT_RESULTS_PANEL_LABELS.noResults` (feature 177).
    await expect(
      innerFrame!.locator('[data-testid="results-panel-empty"]'),
    ).toContainText(/No results to display/);

    // ── Step 5: capture a screenshot of the empty state inside real VS Code chrome ──
    await codeServerPage.dismissNotifications();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/canonical-01-empty-state-in-vscode.png`,
    });

    // ── Step 6: drive the webview via postMessage to simulate a tool result ──
    //
    // The React app listens for `message` events on `window`. Since we
    // injected the bundle through the MessagePort interceptor, the
    // runtime is a regular browser iframe — we can dispatch fake
    // extension→webview messages directly through `window.postMessage`.
    await innerFrame!.evaluate(() => {
      const dispatch = (data: Record<string, unknown>) => {
        window.dispatchEvent(new MessageEvent('message', { data }));
      };
      dispatch({
        type: 'results:setVisibility',
        payload: { visible: true },
      });
      dispatch({
        type: 'results:setTabs',
        payload: {
          tabs: [
            {
              id: 'tab-track-stats-1',
              title: 'Track Alpha — Stats',
              toolId: 'track-stats',
              displayHint: 'table',
              tableData: [
                { metric: 'total distance nm', value: 12.5 },
                { metric: 'average speed kn', value: 8.3 },
                { metric: 'point count', value: 1247 },
                { metric: 'duration seconds', value: 18360 },
              ],
              isSaved: false,
            },
          ],
          activeTabId: 'tab-track-stats-1',
        },
      });
    });

    // Tab bar and content should appear — proves the stateless webview
    // responds to host messages exactly as it would under the real
    // ResultsPanelService.  Selectors match the shared ChartPanelWrapper
    // DOM (from `@debrief/components`), which is what the webview now
    // renders directly (FR-025 / SC-006).
    await expect(
      innerFrame!.locator('[data-testid="panel-chart"]'),
    ).toBeVisible({ timeout: 5_000 });

    // Unsaved-dot indicator — ChartPanelWrapper renders a span with
    // aria-label="Unsaved result" (from DEFAULT_RESULTS_PANEL_LABELS).
    await expect(
      innerFrame!.locator('[aria-label="Unsaved result"]'),
    ).toBeVisible();

    // TableRenderer content.
    await expect(
      innerFrame!.locator('[data-testid="panel-chart"]'),
    ).toContainText('total distance nm');
    await expect(
      innerFrame!.locator('[data-testid="panel-chart"]'),
    ).toContainText('12.5');

    // ── Step 7: capture a screenshot of the populated panel inside VS Code ──
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/canonical-02-populated-in-vscode.png`,
    });

    // ── Step 8: verify the Save button is enabled for an unsaved tab ──
    // ChartPanelWrapper renders the Save / Save As buttons with aria-labels
    // "Save result" and "Save result as".
    await expect(
      innerFrame!.locator('button[aria-label="Save result"]'),
    ).toBeEnabled();
    await expect(
      innerFrame!.locator('button[aria-label="Save result as"]'),
    ).toBeEnabled();
  });

  test('focus command is contributed and runs without error', async ({
    codeServerPage,
    page,
  }) => {
    // Smaller smoke: if the view container and view were NOT registered
    // in package.json, this command would not exist and the Quick Input
    // would show "No matching commands" instead of running. This test
    // asserts the manifest contribution from the commit.
    await page.keyboard.press('Control+KeyJ');
    await page.waitForTimeout(500);
    await codeServerPage.executeCommand('Debrief Results: Focus on Results View');

    // Panel area attached + webview attached
    await expect(page.locator('.part.panel')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('iframe.webview').first()).toBeAttached({
      timeout: 10_000,
    });
  });
});
