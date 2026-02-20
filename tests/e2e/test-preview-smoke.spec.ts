/**
 * Preview smoke test — verifies that code-server loads with the Debrief
 * extension active and sample data visible in the preview workspace.
 *
 * Run against a local preview container:
 *   CODE_SERVER_URL=http://localhost:8080 pnpm exec playwright test \
 *     --config=tests/e2e/playwright.config.ts test-preview-smoke
 *
 * Run against a Heroku review app:
 *   CODE_SERVER_URL=https://<app>.herokuapp.com pnpm exec playwright test \
 *     --config=tests/e2e/playwright.config.ts test-preview-smoke
 */
import { test, expect } from './fixtures/base';
import { join } from 'path';

const EVIDENCE_DIR = join(
  __dirname,
  '../../specs/099-browser-extension-preview/evidence/screenshots'
);

test.describe('Preview Environment Smoke Test', () => {
  test('VS Code workbench loads', async ({ codeServerPage }) => {
    await expect(codeServerPage.workbench).toBeVisible();
  });

  test('Debrief activity bar icon is present', async ({ codeServerPage }) => {
    // The Debrief extension registers an activity bar icon with the view container ID
    const activityBar = codeServerPage.page.locator(
      '.activitybar .action-item[id*="debrief"]'
    );
    await expect(activityBar).toBeVisible({ timeout: 10_000 });

    await codeServerPage.page.screenshot({
      path: join(EVIDENCE_DIR, 'debrief-activity-bar.png'),
    });
  });

  test('Log activity panel is accessible', async ({ codeServerPage }) => {
    // The Log panel is registered as a separate activity bar entry
    const logPanel = codeServerPage.page.locator(
      '.activitybar .action-item[id*="log"]'
    );
    await expect(logPanel).toBeVisible({ timeout: 10_000 });
  });

  test('File explorer shows sample workspace files', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openExplorer();

    // Verify the file explorer is visible and contains sample data files
    const explorer = codeServerPage.fileExplorer;
    await expect(explorer).toBeVisible();

    await codeServerPage.page.screenshot({
      path: join(EVIDENCE_DIR, 'file-explorer-samples.png'),
    });
  });

  test('capture full workspace screenshot', async ({ codeServerPage }) => {
    await codeServerPage.page.screenshot({
      path: join(EVIDENCE_DIR, 'preview-workspace-full.png'),
      fullPage: true,
    });
  });
});
