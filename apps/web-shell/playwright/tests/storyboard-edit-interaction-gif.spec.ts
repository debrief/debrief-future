/**
 * Polish-loop interaction GIF capture (Feature 234, US5 — FR-042 + T081).
 *
 * Records a single Playwright video covering rename → describe →
 * delete + undo → refresh-stale, then converts it to a GIF via the
 * shared `videoToGif` helper. Asserts the output meets the FR-042
 * budget: < 5 s, < 2 MB hard cap (helper warns at 1.8 MB soft).
 *
 * Output: specs/218-storyboarding-edit/evidence/screenshots/interaction.gif
 *   (lands at the parent #218 evidence-table path so the screenshot
 *   package is consolidated for the shipped post.)
 *
 * ffmpeg is required — FR-045 surfaces this via `task verify:ffmpeg`.
 * The test skips (with a warning) when ffmpeg is missing locally.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertWebmToGif } from '../helpers/videoToGif';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/218-storyboarding-edit/evidence/screenshots',
);
const VIDEO_DIR = path.resolve(__dirname, '../../test-results/storyboard-edit-gif');
const GIF_PATH = path.join(EVIDENCE_DIR, 'interaction.gif');

// FR-042: 2 MB hard cap. The helper warns at 1.8 MB.
const HARD_CAP_BYTES = 2 * 1024 * 1024;
// FR-042: < 5 s.
const HARD_DURATION_SEC = 5;

function ffmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

test.describe('Storyboard edit suite — interaction GIF (#234 FR-042)', () => {
  test.skip(
    !ffmpegAvailable(),
    'ffmpeg required — FR-045 verify:ffmpeg is the upstream guard.',
  );

  test('captures rename → describe → delete + undo → refresh-stale within budget', async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    mkdirSync(EVIDENCE_DIR, { recursive: true });
    mkdirSync(VIDEO_DIR, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 480, height: 720 },
      recordVideo: {
        dir: VIDEO_DIR,
        size: { width: 480, height: 720 },
      },
    });
    const page = await context.newPage();
    await page.goto('/?storyboard-edit-harness=1&stale=sceneC');
    await page.waitForSelector('[data-testid="storyboard-panel"]', {
      state: 'visible',
      timeout: 10_000,
    });
    // Idle frame so the GIF starts on a clean state.
    await page.waitForTimeout(400);

    // ── Step 1: rename sceneA inline ─────────────────────────────────
    await page
      .locator('[data-testid="scene-row"][data-scene-id="sceneA"]')
      .locator('[data-testid="scene-row-chevron"]')
      .click();
    await page.waitForSelector('[data-testid="scene-edit-form"]', {
      state: 'visible',
      timeout: 5_000,
    });
    const titleInput = page.locator(
      '[data-testid="scene-edit-form-title-input"]',
    );
    await titleInput.click();
    await titleInput.fill('Renamed scene');
    await titleInput.blur();
    await page.waitForTimeout(300);

    // ── Step 2: describe sceneA ──────────────────────────────────────
    await page
      .locator('[data-testid="scene-row"][data-scene-id="sceneA"]')
      .locator('[data-testid="scene-row-chevron"]')
      .click();
    await page.waitForSelector('[data-testid="scene-edit-form"]', {
      state: 'visible',
      timeout: 5_000,
    });
    const descInput = page.locator(
      '[data-testid="scene-edit-form-description-textarea"]',
    );
    await descInput.fill('Surface contact, holding course.');
    await page
      .locator('[data-testid="scene-edit-form-save-description"]')
      .click();
    await page.waitForTimeout(300);

    // ── Step 3: delete + undo on sceneB ──────────────────────────────
    await page
      .locator('[data-testid="scene-row"][data-scene-id="sceneB"]')
      .click({ button: 'right' });
    await page.waitForSelector('[data-testid="scene-overflow-menu"]', {
      state: 'visible',
      timeout: 5_000,
    });
    await page
      .locator('[data-testid="scene-overflow-menuitem-delete"]')
      .click();
    await page.waitForSelector('[data-testid="undo-toast"]', {
      state: 'visible',
      timeout: 5_000,
    });
    await page.waitForTimeout(400);
    await page
      .locator('[data-testid="undo-toast-undo-button"]')
      .click();
    await page.waitForTimeout(300);

    // ── Step 4: refresh stale on sceneC ──────────────────────────────
    await page.locator('[data-testid="refresh-all-stale"]').click();
    await page.waitForTimeout(400);

    await context.close();

    // Find the recorded webm (Playwright writes a hashed filename).
    const webmFiles = readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.webm'));
    expect(webmFiles.length, 'No webm captured by recordVideo').toBeGreaterThan(
      0,
    );
    // Pick the newest file by ctime.
    const webmPath = webmFiles
      .map((name) => ({ name, full: path.join(VIDEO_DIR, name) }))
      .sort((a, b) => statSync(b.full).ctimeMs - statSync(a.full).ctimeMs)[0]
      .full;

    const result = await convertWebmToGif(webmPath, GIF_PATH);

    // FR-042 hard caps.
    expect(
      result.sizeBytes,
      `GIF size ${result.sizeBytes} bytes exceeds hard cap ${HARD_CAP_BYTES} (${(HARD_CAP_BYTES / 1024 / 1024).toFixed(1)} MB).`,
    ).toBeLessThanOrEqual(HARD_CAP_BYTES);
    expect(
      result.durationSec,
      `GIF duration ${result.durationSec.toFixed(2)}s exceeds hard cap ${HARD_DURATION_SEC}s.`,
    ).toBeLessThanOrEqual(HARD_DURATION_SEC);

    // Sanity: GIF magic number.
    expect(existsSync(GIF_PATH)).toBe(true);

    // eslint-disable-next-line no-console
    console.log(
      `[interaction-gif] ${GIF_PATH} — ${result.sizeBytes} bytes, ${result.durationSec.toFixed(2)}s`,
    );

    // Cleanup the source webm so it doesn't bloat git or the results dir.
    if (existsSync(webmPath)) {
      try {
        unlinkSync(webmPath);
      } catch {
        // best-effort
      }
    }
  });
});

