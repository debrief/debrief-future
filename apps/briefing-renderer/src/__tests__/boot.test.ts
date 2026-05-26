/**
 * Vitest for the SPA boot sequence (T059).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { bootBriefingRenderer } from '../boot';
import { useBriefingStore } from '../store';

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
});
