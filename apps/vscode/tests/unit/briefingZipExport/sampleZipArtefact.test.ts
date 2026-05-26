/**
 * Evidence-producer test — emits `sample-briefing.zip` alongside the
 * other artefacts in `specs/264-briefing-zip-renderer/evidence/`.
 *
 * The test always passes (it's an emitter, not an assertion); skipping
 * it is fine when the resources/briefing-renderer-static bundle is
 * absent (in a clean checkout before the resource-sync step has run).
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  exportBriefingZip,
  type StacItemMinimal,
} from '@/services/briefingZipExport';
import type { StoryboardPlot } from '@debrief/components/storyboard';

const STORYBOARD_ID = '01HKVZ0DEVSAMPLE000000000';

function scene(suffix: string, index: number, lon: number, lat: number) {
  return {
    type: 'Feature' as const,
    id: `01HKVZ0DEVSCENE${suffix.padStart(11, '0')}`,
    geometry: {
      type: 'Polygon',
      coordinates: [[[lon - 1, lat - 1], [lon + 1, lat - 1], [lon + 1, lat + 1], [lon - 1, lat + 1], [lon - 1, lat - 1]]],
    },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: `01HKVZ0DEVSCENE${suffix.padStart(11, '0')}`,
      storyboard_id: STORYBOARD_ID,
      title: `Scene ${index + 1}`,
      timestamp: new Date(Date.UTC(2025, 0, 15, 12, index * 15, 0)).toISOString(),
      creation_order: index,
      viewport: { center: [lon, lat], zoom: 6, bearing: 0 },
      transition_duration_ms: 1500,
      visible_feature_ids: [],
    },
  };
}

function walk(dir: string, rel = ''): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  for (const name of readdirSync(dir)) {
    if (name === '.gitkeep') continue;
    const full = join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) {
      for (const [k, v] of walk(full, r)) out.set(k, v);
    } else {
      out.set(r, new Uint8Array(readFileSync(full)));
    }
  }
  return out;
}

const bundleRoot = resolve(__dirname, '../../../resources/briefing-renderer-static');
const evidencePath = resolve(
  __dirname,
  '../../../../../specs/264-briefing-zip-renderer/evidence/sample-briefing.zip',
);

const skipEvidence = !existsSync(bundleRoot) || !existsSync(join(bundleRoot, 'index.html'));

describe('sample-briefing.zip evidence producer', () => {
  it.skipIf(skipEvidence)('emits the briefing zip into the evidence directory', async () => {
    const staticBundle = walk(bundleRoot);
    expect(staticBundle.get('index.html')).toBeDefined();

    const plot: StoryboardPlot = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: STORYBOARD_ID,
          geometry: {
            type: 'Polygon',
            coordinates: [[[-15, 45], [5, 45], [5, 60], [-15, 60], [-15, 45]]],
          },
          properties: {
            kind: 'STORYBOARD',
            id: STORYBOARD_ID,
            name: 'Sample briefing Storyboard',
            description: 'Sample briefing — evidence artefact.',
            schema_version: 2,
          },
        },
        scene('1', 0, -5, 50.5),
        scene('2', 1, -2, 52),
        scene('3', 2, 0, 55),
        scene('4', 3, 3, 57),
      ],
    };

    const item: StacItemMinimal = {
      type: 'Feature',
      stac_version: '1.1.0',
      id: 'sample-briefing-plot',
      properties: {
        title: 'Sample briefing plot',
        datetime: '2025-01-15T12:00:00.000Z',
        start_datetime: '2025-01-15T12:00:00.000Z',
        end_datetime: '2025-01-15T12:45:00.000Z',
      },
      assets: {},
      links: [],
    };

    const out = await exportBriefingZip(
      {
        storyboardId: STORYBOARD_ID,
        plot,
        item,
        delayBetweenTilesMs: 0,
        tileRetries: 0,
        tileBackoffMs: 0,
      },
      {
        readStaticBundle: async () => staticBundle,
        readThumbnail: async () => null,
        fetchTile: async () => {
          // Sample zip is captured offline → no tiles; SPA falls back
          // to placeholder when opened.
          throw new Error('sample-briefing — offline capture');
        },
        logWarning: () => {},
      },
    );

    writeFileSync(evidencePath, out.bytes);
    expect(out.bytes.length).toBeGreaterThan(1024);
    expect(out.scenes.length).toBe(4);
  });
});
