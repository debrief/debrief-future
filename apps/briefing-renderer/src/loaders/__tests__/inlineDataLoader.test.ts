import { describe, it, expect, vi } from 'vitest';
import { loadInlineData, InlineDataLoadError } from '../inlineDataLoader';

const validFeatures = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'SB1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { kind: 'STORYBOARD', id: 'SB1', name: 'A', schema_version: 2 },
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
    {
      type: 'Feature',
      id: 'SC2',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: 'SC2',
        storyboard_id: 'SB1',
        title: 'Scene 2',
        timestamp: '2025-01-15T12:30:00Z',
        creation_order: 1,
        viewport: { center: [-2, 52], zoom: 7, bearing: 0 },
      },
    },
  ],
};

const validItem = {
  type: 'Feature',
  stac_version: '1.1.0',
  id: 'plot-1',
  properties: { title: 'Test plot' },
  assets: {},
  links: [{ rel: 'self', href: './item.json' }],
};

const validConfig = {
  tileLayerAttribution: '© Test',
  schemaVersion: '2',
  exportedAt: '2025-01-15T00:00:00Z',
  sourcePlotTitle: 'Test plot',
  storyboardName: 'A',
  maxBundledZoom: 8,
};

function deps(payloads: Record<string, unknown>) {
  return {
    readSlot(id: string): string | null {
      const slot = id.replace('briefing-', '').replace('-data', '');
      const value = payloads[slot];
      return value === undefined ? null : JSON.stringify(value);
    },
  };
}

describe('inlineDataLoader', () => {
  it('returns null when all slots are empty', () => {
    const result = loadInlineData({ readSlot: () => null });
    expect(result).toBeNull();
  });

  it('loads a valid briefing payload', () => {
    const result = loadInlineData(
      deps({ features: validFeatures, item: validItem, config: validConfig }),
    );
    expect(result).not.toBeNull();
    expect(result?.scenes).toHaveLength(2);
    expect(result?.storyboard.properties.id).toBe('SB1');
  });

  it('orders Scenes by timestamp then creation_order', () => {
    const scenes = [
      { ...validFeatures.features[2], properties: { ...validFeatures.features[2]!.properties } },
      { ...validFeatures.features[1], properties: { ...validFeatures.features[1]!.properties } },
    ];
    const features = { ...validFeatures, features: [validFeatures.features[0], ...scenes] };
    const result = loadInlineData(
      deps({ features, item: validItem, config: validConfig }),
    );
    expect(result?.scenes.map((s) => s.id)).toEqual(['SC1', 'SC2']);
  });

  it('throws when no StoryboardFeature is present', () => {
    const features = {
      ...validFeatures,
      features: validFeatures.features.filter((f) => f.properties.kind !== 'STORYBOARD'),
    };
    expect(() =>
      loadInlineData(deps({ features, item: validItem, config: validConfig })),
    ).toThrow(InlineDataLoadError);
  });

  it('throws when more than one StoryboardFeature is present', () => {
    const features = {
      ...validFeatures,
      features: [
        ...validFeatures.features,
        {
          ...validFeatures.features[0],
          id: 'SB2',
          properties: { ...validFeatures.features[0]!.properties, id: 'SB2', name: 'B' },
        },
      ],
    };
    expect(() =>
      loadInlineData(deps({ features, item: validItem, config: validConfig })),
    ).toThrow(/expected exactly 1/);
  });

  it('throws when a Scene references a different storyboard_id', () => {
    const features = {
      ...validFeatures,
      features: [
        validFeatures.features[0],
        {
          ...validFeatures.features[1],
          properties: { ...validFeatures.features[1]!.properties, storyboard_id: 'OTHER' },
        },
      ],
    };
    expect(() =>
      loadInlineData(deps({ features, item: validItem, config: validConfig })),
    ).toThrow(/different Storyboard/);
  });

  it('throws on malformed JSON', () => {
    expect(() =>
      loadInlineData({
        readSlot: (id) => (id === 'briefing-features-data' ? '{not json' : '{}'),
      }),
    ).toThrow(InlineDataLoadError);
  });

  it('throws when item.json is missing required id', () => {
    const item = { ...validItem, id: '' };
    expect(() =>
      loadInlineData(deps({ features: validFeatures, item, config: validConfig })),
    ).toThrow(/missing required `id`/);
  });

  it('throws when config is missing maxBundledZoom', () => {
    const config = { ...validConfig };
    delete (config as { maxBundledZoom?: number }).maxBundledZoom;
    expect(() =>
      loadInlineData(deps({ features: validFeatures, item: validItem, config })),
    ).toThrow(/maxBundledZoom/);
  });

  // US3 / FR-011 / contract preview-boot G3: the inline path is the
  // air-gapped offline path used by distributed briefing zips. It must
  // never reach for the network — the #273 live-preview URL fetch lives in
  // a separate loader (FR-012, clean separation).
  it('G3: issues no network request for storyboard data', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    loadInlineData(deps({ features: validFeatures, item: validItem, config: validConfig }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
