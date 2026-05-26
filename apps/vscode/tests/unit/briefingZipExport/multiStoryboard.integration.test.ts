/**
 * T077 / T078 — multi-Storyboard integration tests (US4 acceptance scenarios).
 *
 * Exercises a fixture plot containing two Storyboards (A and B) with
 * (a) disjoint Scene sets and (b) a shared underlying track. The export
 * pipeline must:
 *   - Include only Storyboard A's StoryboardFeature + Scenes when A is
 *     exported (and the inverse for B).
 *   - Include shared tracks in *both* zips when each Storyboard
 *     references them.
 */

import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  exportBriefingZip,
  type ExportDeps,
  type StacItemMinimal,
} from '@/services/briefingZipExport';
import type { StoryboardPlot } from '@debrief/components/storyboard';

const SPA_TEMPLATE = `<!doctype html><html><body>
  <script type="application/json" id="briefing-features-data"></script>
  <script type="application/json" id="briefing-item-data"></script>
  <script type="application/json" id="briefing-config"></script>
</body></html>`;

function sb(id: string, name: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: { kind: 'STORYBOARD', id, name, schema_version: 2 },
  };
}

function scene(id: string, storyboardId: string, index: number, visible: string[] = []) {
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
      viewport: { center: [0, 0], zoom: 6, bearing: 0 },
      transition_duration_ms: 1000,
      visible_feature_ids: visible,
    },
  };
}

function track(id: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    properties: { kind: 'TRACK', id, name: id },
  };
}

function makeDeps(): ExportDeps {
  return {
    readStaticBundle: vi.fn(async () =>
      new Map([
        ['index.html', new TextEncoder().encode(SPA_TEMPLATE)],
        ['assets/index.js', new TextEncoder().encode('//')],
      ]),
    ),
    readThumbnail: vi.fn(async () => null),
    fetchTile: vi.fn(async () => new Uint8Array([0xff])),
    logWarning: vi.fn(),
  };
}

const ITEM: StacItemMinimal = {
  type: 'Feature',
  stac_version: '1.1.0',
  id: 'plot-multi',
  properties: { title: 'Multi-Storyboard plot' },
  assets: {},
  links: [],
};

async function exportAndDecode(plot: StoryboardPlot, storyboardId: string) {
  const out = await exportBriefingZip(
    { storyboardId, plot, item: ITEM, delayBetweenTilesMs: 0 },
    makeDeps(),
  );
  const zip = await JSZip.loadAsync(out.bytes);
  const fc = JSON.parse(await zip.file('features.geojson')!.async('string')) as {
    type: string;
    features: Array<{ properties: { kind: string; id: string }; id: string }>;
  };
  return fc;
}

describe('multi-Storyboard plot — US4 acceptance scenarios', () => {
  it('disjoint Scene sets — each zip carries only its own Storyboard', async () => {
    // US4 acceptance 1 + 3
    const plot: StoryboardPlot = {
      type: 'FeatureCollection',
      features: [
        sb('SB-A', 'Phase 1'),
        sb('SB-B', 'Phase 2'),
        scene('SC-A1', 'SB-A', 0),
        scene('SC-A2', 'SB-A', 1),
        scene('SC-B1', 'SB-B', 0),
        scene('SC-B2', 'SB-B', 1),
      ],
    };

    const fcA = await exportAndDecode(plot, 'SB-A');
    const fcB = await exportAndDecode(plot, 'SB-B');

    const idsA = fcA.features.map((f) => f.properties.id).sort();
    const idsB = fcB.features.map((f) => f.properties.id).sort();
    expect(idsA).toEqual(['SB-A', 'SC-A1', 'SC-A2']);
    expect(idsB).toEqual(['SB-B', 'SC-B1', 'SC-B2']);

    // Cross-checks: A's zip contains no B features and vice versa.
    expect(idsA.some((id) => id.includes('SB-B'))).toBe(false);
    expect(idsA.some((id) => id.includes('SC-B'))).toBe(false);
    expect(idsB.some((id) => id.includes('SB-A'))).toBe(false);
    expect(idsB.some((id) => id.includes('SC-A'))).toBe(false);
  });

  it('shared underlying feature appears in BOTH zips (US4 acceptance 2)', async () => {
    const plot: StoryboardPlot = {
      type: 'FeatureCollection',
      features: [
        sb('SB-A', 'Phase 1'),
        sb('SB-B', 'After-action'),
        scene('SC-A1', 'SB-A', 0, ['SHARED-TRACK']),
        scene('SC-B1', 'SB-B', 0, ['SHARED-TRACK']),
        track('SHARED-TRACK'),
      ],
    };
    const fcA = await exportAndDecode(plot, 'SB-A');
    const fcB = await exportAndDecode(plot, 'SB-B');

    expect(fcA.features.some((f) => f.properties.id === 'SHARED-TRACK')).toBe(true);
    expect(fcB.features.some((f) => f.properties.id === 'SHARED-TRACK')).toBe(true);
  });

  it('does NOT include features referenced only by another Storyboard (US4 acceptance 3)', async () => {
    const plot: StoryboardPlot = {
      type: 'FeatureCollection',
      features: [
        sb('SB-A', 'A'),
        sb('SB-B', 'B'),
        scene('SC-A1', 'SB-A', 0, ['ONLY-A']),
        scene('SC-B1', 'SB-B', 0, ['ONLY-B']),
        track('ONLY-A'),
        track('ONLY-B'),
      ],
    };
    const fcA = await exportAndDecode(plot, 'SB-A');
    const fcB = await exportAndDecode(plot, 'SB-B');

    expect(fcA.features.some((f) => f.properties.id === 'ONLY-A')).toBe(true);
    expect(fcA.features.some((f) => f.properties.id === 'ONLY-B')).toBe(false);
    expect(fcB.features.some((f) => f.properties.id === 'ONLY-B')).toBe(true);
    expect(fcB.features.some((f) => f.properties.id === 'ONLY-A')).toBe(false);
  });
});
