/**
 * #273 — Storyboard live Preview, VS Code surface (manual evidence capture).
 *
 * The preview screenshots in specs/273 were all captured on the web-shell
 * surface (its Playwright harness drives the full capture → Preview → playback
 * loop). This spec captures the *other* authoring surface — the real VS Code
 * extension running in code-server — so the evidence shows the storyboard
 * panel + the Preview control inside actual VS Code chrome, beside the map
 * with the Exercise Alpha vessel tracks.
 *
 * Output: specs/273-storyboard-preview-button/evidence/screenshots/
 *   vscode-preview-panel.png
 *
 * **Self-seeding:** capturing a Scene from inside VS Code (Ctrl+Alt+C) is
 * blocked under code-server (#143 — driving the map webview iframe), so a
 * 3-scene Storyboard is injected into the workspace's Exercise Alpha plot in
 * `beforeAll` (over the HMS Defender / USS Freedom tracks, referencing them by
 * their top-level GeoJSON id per ADR-038) and removed again in `afterAll`. The
 * Preview *launch* (loopback server → external browser tab) is not automated:
 * it's a webview-button click the code-server proxy rewrites against the
 * `Host`-allowlisted loopback URL, and the launched player is byte-identical
 * to the web-shell one already captured. What's new here is the
 * authoring-interface shot.
 *
 * **Manual / CI-skipped** — evidence capture, not a regression gate. Run:
 *   bash tests/e2e/scripts/cloud-e2e-setup.sh --setup-only   # once
 *   E2E_REFRESH_VSCODE_SCREENSHOTS=1 \
 *   CHROMIUM_PATH=$(cat tests/e2e/.chromium-path) CODE_SERVER_URL=http://localhost:8080 \
 *     pnpm exec playwright test --config tests/e2e/playwright.config.ts \
 *       tests/e2e/test-storyboard-preview-vscode.spec.ts
 */
import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CodeServerPage } from './models/code-server-page';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../specs/273-storyboard-preview-button/evidence/screenshots',
);
const PLOT_PATH = path.resolve(
  __dirname,
  'test-workspace/local-store/exercise-alpha/exercise-alpha.geojson',
);

interface PlotFeatureLike {
  readonly id?: string;
  readonly geometry?: { type?: string; coordinates?: number[][] };
  readonly properties?: { kind?: string } | null;
}

/** Strip any Storyboard/Scene features — yields the pristine data-only plot. */
function stripStoryboard(features: PlotFeatureLike[]): PlotFeatureLike[] {
  return features.filter((f) => {
    const k = f.properties?.kind;
    return k !== 'STORYBOARD' && k !== 'STORYBOARD_SCENE';
  });
}

/** Inject one Storyboard + three instant Scenes over the plot's tracks. */
function seedStoryboard(features: PlotFeatureLike[]): PlotFeatureLike[] {
  let x0 = 180;
  let y0 = 90;
  let x1 = -180;
  let y1 = -90;
  for (const f of features) {
    if (f.geometry?.type === 'LineString' && /^track-/.test(f.id ?? '')) {
      for (const c of f.geometry.coordinates ?? []) {
        x0 = Math.min(x0, c[0]!);
        y0 = Math.min(y0, c[1]!);
        x1 = Math.max(x1, c[0]!);
        y1 = Math.max(y1, c[1]!);
      }
    }
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rect = (z: number): PlotFeatureLike['geometry'] => {
    const d = (0.25 / z) * 11;
    return {
      type: 'Polygon',
      coordinates: [
        [cx - d, cy - d],
        [cx + d, cy - d],
        [cx + d, cy + d],
        [cx - d, cy + d],
        [cx - d, cy - d],
      ] as unknown as number[][],
    };
  };
  const SB = '01JEXALPHASTORY000000000A';
  const prov = (id: string, t: string): unknown[] => [
    {
      activity_id: `10000001-0000-4000-8000-0000000000a${id.slice(-1)}`,
      timestamp: t,
      agent: 'analyst',
      was_generated_by: {
        tool: 'storyboard-crud',
        tool_version: '1.0.0',
        parameters: [{ value: 'create' }],
      },
      used: [],
      generated: [id],
      execution_duration: 'PT0S',
    },
  ];
  const vis = [
    'track-hms-defender',
    'track-uss-freedom',
    'loc-alpha-point',
    'loc-bravo-datum',
  ];
  const storyboard = {
    type: 'Feature',
    id: SB,
    geometry: rect(10),
    properties: {
      kind: 'STORYBOARD',
      id: SB,
      name: 'Exercise Alpha — Brief',
      description: 'Three-scene walk-through of the Defender/Freedom exercise.',
      schema_version: 2,
      tags: ['brief'],
      provenance: prov(SB, '2024-01-15T09:00:00Z'),
    },
  };
  const scenes = [
    { id: '01JEXALPHASCENE00000000001', title: '150930Z JAN 24', ts: '2024-01-15T09:30:00Z', z: 11, co: 0 },
    { id: '01JEXALPHASCENE00000000002', title: '151130Z JAN 24', ts: '2024-01-15T11:30:00Z', z: 12.5, co: 1 },
    { id: '01JEXALPHASCENE00000000003', title: '151330Z JAN 24', ts: '2024-01-15T13:30:00Z', z: 13, co: 2 },
  ].map((s) => ({
    type: 'Feature',
    id: s.id,
    geometry: rect(s.z),
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: s.id,
      storyboard_id: SB,
      title: s.title,
      viewport: { center: [cx, cy], zoom: s.z, bearing: 0 },
      timestamp: s.ts,
      time_range: null,
      visible_feature_ids: vis,
      feature_set_hash:
        '0000000000000000000000000000000000000000000000000000000000000000',
      thumbnail_asset_ref: `thumbnails/scene-${s.co}.png`,
      transition_duration_ms: 500,
      creation_order: s.co,
      display_mode: 'full',
      tags: [],
      provenance: prov(s.id, s.ts),
    },
  }));
  return [...features, storyboard as PlotFeatureLike, ...(scenes as PlotFeatureLike[])];
}

test.setTimeout(180_000);

test.describe('#273 — Storyboard Preview in VS Code (manual evidence)', () => {
  test.skip(
    process.env.E2E_REFRESH_VSCODE_SCREENSHOTS !== '1',
    'Evidence-capture only. Set E2E_REFRESH_VSCODE_SCREENSHOTS=1 to run; see header.',
  );

  // Seed a Storyboard into the workspace plot, then restore the original file
  // byte-for-byte (preserve its exact formatting — leave no diff behind).
  let originalPlotText = '';
  test.beforeAll(() => {
    originalPlotText = readFileSync(PLOT_PATH, 'utf8');
    const fc = JSON.parse(originalPlotText) as { features: PlotFeatureLike[] };
    const seeded = seedStoryboard(stripStoryboard(fc.features));
    writeFileSync(PLOT_PATH, JSON.stringify({ ...fc, features: seeded }, null, 2));
  });

  test.afterAll(() => {
    if (originalPlotText) writeFileSync(PLOT_PATH, originalPlotText);
  });

  test('captures the VS Code storyboard panel + Preview control', async ({ page }) => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    const cs = new CodeServerPage(page);

    await cs.waitForReady();
    await page.waitForTimeout(2_000);

    // Open Exercise Alpha — two vessel tracks (HMS Defender, USS Freedom)
    // plus reference annotations + the seeded 3-scene Storyboard.
    await cs.openPlotViaStacTree('Exercise Alpha');
    await page.waitForTimeout(3_000);

    // Surface the Storyboard view via its auto-generated focus command.
    await page.keyboard.press('Control+Shift+KeyP');
    const palette = page.locator('.quick-input-widget input');
    await palette.waitFor({ state: 'visible', timeout: 10_000 });
    await palette.fill('>Focus on Storyboard View');
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2_500);

    // Collapse every Debrief-sidebar section except Storyboard so the panel
    // gets the height (Time Controller / Tools / Layers / Properties all live
    // inside the single "Activity" view; collapsing it frees the space).
    const headers = page.locator('.part.sidebar .pane-header, .sidebar .pane-header');
    const headerCount = await headers.count().catch(() => 0);
    for (let i = 0; i < headerCount; i += 1) {
      const h = headers.nth(i);
      const title = (
        (await h.locator('.title').first().textContent().catch(() => '')) ?? ''
      ).trim();
      if (/storyboard/i.test(title)) continue; // keep Storyboard open
      const expanded = await h.getAttribute('aria-expanded').catch(() => null);
      if (expanded === 'true') {
        await h.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }
    // Make sure the Storyboard pane itself is expanded.
    const sbHeader = page
      .locator('.part.sidebar .pane-header, .sidebar .pane-header')
      .filter({ hasText: /storyboard/i })
      .first();
    if ((await sbHeader.getAttribute('aria-expanded').catch(() => null)) === 'false') {
      await sbHeader.click().catch(() => {});
    }
    await page.waitForTimeout(1_000);

    // Close code-server's secondary (auxiliary) side bar — its "agent" panel —
    // so the shot is just the Debrief workbench.
    await page.keyboard.press('Control+Shift+KeyP');
    await palette.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    await palette.fill('>View: Close Secondary Side Bar');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    // Clear code-server port-forward / info toasts that would clutter the shot.
    await cs.dismissNotifications().catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1_000);

    // The VS Code authoring surface: storyboard panel (populated) + Preview
    // control + the map with the vessel tracks.
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'vscode-preview-panel.png'),
      fullPage: false,
    });

    expect(await page.locator('iframe.webview').count()).toBeGreaterThan(0);
  });
});
