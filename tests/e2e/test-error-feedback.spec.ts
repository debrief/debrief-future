/**
 * E2E Test: Error Feedback Workflow (User Story 3 — P3)
 *
 * Verifies that errors from any service in the pipeline surface as
 * user-visible feedback in the VS Code interface. Error handling across
 * service boundaries is where silent failures are most likely.
 *
 * FIXME: 2026-03-06 — T022/T023 marked fixme. Opening a .rep file via Quick
 * Open (Ctrl+P) opens it as plain text — it does NOT trigger the Debrief
 * extension's import/parse pipeline. T024 (screenshot-only) remains active.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 3
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/005-e2e-workflow-tests/evidence/screenshots';

test.describe('US3: Error Feedback Workflow', () => {
  // openFile opens .rep as text, not via the Debrief extension
  test.fixme('T022: open malformed REP file shows error notification, no corrupt data', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/malformed.rep');
    // Wait for error notification from the io service parse failure
    await codeServerPage.waitForNotification('error', 10_000).catch(() => {});
    const notifications = await codeServerPage.getNotifications();
    const hasErrorNotification = notifications.some(
      (n) => n.toLowerCase().includes('error') || n.toLowerCase().includes('parse')
    );
    // Also check webview for error display
    const frame = await codeServerPage.getWebviewFrame().catch(() => null);
    const hasWebviewError = frame
      ? await frame.locator('.error-notification').isVisible().catch(() => false)
      : false;
    expect(hasErrorNotification || hasWebviewError).toBe(true);
  });

  test.fixme('T023: run incompatible tool shows clear mismatch message', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Incompatible Tool');
    await codeServerPage
      .waitForNotification('incompatible', 10_000)
      .catch(() => {});
    const notifications = await codeServerPage.getNotifications();
    const hasMismatchError = notifications.some(
      (n) => n.toLowerCase().includes('incompatible') || n.toLowerCase().includes('mismatch')
    );
    const hasWebviewError = await frame
      .locator('.error-notification')
      .isVisible()
      .catch(() => false);
    expect(hasMismatchError || hasWebviewError).toBe(true);
  });

  test('T024: capture evidence screenshot of error notification', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openFile('samples/malformed.rep');
    await codeServerPage.waitForNotification('error', 10_000).catch(() => {});
    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-error.png`,
      fullPage: false,
    });
  });
});
