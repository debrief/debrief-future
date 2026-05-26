import { describe, it, expect } from 'vitest';
import { scopeStoryboard, StoryboardNotFoundError } from '@/services/briefingZipExport';
import type { StoryboardPlot } from '@debrief/components/storyboard';

function sb(id: string, name: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD',
      id,
      name,
      schema_version: 2,
    },
  };
}

function scene(
  id: string,
  storyboardId: string,
  index: number,
  visible: string[] = [],
) {
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
      visible_feature_ids: visible,
    },
  };
}

function track(id: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
    properties: {
      kind: 'TRACK',
      id,
      name: id,
    },
  };
}

const plot: StoryboardPlot = {
  type: 'FeatureCollection',
  features: [
    sb('SB-A', 'Phase 1 brief'),
    sb('SB-B', 'Phase 2 brief'),
    scene('SC-A1', 'SB-A', 0, ['TRACK-1']),
    scene('SC-A2', 'SB-A', 1, ['TRACK-1', 'TRACK-2']),
    scene('SC-B1', 'SB-B', 0, ['TRACK-3']),
    track('TRACK-1'),
    track('TRACK-2'),
    track('TRACK-3'),
  ],
};

describe('scopeStoryboard', () => {
  it('throws when the storyboard id is not present', () => {
    expect(() => scopeStoryboard(plot, 'UNKNOWN')).toThrow(StoryboardNotFoundError);
  });

  it('returns exactly one StoryboardFeature in the scoped FC (BR-1, BR-4)', () => {
    const result = scopeStoryboard(plot, 'SB-A');
    const sbs = result.fc.features.filter(
      (f) => (f.properties as { kind?: string }).kind === 'STORYBOARD',
    );
    expect(sbs).toHaveLength(1);
    expect((sbs[0]!.properties as { id: string }).id).toBe('SB-A');
  });

  it('includes only Scenes whose storyboard_id matches (BR-2, BR-4)', () => {
    const result = scopeStoryboard(plot, 'SB-A');
    const sceneIds = result.scenes.map((s) => (s.properties as { id: string }).id);
    expect(sceneIds).toEqual(['SC-A1', 'SC-A2']);
  });

  it('orders scenes by (timestamp, creation_order) (BR-5)', () => {
    const out = scopeStoryboard(plot, 'SB-A');
    const orders = out.scenes.map((s) => (s.properties as { creation_order: number }).creation_order);
    expect(orders).toEqual([0, 1]);
  });

  it('includes referenced data features in scope (BR-3)', () => {
    const result = scopeStoryboard(plot, 'SB-A');
    const trackIds = result.fc.features
      .filter((f) => (f.properties as { kind?: string }).kind === 'TRACK')
      .map((f) => (f as { id: string }).id);
    expect(trackIds.sort()).toEqual(['TRACK-1', 'TRACK-2']);
  });

  it('excludes features referenced only by other Storyboards (US4 acceptance 1)', () => {
    const result = scopeStoryboard(plot, 'SB-A');
    const ids = result.fc.features.map((f) => (f as { id?: unknown }).id);
    expect(ids).not.toContain('TRACK-3');
  });

  it('includes a feature referenced by both Storyboards in each scope (US4 acceptance 2)', () => {
    const sharedPlot: StoryboardPlot = {
      type: 'FeatureCollection',
      features: [
        sb('SB-A', 'A'),
        sb('SB-B', 'B'),
        scene('SC-A', 'SB-A', 0, ['SHARED']),
        scene('SC-B', 'SB-B', 0, ['SHARED']),
        track('SHARED'),
      ],
    };
    expect(scopeStoryboard(sharedPlot, 'SB-A').fc.features.some((f) => (f as { id?: unknown }).id === 'SHARED'))
      .toBe(true);
    expect(scopeStoryboard(sharedPlot, 'SB-B').fc.features.some((f) => (f as { id?: unknown }).id === 'SHARED'))
      .toBe(true);
  });

  it('produces deterministic feature ordering: storyboard, scenes, refs', () => {
    const result = scopeStoryboard(plot, 'SB-A');
    const kinds = result.fc.features.map((f) => (f.properties as { kind: string }).kind);
    expect(kinds[0]).toBe('STORYBOARD');
    expect(kinds.slice(1, 3)).toEqual(['STORYBOARD_SCENE', 'STORYBOARD_SCENE']);
    expect(kinds.slice(3)).toEqual(['TRACK', 'TRACK']);
  });
});
