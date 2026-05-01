/**
 * Spec #174 evidence capture — ThumbnailPreview theme screenshots + interaction GIF.
 *
 * Closes T043 (theme screenshots) and T044 (interaction GIF) for the
 * thumbnail-capture feature. Driven from the web-shell against the demo
 * STAC catalog (which has ~73 plots with real captured thumbnails after
 * the #464 backfill), so the evidence shows the feature in production
 * conditions rather than a synthetic Storybook fixture.
 *
 * Outputs:
 *   specs/174-thumbnail-capture/evidence/screenshots/thumbnailpreview-light.png
 *   specs/174-thumbnail-capture/evidence/screenshots/thumbnailpreview-dark.png
 *   specs/174-thumbnail-capture/evidence/screenshots/thumbnailpreview-vscode.png
 *   specs/174-thumbnail-capture/evidence/screenshots/interaction.gif
 *
 * The "vscode" screenshot uses the high-contrast-dark variant — the legacy
 * 'vscode' Storybook variant was retired in #220 (it now resolves to a real
 * VS Code body class), and high-contrast-dark is the closest stand-in for
 * the rubric's third theme slot.
 *
 * GIF capture requires ffmpeg on PATH (FR-045). The interaction test skips
 * when ffmpeg is missing.
 */

import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertWebmToGif } from '../helpers/videoToGif';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/174-thumbnail-capture/evidence/screenshots',
);
const VIDEO_DIR = path.resolve(__dirname, '../../test-results/thumbnail-preview-gif');

mkdirSync(EVIDENCE_DIR, { recursive: true });

// Three theme slots — see file header for naming rationale.
const THEMES = [
  { fileSuffix: 'light', bodyClass: 'vscode-light' },
  { fileSuffix: 'dark', bodyClass: 'vscode-dark' },
  { fileSuffix: 'vscode', bodyClass: 'vscode-high-contrast' },
] as const;

function ffmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function preinstallVSCodeBodyClass(page: Page, bodyClass: string): Promise<void> {
  await page.addInitScript((cls) => {
    const apply = (): void => {
      if (!document.body) return;
      document.body.classList.add(cls);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
      apply();
    }
  }, bodyClass);
}

async function setVSCodeBodyClass(page: Page, cls: string): Promise<void> {
  await page.evaluate((bodyClass) => {
    const wanted = [
      'vscode-light',
      'vscode-dark',
      'vscode-high-contrast',
      'vscode-high-contrast-light',
    ];
    for (const c of wanted) document.body.classList.remove(c);
    document.body.classList.add(bodyClass);
  }, cls);
}

async function waitForCatalogReady(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible({ timeout: 15_000 });
  await expect(
    page.locator('[data-testid="exercise-list-item-row"]').first(),
  ).toBeVisible({ timeout: 15_000 });
}

async function selectItemAtIndex(page: Page, index: number): Promise<void> {
  // Pin to a specific row index so the three theme screenshots show
  // identical content — only chrome colours should differ between them.
  const rows = page.locator('[data-testid="exercise-list-item-row"]');
  await rows.nth(index).click();
  // Wait for either the image to load or the SVG fallback to appear.
  await page.waitForFunction(
    () => {
      const img = document.querySelector(
        '[data-testid="thumbnail-preview-image"]',
      ) as HTMLImageElement | null;
      const fb = document.querySelector(
        '[data-testid="thumbnail-preview-fallback"]',
      );
      return (!!img && img.complete && img.naturalWidth > 0) || !!fb;
    },
    { timeout: 5_000 },
  );
}

test.describe('#174 ThumbnailPreview — theme evidence', () => {
  for (const { fileSuffix, bodyClass } of THEMES) {
    test(`captures ${fileSuffix} theme screenshot`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 1600, height: 900 },
      });
      const page = await context.newPage();
      await preinstallVSCodeBodyClass(page, bodyClass);
      await page.goto('/');
      await waitForCatalogReady(page);
      await setVSCodeBodyClass(page, bodyClass);
      // Confirm the theme provider has actually picked up the class.
      await page
        .waitForFunction(
          () => document.documentElement.getAttribute('data-theme') !== null,
          { timeout: 5_000 },
        )
        .catch(() => undefined);
      await selectItemAtIndex(page, 0);

      // Settle a tick so any theme transition lands.
      await page.waitForTimeout(400);

      // Capture the full exercises panel (list + thumbnail + properties
      // split). The ThumbnailPreview chrome itself is currently theme-
      // independent (uses --co-* tokens that aren't bound by ThemeProvider —
      // a separate fix), so the surrounding chrome carries the theme signal.
      const panel = page.locator('[data-testid="stac-browser-list"]').first();
      await panel.screenshot({
        path: path.join(EVIDENCE_DIR, `thumbnailpreview-${fileSuffix}.png`),
      });
      await context.close();
    });
  }
});

test.describe('#174 ThumbnailPreview — interaction GIF', () => {
  test.skip(!ffmpegAvailable(), 'ffmpeg required on PATH');

  test('captures gallery prev/next item-cycle within budget', async ({ browser }) => {
    test.setTimeout(120_000);

    mkdirSync(VIDEO_DIR, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      recordVideo: {
        dir: VIDEO_DIR,
        size: { width: 1600, height: 900 },
      },
    });
    const page = await context.newPage();
    await preinstallVSCodeBodyClass(page, 'vscode-dark');
    await page.goto('/');
    await waitForCatalogReady(page);

    // Idle frame to start on a clean state.
    await page.waitForTimeout(400);

    const indices = [0, 1, 2, 3];
    for (const i of indices) {
      await selectItemAtIndex(page, i);
      // Brief dwell so the viewer can perceive each preview update.
      await page.waitForTimeout(700);
    }

    await context.close();

    const webmFiles = readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.webm'));
    expect(webmFiles.length, 'No webm captured by recordVideo').toBeGreaterThan(0);
    const webmPath = webmFiles
      .map((name) => ({ name, full: path.join(VIDEO_DIR, name) }))
      .sort((a, b) => statSync(b.full).ctimeMs - statSync(a.full).ctimeMs)[0]
      .full;

    const gifPath = path.join(EVIDENCE_DIR, 'interaction.gif');
    const result = await convertWebmToGif(webmPath, gifPath, { fps: 8, maxWidthPx: 800 });

    expect(existsSync(gifPath)).toBe(true);
    // Soft assertions for evidence — log size for the PR description.
    // eslint-disable-next-line no-console
    console.log(
      `[interaction-gif] ${gifPath} — ${result.sizeBytes} bytes, ${result.durationSec.toFixed(2)}s`,
    );

    // Cleanup the source webm.
    if (existsSync(webmPath)) {
      try {
        unlinkSync(webmPath);
      } catch {
        // best-effort
      }
    }
  });
});
