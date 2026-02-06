/**
 * E2E Test: Error Feedback Workflow (User Story 3 — P3)
 *
 * Verifies that errors from any service in the pipeline surface as
 * user-visible feedback in the VS Code interface. Error handling across
 * service boundaries is where silent failures are most likely.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 3
 */
import { test, expect } from './fixtures/base';
import path from 'path';

const EVIDENCE_DIR = path.join(
  __dirname,
  '../../specs/005-e2e-workflow-tests/evidence/screenshots'
);

test.describe('US3: Error Feedback Workflow', () => {
  /**
   * Acceptance Scenario 1:
   * Given a malformed REP file in the workspace,
   * When the user attempts to open it,
   * Then VS Code displays an error notification and no corrupt data
   * is added to the catalog.
   */
  test('T022: open malformed REP file shows error notification, no corrupt data', async ({
    codeServerPage,
  }) => {
    // Record initial catalog state
    const frame = await codeServerPage.getWebviewFrame();
    const catalogItemsBefore = await frame
      .locator('.catalog-plot-item')
      .count()
      .catch(() => 0);

    // Attempt to open the malformed REP file
    await codeServerPage.openFile('samples/malformed.rep');

    // Wait for error notification to appear
    // VS Code should display a notification about the parse error
    await codeServerPage.waitForNotification('error', 10_000).catch(() => {
      // Also check for error in the webview itself
    });

    // Check for error in VS Code notifications
    const notifications = await codeServerPage.getNotifications();
    const hasErrorNotification = notifications.some(
      (n) =>
        n.toLowerCase().includes('error') ||
        n.toLowerCase().includes('failed') ||
        n.toLowerCase().includes('invalid') ||
        n.toLowerCase().includes('malformed')
    );

    // Also check for error display in the webview
    const webviewError = frame.locator('.error-notification');
    const hasWebviewError = (await webviewError.count()) > 0;

    // At least one error indicator should be present
    expect(hasErrorNotification || hasWebviewError).toBe(true);

    // Verify no corrupt data was added to the catalog
    const catalogItemsAfter = await frame
      .locator('.catalog-plot-item')
      .count()
      .catch(() => 0);
    expect(catalogItemsAfter).toBeLessThanOrEqual(catalogItemsBefore);
  });

  /**
   * Acceptance Scenario 2:
   * Given a loaded track,
   * When the user runs an incompatible analysis tool,
   * Then the system displays a clear mismatch message.
   */
  test('T023: run incompatible tool shows clear mismatch message', async ({
    codeServerPage,
  }) => {
    // Load a REP file first
    await codeServerPage.openFile('samples/boat1.rep');

    const frame = await codeServerPage.getWebviewFrame();

    // Wait for features
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Select a track
    await frame.locator('.leaflet-interactive').first().click({ force: true });

    // Attempt to run an incompatible tool
    // This should be a tool that requires a different feature kind
    await codeServerPage.executeCommand('Debrief: Run Incompatible Tool');

    // Wait for error feedback
    // Could appear as VS Code notification or webview error
    await codeServerPage
      .waitForNotification('incompatible', 10_000)
      .catch(() => {});

    // Check for mismatch-related error messages
    const notifications = await codeServerPage.getNotifications();
    const hasMismatchError = notifications.some(
      (n) =>
        n.toLowerCase().includes('incompatible') ||
        n.toLowerCase().includes('mismatch') ||
        n.toLowerCase().includes('requires') ||
        n.toLowerCase().includes('not supported')
    );

    // Also check webview error display
    const webviewError = frame.locator('.error-notification');
    const hasWebviewError = (await webviewError.count()) > 0;

    // At least one error indicator should be present
    expect(hasMismatchError || hasWebviewError).toBe(true);
  });

  /**
   * T024: Screenshot capture for evidence.
   * Captures an error notification for the evidence directory.
   */
  test('T024: capture evidence screenshot of error notification', async ({
    codeServerPage,
    page,
  }) => {
    // Open malformed file to trigger error
    await codeServerPage.openFile('samples/malformed.rep');

    // Wait for error notification
    await codeServerPage.waitForNotification('error', 10_000).catch(() => {});

    // Brief pause for notification animation
    await page.waitForTimeout(1_000);

    // Capture screenshot
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'error-notification.png'),
      fullPage: false,
    });
  });
});
