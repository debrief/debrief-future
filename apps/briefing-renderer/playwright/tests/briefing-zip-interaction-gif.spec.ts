/**
 * T086 — interaction GIF capture.
 *
 * Records a Playwright video of the mode-toggle + playback interaction
 * (Minimal default → Next a few times → P to enter Present → P back to
 * Minimal → Replay), then post-processes it with ffmpeg into a small
 * looping GIF written into the evidence directory.
 *
 * The GIF target is < 5 s of wall-clock and < 2 MB on disk (tasks.md
 * T086). The ffmpeg filter chain below downsamples to 12 fps + 720 px
 * wide to hit that envelope.
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;
const evidenceRoot = resolve(
  __dirname,
  '../../../../specs/264-briefing-zip-renderer/evidence/screenshots',
);

const videoDir = resolve(__dirname, '../../test-results/interaction-recording');

test.use({
  video: {
    mode: 'on',
    size: { width: 1280, height: 720 },
  },
});

test.describe('briefing-renderer interaction recording', () => {
  test('record mode-toggle + playback flow', async ({ page }, testInfo) => {
    // Direct video output to a known location.
    testInfo.snapshotDir = videoDir;

    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);

    // Two Scene advances.
    await page.locator('[data-testid="transport-next"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="transport-next"]').click();
    await page.waitForTimeout(500);

    // Enter Present mode.
    await page.keyboard.press('p');
    await page.waitForTimeout(500);
    // Exit Present mode.
    await page.keyboard.press('p');
    await page.waitForTimeout(500);

    // Replay path: keep advancing until Replay shows.
    await page.locator('[data-testid="transport-next"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="transport-replay"]').click();
    await page.waitForTimeout(500);
  });
});

test.afterAll(async () => {
  // Find the most-recent .webm Playwright wrote into test-results/.
  const root = resolve(__dirname, '../../test-results');
  if (!existsSync(root)) return;

  function findWebm(dir: string): string | null {
    let best: { path: string; mtime: number } | null = null;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        const child = findWebm(full);
        if (child) {
          const cst = statSync(child);
          if (!best || cst.mtimeMs > best.mtime) {
            best = { path: child, mtime: cst.mtimeMs };
          }
        }
      } else if (name.endsWith('.webm') && full.includes('interaction')) {
        if (!best || st.mtimeMs > best.mtime) {
          best = { path: full, mtime: st.mtimeMs };
        }
      }
    }
    return best?.path ?? null;
  }

  const webm = findWebm(root);
  if (!webm) {
    // eslint-disable-next-line no-console
    console.warn('[interaction-gif] no .webm found — skipping GIF conversion');
    return;
  }

  mkdirSync(evidenceRoot, { recursive: true });
  const gifPath = join(evidenceRoot, 'interaction.gif');

  // Convert to a small, looping GIF. Filter chain:
  //   fps=12         — bring frame rate down to GIF-friendly 12 fps
  //   scale=720:-1   — width 720 px, height preserves aspect
  //   palettegen + paletteuse with bayer:bayer_scale=5 — small file
  //
  // The two-pass paletted approach keeps the GIF under the 2 MB target
  // even for ~5 s of recording. The split filter lets us run both
  // palettegen and paletteuse in one ffmpeg invocation.
  try {
    execSync(
      `ffmpeg -y -i "${webm}" -vf "fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" -loop 0 "${gifPath}" 2>&1`,
      { stdio: 'pipe' },
    );
    // eslint-disable-next-line no-console
    console.log(`[interaction-gif] wrote ${gifPath} (${statSync(gifPath).size} bytes)`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[interaction-gif] ffmpeg conversion failed:', (e as Error).message);
  }
});
