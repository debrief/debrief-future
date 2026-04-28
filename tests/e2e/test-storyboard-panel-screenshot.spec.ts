/**
 * Capture the Storyboard panel rendered inside VS Code with a plot
 * loaded (Feature 234, US2 — FR-015 supplement).
 *
 * The analyst's workflow needs the Storyboard panel AND the map view
 * visible at the same time — that's how they choose the zoom viewport
 * for new scenes and verify the viewport for existing scenes. So the
 * canonical evidence shot is the workbench layout with both panes
 * populated.
 *
 * **CI-skipped — evidence-capture only, not a regression gate.** The
 * captures it produces (`vscode-debrief-sidebar.png`,
 * `vscode-storyboard-panel.png`) are committed artefacts under
 * `specs/218-storyboarding-edit/evidence/screenshots/`. The
 * `CodeServerPage.openPlotViaStacTree` helper this spec relies on
 * targets the palette command `Focus on STAC Stores`, which doesn't
 * register the same way under openvscode-server 1.109.5 (the CI
 * version) as it does under code-server 4.117.0 (cloud sessions) —
 * the diagnostic capture at `tests/e2e/evidence/debug-focus-stac-pane-failed.png`
 * shows "No matching results" against 1.109. Refreshing the screenshots
 * is a manual workflow step (run against a local code-server / dev
 * box) rather than a CI gate. Re-enable when the helper is hardened
 * against both VS Code versions, or when the screenshots need to
 * regenerate as part of a normal test run.
 *
 * Run locally via:
 *   bash tests/e2e/scripts/cloud-e2e-setup.sh --setup-only
 *   E2E_REFRESH_VSCODE_SCREENSHOTS=1 \
 *   CHROMIUM_PATH=/tmp/chromium CODE_SERVER_URL=http://localhost:8080 \
 *     pnpm exec playwright test --config tests/e2e/playwright.config.ts \
 *       tests/e2e/test-storyboard-panel-screenshot.spec.ts
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CodeServerPage } from './models/code-server-page';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../specs/218-storyboarding-edit/evidence/screenshots',
);

test.setTimeout(180_000);

test.describe('Storyboard panel + map evidence capture (#234 US2 — manual)', () => {
  test.skip(
    process.env.E2E_REFRESH_VSCODE_SCREENSHOTS !== '1',
    'Evidence-capture only. Set E2E_REFRESH_VSCODE_SCREENSHOTS=1 to run; see header comment.',
  );

  test('captures sidebar (no plot) + storyboard+map (with Exercise Alpha loaded)', async ({
    page,
  }) => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    const cs = new CodeServerPage(page);

    // ── Boot — uses ?folder= query param + workbench wait ─────────────
    await cs.waitForReady();
    await page.waitForTimeout(2_000);

    // ── Snapshot A: Debrief sidebar with no plot loaded ───────────────
    // Storyboard view hidden by `when: debrief.plotOpen` until plot loads.
    const debriefTab = page
      .getByRole('tab', { name: 'Debrief', exact: true })
      .first();
    await debriefTab.waitFor({ state: 'visible', timeout: 60_000 });
    await debriefTab.click();
    await page.waitForTimeout(2_000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'vscode-debrief-sidebar.png'),
      fullPage: false,
    });

    // ── Open Exercise Alpha via the proven STAC-tree helper ───────────
    await cs.openPlotViaStacTree('Exercise Alpha');
    await page.waitForTimeout(3_000);

    // Surface the Storyboard view via the auto-generated focus command.
    await page.keyboard.press('Control+Shift+KeyP');
    const palette = page.locator('.quick-input-widget input');
    await palette.waitFor({ state: 'visible', timeout: 10_000 });
    await palette.fill('>Focus on Storyboard View');
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2_500);

    // Expand the Storyboard view header if collapsed.
    const storyboardHeader = page
      .getByRole('button', { name: /^Storyboard$/i })
      .first();
    if (
      await storyboardHeader.isVisible({ timeout: 5_000 }).catch(() => false)
    ) {
      const expanded = await storyboardHeader
        .getAttribute('aria-expanded')
        .catch(() => null);
      if (expanded === 'false') {
        await storyboardHeader.click();
        await page.waitForTimeout(1_500);
      }
    }

    // ── Snapshot B: storyboard view + map iframe in editor area ───────
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'vscode-storyboard-panel.png'),
      fullPage: false,
    });

    expect(await page.locator('iframe.webview').count()).toBeGreaterThan(0);
  });
});
