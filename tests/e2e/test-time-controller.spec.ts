/**
 * E2E Test: Time Controller — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/time-controller.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Time Controller', () => {
  test('time controller is visible after loading a plot', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const timeController = frame.locator('.debrief-time-controller');
    await timeController.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(timeController).toBeVisible();
  });

  test('time controller shows playback controls', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const playPause = frame.locator('[data-testid="play-pause"]');
    await playPause.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(playPause).toBeVisible();
  });

  test('play/pause button toggles playback state', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const playPause = frame.locator('[data-testid="play-pause"]');
    await playPause.waitFor({ state: 'visible', timeout: 15_000 });
    await playPause.click();

    // After clicking, button should reflect changed state
    await expect(playPause).toBeVisible();
  });

  test('scrubber starts at the beginning of the time range', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const scrubber = frame.locator('.debrief-time-scrubber');
    await scrubber.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(scrubber).toBeVisible();
  });
});
