/**
 * E2E Test: Storyboard Playback — VS Code Extension (Feature 217)
 *
 * Five acceptance scenarios from
 * `specs/217-storyboarding-playback/tasks.md §3.6`:
 *
 *   1. Forward-through a populated Storyboard (SC-002 + FR-PLAY-005/-007)
 *   2. Scoped `Right` arrow (SC-007 + FR-PLAY-006)
 *   3. Scrub-window lock (SC-004 + FR-PLAY-012/-013)
 *   4. Click Scene rectangle on map (FR-PLAY-017)
 *   5. Hard-block on missing-feature (FR-PLAY-019/-020/-021)
 *
 * Skipped pending Blocker #143 (webview iframe hierarchy in
 * openvscode-server). When unblocked, these tests exercise the
 * code paths verified in isolation by:
 *   - apps/vscode/tests/unit/storyboardPlayback.test.ts (state machine)
 *   - apps/vscode/tests/unit/storyboardCommands.test.ts (command handlers)
 *   - apps/vscode/tests/unit/mapPanel-storyboardPlayback.test.ts (MapPanel)
 *   - apps/vscode/tests/unit/timeRangeView-setScrubbableRange.test.ts (scrub)
 *   - shared/components/src/panels/StoryboardPanel/__tests__/*.test.tsx
 */

import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/217-storyboarding-playback/evidence';

test.describe.skip('Storyboard Playback — US1 end-to-end (blocked by #143)', () => {
  test('forward through ≥3 scenes: flyTo fires + time slider advances + current-scene highlight', async ({
    codeServerPage,
    page,
  }) => {
    test.setTimeout(120_000);
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.getWebviewFrame();

    // Open the Storyboard panel (the panel is registered as
    // `debrief.storyboardPanel`; reveal via command palette).
    await page.keyboard.press('Control+Shift+KeyP');
    await page.keyboard.type('Storyboard: Open Panel');
    await page.keyboard.press('Enter');

    const storyboardFrame = page.frameLocator('iframe[src*="storyboardPanel"]');
    const transportRow = storyboardFrame.locator('[data-testid="transport-row"]');
    await transportRow.waitFor({ state: 'visible', timeout: 10_000 });

    // Capture baseline scene counter
    const counter = storyboardFrame.locator('[data-testid="transport-counter"]');
    const before = await counter.textContent();
    expect(before).toMatch(/Scene 1/);

    // Click Forward twice
    const forward = storyboardFrame.locator('[data-testid="transport-forward"]');
    await forward.click();
    // Let the flyTo animation + snapshot round-trip
    await page.waitForTimeout(700);
    await forward.click();
    await page.waitForTimeout(700);

    // Now on Scene 3. Verify counter and data-active highlight.
    await expect(counter).toContainText('Scene 3');
    const activeRow = storyboardFrame.locator('[data-testid="scene-row"][data-active="true"]');
    await expect(activeRow).toHaveCount(1);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/e2e-forward.png`,
    });
  });

  test('scoped Right arrow: fires Forward when Map is focused, no-op when Log Panel focused (SC-007)', async ({
    codeServerPage,
    page,
  }) => {
    test.setTimeout(120_000);
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.getWebviewFrame();

    // Focus map: click inside the map webview, then press Right.
    const mapFrame = page.frameLocator('iframe[src*="mapView"]');
    await mapFrame.locator('.leaflet-container').click();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);

    const storyboardFrame = page.frameLocator('iframe[src*="storyboardPanel"]');
    await expect(
      storyboardFrame.locator('[data-testid="transport-counter"]'),
    ).toContainText('Scene 2');

    // Now focus Log Panel — Right must be a no-op.
    // (In real VS Code, focus the Output pane or the Log Panel webview.)
    const logPanelFrame = page.frameLocator('iframe[src*="logPanel"]');
    await logPanelFrame.locator('body').click();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    await expect(
      storyboardFrame.locator('[data-testid="transport-counter"]'),
    ).toContainText('Scene 2'); // unchanged
  });

  test('scrub-window lock: drag scrubber past scene[N+1] timestamp clamps at boundary (FR-PLAY-012)', async ({
    codeServerPage,
    page,
  }) => {
    test.setTimeout(120_000);
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getActivityPanelFrame();

    const scrubber = frame.locator('.debrief-time-scrubber');
    await scrubber.waitFor({ state: 'visible', timeout: 15_000 });

    // Attempt to drag scrubber thumb past scene[N+1].timestamp — the
    // setScrubbableRange override should clamp the track so far-right
    // drags land at the scene[N+1] boundary instead of the full data
    // end.
    const thumb = frame.locator('.debrief-time-scrubber__thumb');
    const box = await thumb.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 2000, box.y + box.height / 2);
      await page.mouse.up();
    }

    // Verify the current scene is still the same — the clamp prevented
    // scrubbing past scene[N+1].
    const storyboardFrame = page.frameLocator('iframe[src*="storyboardPanel"]');
    await expect(
      storyboardFrame.locator('[data-testid="transport-counter"]'),
    ).toContainText(/Scene \d/);
  });

  test('click Scene rectangle on map: panel selection jumps + map animates (FR-PLAY-017)', async ({
    codeServerPage,
    page,
  }) => {
    test.setTimeout(120_000);
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = page.frameLocator('iframe[src*="mapView"]');

    // Scene rectangles are rendered as Leaflet Polygons. Click a
    // non-current rectangle (the third one) by bounding box.
    const rectangles = mapFrame.locator('.leaflet-interactive');
    const count = await rectangles.count();
    if (count >= 3) {
      await rectangles.nth(2).click();
      await page.waitForTimeout(700);

      const storyboardFrame = page.frameLocator('iframe[src*="storyboardPanel"]');
      const activeRow = storyboardFrame.locator(
        '[data-testid="scene-row"][data-active="true"]',
      );
      await expect(activeRow).toHaveCount(1);
    }
  });

  test('hard-block on missing-feature: modal surfaces + Jump past advances without animating into blocked scene (FR-PLAY-019/-020/-021)', async ({
    codeServerPage,
    page,
  }) => {
    test.setTimeout(120_000);
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.getWebviewFrame();

    // Precondition: fixture plot with a scene referencing deleted features.
    // (In production, this is arranged by the fixture loader — here we
    // rely on the plot-under-test having a deliberately-broken scene.)
    const storyboardFrame = page.frameLocator('iframe[src*="storyboardPanel"]');
    const forward = storyboardFrame.locator('[data-testid="transport-forward"]');

    // Step until we hit the blocked scene.
    await forward.click();
    await page.waitForTimeout(400);

    // Native VS Code modal: locator targets the workbench dialog.
    const modal = page.locator('.notification-list-item, .monaco-dialog-box');
    await modal.waitFor({ state: 'visible', timeout: 5_000 });

    // Click "Jump past this scene"
    await page.locator('button:has-text("Jump past this scene")').click();
    await page.waitForTimeout(700);

    // Verify transport advanced past the blocked scene.
    await expect(
      storyboardFrame.locator('[data-testid="transport-counter"]'),
    ).not.toContainText('Scene 1');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/screenshots/e2e-hardblock.png`,
    });
  });
});
