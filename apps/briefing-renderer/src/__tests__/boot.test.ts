/**
 * Vitest for the SPA boot sequence (T059).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootBriefingRenderer, bootBriefingRendererFromUrl } from '../boot';
import { useBriefingStore } from '../store';
import type { UrlLoaderDeps } from '../loaders/urlDataLoader';

beforeEach(() => {
  useBriefingStore.setState({
    bootState: 'loading',
    bootError: null,
    scenes: [],
    features: null,
    item: null,
    config: null,
    currentSceneIndex: 0,
  });
});

describe('bootBriefingRenderer', () => {
  it('seeds from inlineData when supplied', () => {
    const features = { type: 'FeatureCollection' as const, features: [] };
    const item = {
      type: 'Feature' as const,
      stac_version: '1.1.0',
      id: 'plot',
      properties: { title: 'P' },
      assets: {},
      links: [],
    };
    const config = {
      tileLayerAttribution: '',
      schemaVersion: '2',
      exportedAt: '',
      sourcePlotTitle: '',
      storyboardName: '',
      maxBundledZoom: 6,
    };
    const result = bootBriefingRenderer(useBriefingStore.getState(), {
      inlineData: {
        features: features as unknown as ReturnType<typeof useBriefingStore.getState>['features'] & object,
        item,
        config,
        storyboard: {} as never,
        scenes: [],
      },
    });
    expect(result).toEqual({ kind: 'seeded' });
    // Empty Scenes → bootState becomes 'empty' inside `seed`.
    expect(useBriefingStore.getState().bootState).toBe('empty');
  });

  it('falls back to the dev fixture when no inline data + no slots', () => {
    const result = bootBriefingRenderer(useBriefingStore.getState(), {});
    expect(result.kind).toBe('seeded');
    expect(useBriefingStore.getState().scenes.length).toBeGreaterThan(0);
    expect(useBriefingStore.getState().bootState).toBe('ready');
  });

  it('returns an error when slots are empty and dev fixture is suppressed', () => {
    const result = bootBriefingRenderer(useBriefingStore.getState(), {
      disableDevFixture: true,
    });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toMatch(/No briefing data found/);
    }
  });

  // US3 / FR-011 / contract preview-boot G3: the inline path makes zero
  // network requests for storyboard data. `bootBriefingRenderer` never
  // touches `fetch`; this guards against a regression where the two boot
  // paths get entangled.
  it('G3: the inline boot path issues no network request', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    bootBriefingRenderer(useBriefingStore.getState(), { disableDevFixture: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

const URL_FEATURES = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature',
      id: 'SB1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { kind: 'STORYBOARD', id: 'SB1', name: 'Live', schema_version: 2 },
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

function urlDeps(json: unknown): UrlLoaderDeps {
  return { fetchText: vi.fn().mockResolvedValue(JSON.stringify(json)) };
}

describe('bootBriefingRendererFromUrl (#273 live preview)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('G4: seeds from a valid features URL and reaches ready', async () => {
    const result = await bootBriefingRendererFromUrl(
      useBriefingStore.getState(),
      'blob:preview',
      urlDeps(URL_FEATURES),
    );
    expect(result.kind).toBe('seeded');
    const state = useBriefingStore.getState();
    expect(state.bootState).toBe('ready');
    expect(state.scenes).toHaveLength(1);
    // Live preview uses the online basemap.
    expect(state.config?.tileLayerUrl).toMatch(/^https?:\/\//);
  });

  it('G6: a zero-scene storyboard URL reaches the empty state', async () => {
    const zeroScenes = { type: 'FeatureCollection' as const, features: [URL_FEATURES.features[0]] };
    await bootBriefingRendererFromUrl(useBriefingStore.getState(), 'blob:x', urlDeps(zeroScenes));
    expect(useBriefingStore.getState().bootState).toBe('empty');
  });

  it('G5: an unreachable features URL reaches the error state with a human-readable message', async () => {
    const deps: UrlLoaderDeps = {
      fetchText: vi.fn().mockRejectedValue(new Error('network down')),
    };
    const result = await bootBriefingRendererFromUrl(
      useBriefingStore.getState(),
      'http://127.0.0.1:1/x',
      deps,
    );
    expect(result.kind).toBe('error');
    const state = useBriefingStore.getState();
    expect(state.bootState).toBe('error');
    expect(state.bootError).toBeTruthy();
    expect(state.bootError).not.toBe('');
  });
});
