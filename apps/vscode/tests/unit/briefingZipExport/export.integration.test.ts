/**
 * Integration test for the briefing-zip export pipeline (T035).
 *
 * Stubs every external touch (`fetchTile`, `readStaticBundle`,
 * `readThumbnail`) and asserts the resulting zip layout matches
 * data-model § 1.
 */

import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  exportBriefingZip,
  type ExportDeps,
  type StacItemMinimal,
} from '@/services/briefingZipExport';
import type { StoryboardPlot } from '@debrief/components/storyboard';

function sb(id: string, name: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: { kind: 'STORYBOARD', id, name, schema_version: 2 },
  };
}

function scene(id: string, storyboardId: string, index: number) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: storyboardId,
      title: `Scene ${index}`,
      timestamp: new Date(Date.UTC(2025, 0, 15, 12, index * 5)).toISOString(),
      creation_order: index,
      viewport: { center: [-4, 50], zoom: 6, bearing: 0 },
      transition_duration_ms: 1000,
      visible_feature_ids: [],
    },
  };
}

const plot: StoryboardPlot = {
  type: 'FeatureCollection',
  features: [sb('SB-A', 'Phase 1 brief'), scene('SC-A1', 'SB-A', 0), scene('SC-A2', 'SB-A', 1)],
};

const item: StacItemMinimal = {
  type: 'Feature',
  stac_version: '1.1.0',
  id: 'plot-42',
  properties: { title: 'Operation Foxtrot' },
  assets: {
    'scene-thumbnail-SC-A1': { href: './scene-thumbnails/scene-SC-A1.png', type: 'image/png' },
    'scene-thumbnail-SC-A1-sm': { href: './scene-thumbnails/scene-SC-A1-sm.png', type: 'image/png' },
    'scene-thumbnail-SC-A2': { href: './scene-thumbnails/scene-SC-A2.png', type: 'image/png' },
    'scene-thumbnail-SC-A2-sm': { href: './scene-thumbnails/scene-SC-A2-sm.png', type: 'image/png' },
  },
  links: [{ rel: 'self', href: 'https://catalog/plot-42' }],
};

const SPA_INDEX_HTML = `<!doctype html><html><body>
  <script type="application/json" id="briefing-features-data"></script>
  <script type="application/json" id="briefing-item-data"></script>
  <script type="application/json" id="briefing-config"></script>
  <script type="module" src="./assets/index.js"></script>
</body></html>`;

function makeDeps(overrides: Partial<ExportDeps> = {}): ExportDeps {
  return {
    readStaticBundle: vi.fn(async () =>
      new Map([
        ['index.html', new TextEncoder().encode(SPA_INDEX_HTML)],
        ['assets/index.js', new TextEncoder().encode('console.log("ok")')],
        ['assets/index.css', new TextEncoder().encode('body{}')],
        ['tiles/placeholder.png', new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
      ]),
    ),
    readThumbnail: vi.fn(async () => new Uint8Array([0xff, 0xd8])),
    fetchTile: vi.fn(async () => new Uint8Array([0xff, 0xd8])),
    onTileProgress: undefined,
    logWarning: vi.fn(),
    ...overrides,
  };
}

describe('exportBriefingZip — integration', () => {
  it('produces a zip whose top-level layout matches data-model § 1', async () => {
    const deps = makeDeps();
    const out = await exportBriefingZip({ storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 }, deps);
    const zip = await JSZip.loadAsync(out.bytes);

    expect(zip.file('index.html')).not.toBeNull();
    expect(zip.file('features.geojson')).not.toBeNull();
    expect(zip.file('item.json')).not.toBeNull();
    expect(zip.file('assets/index.js')).not.toBeNull();
    expect(zip.file('assets/index.css')).not.toBeNull();
    expect(zip.file('tiles/placeholder.png')).not.toBeNull();
  });

  it('injects the scoped FC + item + config into the boot HTML', async () => {
    const deps = makeDeps();
    const out = await exportBriefingZip({ storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 }, deps);
    const zip = await JSZip.loadAsync(out.bytes);
    const html = await zip.file('index.html')!.async('string');

    expect(html).toContain('"FeatureCollection"');
    expect(html).toContain('"SB-A"');
    expect(html).toContain('"plot-42"');
    expect(html).toContain('"tileLayerAttribution"');
    expect(html).toContain('"maxBundledZoom"');
  });

  it('writes a features.geojson convenience copy with exactly the briefing scope', async () => {
    const deps = makeDeps();
    const out = await exportBriefingZip({ storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 }, deps);
    const zip = await JSZip.loadAsync(out.bytes);
    const fc = JSON.parse(await zip.file('features.geojson')!.async('string')) as {
      type: string;
      features: Array<{ properties: { kind: string; id: string } }>;
    };
    expect(fc.type).toBe('FeatureCollection');
    const ids = fc.features.map((f) => f.properties.id);
    expect(ids).toEqual(['SB-A', 'SC-A1', 'SC-A2']);
  });

  it('writes a Scene thumbnail per Scene that has assets in scope', async () => {
    const deps = makeDeps();
    const out = await exportBriefingZip({ storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 }, deps);
    const zip = await JSZip.loadAsync(out.bytes);

    expect(zip.file('scene-thumbnails/scene-SC-A1.png')).not.toBeNull();
    expect(zip.file('scene-thumbnails/scene-SC-A2.png')).not.toBeNull();
    expect(out.thumbnailCount).toBe(4); // 2 Scenes × (large + small)
  });

  it('skips missing thumbnails without aborting (FR-031)', async () => {
    const deps = makeDeps({
      readThumbnail: vi.fn(async (href: string) => {
        if (href.includes('SC-A2')) return null;
        return new Uint8Array([0xff]);
      }),
    });
    const out = await exportBriefingZip({ storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 }, deps);
    const zip = await JSZip.loadAsync(out.bytes);
    expect(zip.file('scene-thumbnails/scene-SC-A1.png')).not.toBeNull();
    expect(zip.file('scene-thumbnails/scene-SC-A2.png')).toBeNull();
  });

  it('continues past per-tile fetch failures and logs them (FR-028)', async () => {
    // Force every tile fetch to fail (after the default 3 retries) so
    // we know `tileFetchErrors` is populated and the orchestrator still
    // produces a complete zip.
    const deps = makeDeps({
      fetchTile: vi.fn(async () => {
        throw new Error('per-tile boom');
      }),
    });
    const out = await exportBriefingZip(
      {
        storyboardId: 'SB-A',
        plot,
        item,
        delayBetweenTilesMs: 0,
        tileRetries: 0,
        tileBackoffMs: 0,
      },
      deps,
    );
    expect(out.tileFetchErrors).toBeGreaterThan(0);
    expect(deps.logWarning).toHaveBeenCalled();
    // Zip is still written successfully.
    const zip = await JSZip.loadAsync(out.bytes);
    expect(zip.file('index.html')).not.toBeNull();
  });

  it('does not mutate the source plot or item (FR-005)', async () => {
    const deps = makeDeps();
    const plotBefore = JSON.stringify(plot);
    const itemBefore = JSON.stringify(item);
    await exportBriefingZip({ storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 }, deps);
    expect(JSON.stringify(plot)).toBe(plotBefore);
    expect(JSON.stringify(item)).toBe(itemBefore);
  });

  it('throws when the index.html template is missing from the static bundle', async () => {
    const deps = makeDeps({
      readStaticBundle: vi.fn(async () => new Map<string, Uint8Array>()),
    });
    await expect(
      exportBriefingZip({ storyboardId: 'SB-A', plot, item }, deps),
    ).rejects.toThrow(/missing index.html/);
  });

  it('throws StoryboardNotFoundError when the chosen id is absent', async () => {
    const deps = makeDeps();
    await expect(
      exportBriefingZip({ storyboardId: 'NONE', plot, item }, deps),
    ).rejects.toThrow(/No StoryboardFeature/);
  });
});
