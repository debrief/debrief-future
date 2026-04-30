/**
 * @vitest-environment node
 *
 * Unit test for `storeFeatureCollection` — the eager features.geojson
 * persistence that Save Session uses to make captured Storyboard/Scene
 * features survive a reload (bug: features.json missing storyboard).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { storeFeatureCollection } from '../../src/commands/saveSession';
import type { DebriefFeature } from '@debrief/components';

describe('storeFeatureCollection', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-save-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes features.geojson alongside item.json with the supplied features', () => {
    const itemSubpath = 'core--analysis1-areas/item.json';
    fs.mkdirSync(path.join(tmpDir, 'core--analysis1-areas'), { recursive: true });

    const storyboardFeature = {
      type: 'Feature',
      id: 'sb-1',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { kind: 'STORYBOARD', id: 'sb-1', name: 'Test Storyboard' },
    } as unknown as DebriefFeature;
    const sceneFeature = {
      type: 'Feature',
      id: 'sc-1',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-21.7, 22.0], [-21.6, 22.0], [-21.6, 21.9], [-21.7, 21.9], [-21.7, 22.0]]],
      },
      properties: { kind: 'STORYBOARD_SCENE', id: 'sc-1', storyboard_id: 'sb-1' },
    } as unknown as DebriefFeature;

    storeFeatureCollection(
      tmpDir,
      `stac://test-store/${itemSubpath}`,
      [storyboardFeature, sceneFeature],
    );

    const written = fs.readFileSync(
      path.join(tmpDir, 'core--analysis1-areas/features.geojson'),
      'utf-8',
    );
    const parsed = JSON.parse(written) as {
      type: string;
      features: Array<{ properties: { kind: string } }>;
    };
    expect(parsed.type).toBe('FeatureCollection');
    expect(parsed.features.map((f) => f.properties.kind)).toEqual([
      'STORYBOARD',
      'STORYBOARD_SCENE',
    ]);
  });

  it('is a no-op when the plot URI is malformed', () => {
    const before = fs.readdirSync(tmpDir);
    storeFeatureCollection(tmpDir, 'not-a-stac-uri', []);
    const after = fs.readdirSync(tmpDir);
    expect(after).toEqual(before);
  });
});
