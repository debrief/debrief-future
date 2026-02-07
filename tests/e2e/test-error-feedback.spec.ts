/**
 * E2E Test: Error Feedback Workflow (User Story 3 — P3)
 *
 * Verifies that errors from any service in the pipeline surface as
 * user-visible feedback in the VS Code interface. Error handling across
 * service boundaries is where silent failures are most likely.
 *
 * STATUS: Commented out — requires Debrief VS Code extension with error
 * handling wired up. See docs/e2e-test-restoration-requirements.md for prerequisites.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 3
 */
import { test } from './fixtures/base';

// All tests in this file require:
//   - Debrief VS Code extension installed and activated
//   - debrief-io service with error reporting
//   - Extension error notification display
//   - Extension commands: 'Debrief: Run Incompatible Tool'
//
// These tests are commented out until the extension error handling is wired up.

test.describe.skip('US3: Error Feedback Workflow', () => {
  test('T022: open malformed REP file shows error notification, no corrupt data', async ({
    codeServerPage,
  }) => {
    const frame = await codeServerPage.getWebviewFrame();
    await codeServerPage.openFile('samples/malformed.rep');
    await codeServerPage.waitForNotification('error', 10_000).catch(() => {});
    const notifications = await codeServerPage.getNotifications();
    // expect(hasErrorNotification || hasWebviewError).toBe(true);
  });

  test('T023: run incompatible tool shows clear mismatch message', async ({
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
    // expect(hasMismatchError || hasWebviewError).toBe(true);
  });

  test('T024: capture evidence screenshot of error notification', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openFile('samples/malformed.rep');
    await codeServerPage.waitForNotification('error', 10_000).catch(() => {});
    // await page.screenshot({ path: ..., fullPage: false });
  });
});
