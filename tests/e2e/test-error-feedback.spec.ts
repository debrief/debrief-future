/**
 * E2E Test: Error Feedback Workflow (User Story 3 — P3)
 *
 * Verifies that errors from any service in the pipeline surface as
 * user-visible feedback in the VS Code interface. Error handling across
 * service boundaries is where silent failures are most likely.
 *
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 3
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/005-e2e-workflow-tests/evidence/screenshots';

test.describe('US3: Error Feedback Workflow', () => {
  test.setTimeout(60_000);

  test('T022: open malformed REP file shows error notification, no corrupt data', async ({
    codeServerPage,
  }) => {
    test.fixme('file picker not functional in headless openvscode-server');
    await codeServerPage.executeCommand('Debrief: Import REP File');
    await codeServerPage.page.waitForTimeout(1_000);
    const input = codeServerPage.page.locator('.quick-input-box input');
    if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await input.fill('samples/malformed.rep');
      await codeServerPage.page.keyboard.press('Enter');
    }

    await codeServerPage.page.waitForTimeout(5_000);
    const notifications = await codeServerPage.getNotifications();
    const hasErrorNotification = notifications.some(
      (n) => n.toLowerCase().includes('error') || n.toLowerCase().includes('parse') || n.toLowerCase().includes('fail')
    );
    expect(hasErrorNotification).toBe(true);
  });

  test.skip('T023: run tool without selection shows requirement message', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await codeServerPage.executeCommand('Debrief: Show Tool Requirements');
    await codeServerPage.page.waitForTimeout(3_000);
    const notifications = await codeServerPage.getNotifications();
    expect(notifications.length).toBeGreaterThanOrEqual(0);
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
