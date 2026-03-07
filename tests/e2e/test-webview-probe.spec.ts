/**
 * Proof-of-concept: webview content injection for E2E testing.
 *
 * Demonstrates Playwright can inject content into VS Code webview's
 * #active-frame and interact with DOM elements inside.
 *
 * Prerequisites: patch-webview.sh must have been run against code-server.
 *
 * @see docs/project_notes/webview-e2e-research.md
 */
import { test, expect } from './fixtures/base';
import {
  activateWebviewWithContent,
  getWebviewHostFrame,
} from './helpers/webview-injector';

const TEST_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>E2E Test</title></head>
<body>
  <h1 data-testid="heading">Webview E2E Test</h1>
  <div data-testid="counter-section">
    <span id="counter" data-testid="counter">0</span>
    <button id="inc" data-testid="increment-btn">+</button>
  </div>
  <div data-testid="input-section">
    <input id="text-in" data-testid="text-input" placeholder="Type..." />
    <span id="echo" data-testid="echo"></span>
  </div>
  <script>
    let count = 0;
    document.getElementById('inc').addEventListener('click', () => {
      count++;
      document.getElementById('counter').textContent = String(count);
    });
    document.getElementById('text-in').addEventListener('input', (e) => {
      document.getElementById('echo').textContent = e.target.value;
    });
  </script>
</body>
</html>`;

test.describe('Webview E2E Proof of Concept', () => {
  // Skip: patch-webview.sh targets version-specific minified variable names
  // in openvscode-server, making it unreliable across versions. The same
  // webview content interactions are covered by web-shell E2E tests.
  test.skip('POC-01: inject content and interact with DOM', async ({ codeServerPage }) => {
    const page = codeServerPage.page;

    const inner = await activateWebviewWithContent(page, TEST_HTML);
    expect(inner).not.toBeNull();
    if (!inner) return;

    // Read heading
    const heading = inner.locator('[data-testid="heading"]');
    await expect(heading).toHaveText('Webview E2E Test');
    console.log('  ✓ Heading readable');

    // Read counter initial state
    const counter = inner.locator('[data-testid="counter"]');
    await expect(counter).toHaveText('0');

    // Click increment
    await inner.locator('[data-testid="increment-btn"]').click();
    await expect(counter).toHaveText('1');
    console.log('  ✓ Button click increments counter');

    // Type in input
    await inner.locator('[data-testid="text-input"]').fill('Hello E2E');
    await expect(inner.locator('[data-testid="echo"]')).toHaveText('Hello E2E');
    console.log('  ✓ Input echo works');

    // Execute JS in inner frame
    const result = await inner.evaluate(() => ({
      title: document.title,
      hasCounter: !!document.getElementById('counter'),
    }));
    expect(result.title).toBe('E2E Test');
    expect(result.hasCounter).toBe(true);
    console.log('  ✓ JS evaluation inside inner frame works');
  });

  // Skip: requires patch-webview.sh to remove origin hash guard, which depends
  // on version-specific minified variable names in openvscode-server
  test.skip('POC-02: frameLocator pattern for webview access', async ({ codeServerPage }) => {
    const page = codeServerPage.page;

    const inner = await activateWebviewWithContent(page, TEST_HTML);
    expect(inner).not.toBeNull();

    // Verify #active-frame exists in host
    const hostFrame = getWebviewHostFrame(page);
    expect(hostFrame).toBeDefined();
    const hasActive = await hostFrame!.evaluate(
      () => !!document.getElementById('active-frame')
    );
    expect(hasActive).toBe(true);
    console.log('  ✓ #active-frame exists in host frame');

    // frameLocator chaining pattern (what real tests use)
    const webview = page
      .frameLocator('iframe.webview')
      .first()
      .frameLocator('#active-frame');

    await expect(webview.locator('[data-testid="heading"]')).toHaveText('Webview E2E Test');
    console.log('  ✓ frameLocator chaining works');
  });
});
