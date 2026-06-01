/**
 * #273 — Storyboard Capture + live Preview, VS Code surface (manual evidence).
 *
 * The original #273 preview evidence was web-shell-only, plus a single static
 * panel shot. This spec captures the *desktop* (VS Code) surface end-to-end in
 * real code-server with the real Debrief extension — no webview-injection
 * patch (that patch is CI-only; this runs the genuine extension). It produces
 * the four shots the feature post needs from the desktop surface:
 *
 *   evidence/screenshots/
 *     vscode-storyboard-capture.png  — the inline naming row mid-capture
 *                                       (Capture clicked, naming the storyboard)
 *     vscode-storyboard-panel.png    — the populated storyboard panel with
 *                                       *real* captured-map thumbnails, beside
 *                                       the Exercise Alpha tracks
 *     vscode-preview-trigger.png     — the panel with Preview enabled (trigger)
 *     vscode-preview-playback.png    — the briefing renderer playing the
 *                                       storyboard, launched live from VS Code's
 *                                       loopback preview server
 *     vscode-preview-scene-3.png     — the renderer flown in to a later scene
 *     vscode-preview-present.png     — Present mode (chrome hidden)
 *
 * Test 1 drives the *genuine* capture pipeline: clicking Capture inside the
 * panel webview really screenshots the map webview to a PNG, writes the
 * scene-thumbnail asset pair, and persists the Scene — so the panel shot shows
 * authentic thumbnails. (Earlier #273 evidence pre-seeded because driving the
 * capture was believed blocked under code-server, #143 — it is not, when the
 * panel webview frame reference is kept stable across the capture round-trip.)
 *
 * Test 2 pre-seeds a three-scene storyboard (distinct viewports + times) so the
 * Preview playback is deterministic and visibly flies between framings, then
 * clicks Preview and captures the renderer that VS Code's loopback server
 * serves on 127.0.0.1 — the byte-identical player that ships in an export zip.
 *
 * **Manual / CI-skipped** — evidence capture, not a regression gate. Run:
 *   bash tests/e2e/scripts/cloud-e2e-setup.sh --setup-only          # once
 *   E2E_REFRESH_VSCODE_SCREENSHOTS=1 \
 *   CHROMIUM_PATH=$(cat tests/e2e/.chromium-path) CODE_SERVER_URL=http://localhost:8080 \
 *     pnpm exec playwright test --config tests/e2e/playwright.config.ts \
 *       tests/e2e/test-storyboard-preview-vscode.spec.ts
 */
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Frame, Page } from '@playwright/test';
import { CodeServerPage } from './models/code-server-page';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.resolve(
  REPO_ROOT,
  'specs/273-storyboard-preview-button/evidence/screenshots',
);
const STORE_REL = 'tests/e2e/test-workspace/local-store/exercise-alpha';
const PLOT_PATH = path.resolve(REPO_ROOT, STORE_REL, 'exercise-alpha.geojson');

const shot = (name: string): string => path.join(EVIDENCE_DIR, name);

// ── Workspace hygiene ─────────────────────────────────────────────────────
// Capturing writes features.geojson + scene-thumbnails/ and mutates item.json.
// Restore the store to its committed state so the run leaves no diff behind.
function restoreStore(): void {
  execSync(`git checkout -- ${STORE_REL}`, { cwd: REPO_ROOT });
  execSync(`git clean -fdq ${STORE_REL}`, { cwd: REPO_ROOT });
}

// ── Seed helpers (Test 2) ─────────────────────────────────────────────────
interface PlotFeatureLike {
  readonly id?: string;
  readonly geometry?: { type?: string; coordinates?: number[][] };
  readonly properties?: { kind?: string } | null;
}
function stripStoryboard(features: PlotFeatureLike[]): PlotFeatureLike[] {
  return features.filter((f) => {
    const k = f.properties?.kind;
    return k !== 'STORYBOARD' && k !== 'STORYBOARD_SCENE';
  });
}
function seedStoryboard(features: PlotFeatureLike[]): PlotFeatureLike[] {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  for (const f of features) {
    if (f.geometry?.type === 'LineString' && /^track-/.test(f.id ?? '')) {
      for (const c of f.geometry.coordinates ?? []) {
        x0 = Math.min(x0, c[0]!); y0 = Math.min(y0, c[1]!);
        x1 = Math.max(x1, c[0]!); y1 = Math.max(y1, c[1]!);
      }
    }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const rect = (z: number): PlotFeatureLike['geometry'] => {
    const d = (0.25 / z) * 11;
    return {
      type: 'Polygon',
      coordinates: [
        [cx - d, cy - d], [cx + d, cy - d], [cx + d, cy + d],
        [cx - d, cy + d], [cx - d, cy - d],
      ] as unknown as number[][],
    };
  };
  const SB = '01JEXALPHASTORY000000000A';
  const prov = (id: string, t: string): unknown[] => [{
    activity_id: `10000001-0000-4000-8000-0000000000a${id.slice(-1)}`,
    timestamp: t, agent: 'analyst',
    was_generated_by: { tool: 'storyboard-crud', tool_version: '1.0.0', parameters: [{ value: 'create' }] },
    used: [], generated: [id], execution_duration: 'PT0S',
  }];
  const vis = ['track-hms-defender', 'track-uss-freedom', 'loc-alpha-point', 'loc-bravo-datum'];
  const storyboard = {
    type: 'Feature', id: SB, geometry: rect(10),
    properties: {
      kind: 'STORYBOARD', id: SB, name: 'Exercise Alpha — Brief',
      description: 'Three-scene walk-through of the Defender/Freedom exercise.',
      schema_version: 2, tags: ['brief'], provenance: prov(SB, '2024-01-15T09:00:00Z'),
    },
  };
  const scenes = [
    { id: '01JEXALPHASCENE00000000001', title: '150930Z JAN 24', ts: '2024-01-15T09:30:00Z', z: 11, co: 0 },
    { id: '01JEXALPHASCENE00000000002', title: '151130Z JAN 24', ts: '2024-01-15T11:30:00Z', z: 12.5, co: 1 },
    { id: '01JEXALPHASCENE00000000003', title: '151330Z JAN 24', ts: '2024-01-15T13:30:00Z', z: 13, co: 2 },
  ].map((s) => ({
    type: 'Feature', id: s.id, geometry: rect(s.z),
    properties: {
      kind: 'STORYBOARD_SCENE', id: s.id, storyboard_id: SB, title: s.title,
      viewport: { center: [cx, cy], zoom: s.z, bearing: 0 }, timestamp: s.ts,
      time_range: null, visible_feature_ids: vis, feature_set_hash: '0'.repeat(64),
      thumbnail_asset_ref: `thumbnails/scene-${s.co}.png`, transition_duration_ms: 500,
      creation_order: s.co, display_mode: 'full', tags: [], provenance: prov(s.id, s.ts),
    },
  }));
  return [...features, storyboard as PlotFeatureLike, ...(scenes as PlotFeatureLike[])];
}

// ── Shared driving helpers ────────────────────────────────────────────────
const SB_SEL =
  '[data-testid="storyboard-header"], [data-testid="storyboard-panel-rail"], [data-testid="storyboard-empty-state"], [data-testid="capture-scene-button"], [data-testid="storyboard-preview"]';

/** Re-find the Storyboard panel webview frame (frames re-mount on re-render). */
async function storyboardFrame(page: Page, timeoutMs = 20_000): Promise<Frame> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      if (await frame.locator(SB_SEL).first().isVisible().catch(() => false)) return frame;
    }
    await page.waitForTimeout(400);
  }
  throw new Error('Storyboard panel webview frame not found');
}

/** Find the Map webview frame (the one with a Leaflet container). */
async function mapFrame(page: Page, timeoutMs = 20_000): Promise<Frame | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      if (await frame.locator('.leaflet-container').first().isVisible().catch(() => false)) return frame;
    }
    await page.waitForTimeout(400);
  }
  return null;
}

function loopbackPorts(): Set<number> {
  try {
    const out = execSync('lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null', { encoding: 'utf8' });
    const ports = new Set<number>();
    for (const line of out.split('\n')) {
      const m = line.match(/127\.0\.0\.1:(\d+)/);
      if (m) ports.add(Number(m[1]));
    }
    return ports;
  } catch {
    return new Set();
  }
}

/** Open the plot and surface the Storyboard view. */
async function openPlotAndStoryboard(page: Page, cs: CodeServerPage): Promise<void> {
  await cs.waitForReady();
  await page.waitForTimeout(2_000);
  await cs.openPlotViaStacTree('Exercise Alpha');
  await page.waitForTimeout(3_000);

  await page.keyboard.press('Control+Shift+KeyP');
  const palette = page.locator('.quick-input-widget input');
  await palette.waitFor({ state: 'visible', timeout: 10_000 });
  await palette.fill('>Focus on Storyboard View');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2_500);
}

/** Hide code-server's secondary (auxiliary) side bar — its "Build with Agent"
 *  panel — robustly: it can re-appear after webview activity, so verify it is
 *  gone and retry the close command until the auxiliary bar is hidden. */
async function hideSecondarySidebar(page: Page): Promise<void> {
  const aux = page.locator('.part.auxiliarybar');
  for (let i = 0; i < 5; i += 1) {
    if (!(await aux.isVisible().catch(() => false))) return;
    await page.keyboard.press('Control+Shift+KeyP');
    const palette = page.locator('.quick-input-widget input');
    await palette.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    await palette.fill('>View: Close Secondary Side Bar');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
  }
}

/** Collapse non-Storyboard sidebar panes, close the secondary side bar, and
 *  dismiss toasts so the shot is just the Debrief workbench + map. */
async function declutter(page: Page, cs: CodeServerPage): Promise<void> {
  const headers = page.locator('.part.sidebar .pane-header, .sidebar .pane-header');
  const headerCount = await headers.count().catch(() => 0);
  for (let i = 0; i < headerCount; i += 1) {
    const h = headers.nth(i);
    const title = ((await h.locator('.title').first().textContent().catch(() => '')) ?? '').trim();
    if (/storyboard/i.test(title)) continue;
    if ((await h.getAttribute('aria-expanded').catch(() => null)) === 'true') {
      await h.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  const sbHeader = page
    .locator('.part.sidebar .pane-header, .sidebar .pane-header')
    .filter({ hasText: /storyboard/i })
    .first();
  if ((await sbHeader.getAttribute('aria-expanded').catch(() => null)) === 'false') {
    await sbHeader.click().catch(() => {});
  }
  await hideSecondarySidebar(page);
  await cs.dismissNotifications().catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
}

/** Count Scene rows in the (freshly re-found) panel frame. */
async function sceneRowCount(page: Page): Promise<number> {
  const f = await storyboardFrame(page).catch(() => null);
  if (!f) return 0;
  return f.locator('[data-testid="scene-row"]').count().catch(() => 0);
}

test.setTimeout(300_000);

test.describe('#273 — Storyboard Capture + Preview in VS Code (manual evidence)', () => {
  test.skip(
    process.env.E2E_REFRESH_VSCODE_SCREENSHOTS !== '1',
    'Evidence-capture only. Set E2E_REFRESH_VSCODE_SCREENSHOTS=1 to run; see header.',
  );

  test.beforeAll(() => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    restoreStore();
  });
  test.afterEach(() => {
    restoreStore();
  });

  // ── Test 1 — genuine capture → real-thumbnail storyboard panel ──────────
  test('captures a Scene in VS Code and the populated storyboard panel', async ({ page }) => {
    const cs = new CodeServerPage(page);
    await openPlotAndStoryboard(page, cs);
    await declutter(page, cs);

    // The map webview must have rendered the tracks before capture, so the
    // thumbnail screenshot is of the real exercise (not an empty map).
    const mf = await mapFrame(page);
    await mf?.locator('.leaflet-overlay-pane path').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1_500);

    // First capture: empty state → Capture → inline naming row. Opening the
    // naming row doesn't re-mount the panel frame (no Scene added yet), so the
    // click can be retried until the row appears — but the fill→confirm
    // round-trip must use ONE stable frame reference (re-finding mid-flow races
    // the post-confirm re-mount and was the believed "#143 block").
    let namingShown = false;
    for (let attempt = 0; attempt < 3 && !namingShown; attempt += 1) {
      const ff = await storyboardFrame(page);
      await ff.locator('[data-testid="capture-scene-button"]').first().click().catch(() => {});
      namingShown = await ff
        .locator('[data-testid="storyboard-naming-row-input"]')
        .first()
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
    }
    expect(namingShown, 'inline naming row opened on Capture').toBe(true);
    const f = await storyboardFrame(page);
    await f.locator('[data-testid="storyboard-naming-row-input"]').first().fill('Exercise Alpha — Brief');
    await page.waitForTimeout(600);

    // SHOT: the capture in progress — naming the storyboard, map behind it.
    await page.screenshot({ path: shot('vscode-storyboard-capture.png'), fullPage: false });

    await f.locator('[data-testid="storyboard-naming-row-confirm"]').first().click();

    // Wait for the first Scene row to land (capture writes a real thumbnail).
    await expect.poll(() => sceneRowCount(page), { timeout: 40_000, intervals: [1_000] }).toBeGreaterThan(0);

    // Two more captures, zooming the map in between so the thumbnails differ
    // and a later playback visibly flies between framings. Best-effort: a
    // failed zoom/capture must not sink the populated-panel shot.
    for (let i = 0; i < 2; i += 1) {
      const map = await mapFrame(page);
      await map?.locator('.leaflet-control-zoom-in').first().click().catch(() => {});
      await page.waitForTimeout(700);
      await map?.locator('.leaflet-control-zoom-in').first().click().catch(() => {});
      await page.waitForTimeout(1_200);
      const before = await sceneRowCount(page);
      const fb = await storyboardFrame(page);
      await fb.locator('[data-testid="capture-button"]').first().click().catch(() => {});
      await expect
        .poll(() => sceneRowCount(page), { timeout: 25_000, intervals: [1_000] })
        .toBeGreaterThan(before)
        .catch(() => {});
    }

    await declutter(page, cs);
    await hideSecondarySidebar(page);
    await page.waitForTimeout(600);

    // SHOT: the populated storyboard panel with authentic captured thumbnails.
    await page.screenshot({ path: shot('vscode-storyboard-panel.png'), fullPage: false });

    expect(await sceneRowCount(page)).toBeGreaterThan(0);
  });

  // ── Test 2 — pre-seeded → reliable, flying Preview playback ─────────────
  test('captures the live Preview launched from VS Code', async ({ page, context }) => {
    // Seed a 3-scene storyboard (distinct viewports + times) for a deterministic,
    // visibly-flying playback. The renderer draws live maps from the scene
    // viewports, so placeholder thumbnail refs are irrelevant to the preview.
    const fc = JSON.parse(readFileSync(PLOT_PATH, 'utf8')) as { features: PlotFeatureLike[] };
    writeFileSync(PLOT_PATH, JSON.stringify({ ...fc, features: seedStoryboard(stripStoryboard(fc.features)) }, null, 2));

    const cs = new CodeServerPage(page);
    await openPlotAndStoryboard(page, cs);
    await declutter(page, cs);

    // Preview must be enabled (the seeded storyboard has scenes).
    const f = await storyboardFrame(page);
    const preview = f.locator('[data-testid="storyboard-preview"]').first();
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toBeEnabled();

    // SHOT: the trigger — the populated panel with Preview live, beside the map.
    await page.screenshot({ path: shot('vscode-preview-trigger.png'), fullPage: false });

    // Click Preview → the command starts the loopback server (then opens the
    // system browser via asExternalUri/openExternal). We capture the renderer
    // that VS Code's own loopback server serves on 127.0.0.1 — the exact
    // player VS Code produced — by detecting the new loopback listener.
    const before = loopbackPorts();
    await preview.click();
    await page.waitForTimeout(4_000);
    const added = [...loopbackPorts()].filter((p) => !before.has(p));
    expect(added.length, 'Preview started a loopback preview server').toBeGreaterThan(0);
    const port = added[0]!;

    const rp = await context.newPage();
    await rp.setViewportSize({ width: 1280, height: 720 });
    await rp.goto(`http://127.0.0.1:${port}/?features=features.geojson`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    const map = rp.locator('[data-testid="briefing-map"]');
    const err = rp.locator('[data-testid="briefing-error"]');
    await Promise.race([
      map.waitFor({ state: 'visible', timeout: 30_000 }),
      err.waitFor({ state: 'visible', timeout: 30_000 }),
    ]);
    expect(await err.isVisible().catch(() => false), 'renderer booted without error').toBe(false);
    // Best-effort: let the OSM basemap paint + the Scene-0 flyTo settle.
    await rp.locator('.leaflet-tile-loaded').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await rp.waitForTimeout(2_500);

    await expect(rp.locator('[data-testid="transport-scene-index"]')).toHaveText('1 / 3');
    // SHOT: the briefing playing live in its own tab, launched from VS Code.
    await rp.screenshot({ path: shot('vscode-preview-playback.png') });

    // Fly forward two scenes (progressively closing on the CPA).
    await rp.locator('[data-testid="transport-next"]').click();
    await rp.waitForTimeout(2_000);
    await rp.locator('[data-testid="transport-next"]').click();
    await rp.waitForTimeout(2_000);
    await expect(rp.locator('[data-testid="transport-scene-index"]')).toHaveText('3 / 3');
    // SHOT: flown in to the final scene.
    await rp.screenshot({ path: shot('vscode-preview-scene-3.png') });

    // Present mode — chrome hides, the map fills the tab.
    await rp.keyboard.press('p');
    await rp.waitForTimeout(900);
    await rp.screenshot({ path: shot('vscode-preview-present.png') });

    // The renderer actually drew the vessel tracks (not an empty map).
    expect(await rp.locator('.leaflet-overlay-pane path').count()).toBeGreaterThan(0);

    await rp.close();
  });
});
