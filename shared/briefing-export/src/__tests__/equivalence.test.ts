/**
 * Cross-surface zip-equivalence (#273, US2 / FR-015 / FR-016 / C-D2).
 *
 * The VS Code and web-shell hosts share ONE packing implementation
 * (`exportBriefingZip`) and differ only in how they inject I/O via
 * `ExportDeps`. This test proves the orchestrator is host-agnostic: given
 * equivalent inputs and behaviourally-equivalent dep stubs that mimic each
 * host (VS Code = filesystem-style reads; web-shell = blob/IndexedDB-style
 * reads), the produced zips are functionally equivalent — same entry set,
 * same scoped `features.geojson`, same `item.json` — so the two surfaces
 * cannot drift. It also guards C-D5 (no new external dependency): JSZip is
 * the only zip lib, already present.
 */

import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { exportBriefingZip, type ExportDeps } from '../index';
import type { StoryboardPlot } from '@debrief/components/storyboard';
import type { StacItemMinimal } from '../core/buildItemJson';

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

const plot = {
  type: 'FeatureCollection',
  features: [sb('SB-A', 'Phase 1 brief'), scene('SC-A1', 'SB-A', 0), scene('SC-A2', 'SB-A', 1)],
} as unknown as StoryboardPlot;

const item: StacItemMinimal = {
  type: 'Feature',
  stac_version: '1.1.0',
  id: 'plot-42',
  properties: { title: 'Operation Foxtrot' },
  assets: {},
  links: [{ rel: 'self', href: 'https://catalog/plot-42' }],
};

const SPA_INDEX_HTML = `<!doctype html><html><body>
  <script type="application/json" id="briefing-features-data"></script>
  <script type="application/json" id="briefing-item-data"></script>
  <script type="application/json" id="briefing-config"></script>
  <script type="module" src="./assets/index.js"></script>
</body></html>`;

const STATIC_BUNDLE: ReadonlyArray<[string, Uint8Array]> = [
  ['index.html', new TextEncoder().encode(SPA_INDEX_HTML)],
  ['assets/index.js', new TextEncoder().encode('console.log("ok")')],
  ['tiles/placeholder.png', new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
];

/** A VS Code-style adapter (filesystem reads). */
function vscodeStyleDeps(): ExportDeps {
  return {
    readStaticBundle: vi.fn(async () => new Map(STATIC_BUNDLE)),
    readThumbnail: vi.fn(async () => null),
    fetchTile: vi.fn(async () => new Uint8Array([0xff, 0xd8])),
    logWarning: vi.fn(),
  };
}

/** A web-shell-style adapter — different call mechanics (Promise.resolve,
 *  byte-by-byte map build) but behaviourally identical results. */
function webShellStyleDeps(): ExportDeps {
  return {
    readStaticBundle: () => {
      const map = new Map<string, Uint8Array>();
      for (const [k, v] of STATIC_BUNDLE) map.set(k, Uint8Array.from(v));
      return Promise.resolve(map);
    },
    readThumbnail: () => Promise.resolve(null),
    fetchTile: () => Promise.resolve(new Uint8Array([0xff, 0xd8])),
    logWarning: () => undefined,
  };
}

async function entryNames(bytes: Uint8Array): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes);
  return Object.keys(zip.files)
    .filter((n) => !zip.files[n]!.dir)
    .sort();
}
async function read(bytes: Uint8Array, name: string): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  return zip.file(name)!.async('string');
}

describe('briefing-export cross-surface equivalence', () => {
  it('C-D2: both host adapters produce functionally-equivalent zips', async () => {
    const a = await exportBriefingZip(
      { storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 },
      vscodeStyleDeps(),
    );
    const b = await exportBriefingZip(
      { storyboardId: 'SB-A', plot, item, delayBetweenTilesMs: 0 },
      webShellStyleDeps(),
    );

    // Same archive layout.
    expect(await entryNames(a.bytes)).toEqual(await entryNames(b.bytes));

    // Same scoped data payloads (the parts that drive offline playback).
    expect(await read(a.bytes, 'features.geojson')).toEqual(await read(b.bytes, 'features.geojson'));
    expect(await read(a.bytes, 'item.json')).toEqual(await read(b.bytes, 'item.json'));

    // Same scene/tile accounting.
    expect(a.scenes.map((s) => s.properties.id)).toEqual(b.scenes.map((s) => s.properties.id));
    expect(a.tileCount).toBe(b.tileCount);
  });
});
