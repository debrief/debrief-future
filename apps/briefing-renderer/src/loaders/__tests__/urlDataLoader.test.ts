/**
 * Vitest for the #273 live-preview URL-boot loader.
 *
 * Covers contract preview-boot G4 (valid URL → fetch once, validate,
 * synth item/config), G5 (unreachable/parse-fail/invalid → error), G6
 * (one scene → ready, zero → empty is asserted at the boot level), and G7
 * (reuses the existing validators — exercised by feeding the same
 * malformed payloads the inline loader rejects).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  fetchAndValidateFeaturesUrl,
  PREVIEW_TILE_URL,
  type UrlLoaderDeps,
} from '../urlDataLoader';
import { InlineDataLoadError } from '../inlineDataLoader';

const validFeatures = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'SB1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { kind: 'STORYBOARD', id: 'SB1', name: 'Channel Crossing', schema_version: 2 },
    },
    {
      type: 'Feature',
      id: 'SC1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: 'SC1',
        storyboard_id: 'SB1',
        title: 'Scene 1',
        timestamp: '2025-01-15T12:00:00Z',
        creation_order: 0,
        viewport: { center: [-4, 50], zoom: 6, bearing: 0 },
      },
    },
  ],
};

function depsReturning(json: unknown, spy?: ReturnType<typeof vi.fn>): UrlLoaderDeps {
  const fetchText = spy ?? vi.fn();
  fetchText.mockResolvedValue(JSON.stringify(json));
  return { fetchText };
}

describe('fetchAndValidateFeaturesUrl', () => {
  it('G4: fetches once, validates, and synthesises item + config', async () => {
    const spy = vi.fn();
    const loaded = await fetchAndValidateFeaturesUrl(
      'blob:preview',
      depsReturning(validFeatures, spy),
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('blob:preview');
    expect(loaded.storyboard.properties.id).toBe('SB1');
    expect(loaded.scenes).toHaveLength(1);
    // Synthesised item is minimal but passes the item validator.
    expect(loaded.item.type).toBe('Feature');
    expect(loaded.item.id.length).toBeGreaterThan(0);
    expect(loaded.item.assets).toEqual({});
    expect(loaded.item.links).toEqual([]);
    // Synthesised config points at the online basemap (live preview).
    expect(loaded.config.tileLayerUrl).toBe(PREVIEW_TILE_URL);
    expect(loaded.config.storyboardName).toBe('Channel Crossing');
    expect(loaded.config.schemaVersion).toBe('2');
  });

  it('G5: rejects an unreachable URL with InlineDataLoadError', async () => {
    const deps: UrlLoaderDeps = {
      fetchText: vi.fn().mockRejectedValue(new Error('network down')),
    };
    await expect(fetchAndValidateFeaturesUrl('http://127.0.0.1:1/x', deps)).rejects.toBeInstanceOf(
      InlineDataLoadError,
    );
  });

  it('G5: rejects malformed JSON with InlineDataLoadError', async () => {
    const deps: UrlLoaderDeps = { fetchText: vi.fn().mockResolvedValue('{not json') };
    await expect(fetchAndValidateFeaturesUrl('blob:x', deps)).rejects.toBeInstanceOf(
      InlineDataLoadError,
    );
  });

  it('G5/G7: rejects a payload with no StoryboardFeature (same validator as inline)', async () => {
    const noStoryboard = {
      type: 'FeatureCollection',
      features: validFeatures.features.filter((f) => f.properties.kind !== 'STORYBOARD'),
    };
    await expect(
      fetchAndValidateFeaturesUrl('blob:x', depsReturning(noStoryboard)),
    ).rejects.toThrow(InlineDataLoadError);
  });

  it('G6: a zero-scene storyboard validates (boot maps it to the empty state)', async () => {
    const zeroScenes = {
      type: 'FeatureCollection',
      features: [validFeatures.features[0]],
    };
    const loaded = await fetchAndValidateFeaturesUrl('blob:x', depsReturning(zeroScenes));
    expect(loaded.scenes).toHaveLength(0);
  });
});
