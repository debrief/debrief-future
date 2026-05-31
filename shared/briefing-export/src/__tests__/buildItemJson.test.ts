import { describe, it, expect } from 'vitest';
import { buildItemJson, type StacItemMinimal } from '../index';
import type { SceneFeature } from '@debrief/components/storyboard';

function makeScene(id: string): SceneFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id,
      storyboard_id: 'SB',
      title: id,
      timestamp: '2025-01-15T12:00:00Z',
      creation_order: 0,
      viewport: { center: [0, 0], zoom: 6, bearing: 0 },
    },
  } as unknown as SceneFeature;
}

const sourceItem: StacItemMinimal = {
  type: 'Feature',
  stac_version: '1.1.0',
  id: 'plot-42',
  properties: {
    title: 'Operation Foxtrot',
    datetime: null,
    start_datetime: '2025-01-15T00:00:00Z',
    end_datetime: '2025-01-15T23:59:59Z',
    'proj:epsg': 4326,
  },
  assets: {
    'rep-source': {
      href: './source.rep',
      type: 'application/octet-stream',
      title: 'Source REP file',
    },
    'scene-thumbnail-ULID1': { href: './scene-thumbnails/scene-ULID1.png', type: 'image/png' },
    'scene-thumbnail-ULID1-sm': { href: './scene-thumbnails/scene-ULID1-sm.png', type: 'image/png' },
    'scene-thumbnail-ULID2': { href: './scene-thumbnails/scene-ULID2.png', type: 'image/png' },
    'scene-thumbnail-ULID2-sm': { href: './scene-thumbnails/scene-ULID2-sm.png', type: 'image/png' },
    'scene-thumbnail-ORPHAN': { href: './scene-thumbnails/orphan.png', type: 'image/png' },
  },
  links: [
    { rel: 'self', href: 'https://catalog.example/items/plot-42' },
    { rel: 'parent', href: 'https://catalog.example/' },
    { rel: 'root', href: 'https://catalog.example/' },
  ],
};

describe('buildItemJson', () => {
  it('copies stac_version and id verbatim (BI-1)', () => {
    const out = buildItemJson(sourceItem, [makeScene('ULID1')]);
    expect(out.id).toBe('plot-42');
    expect(out.stac_version).toBe('1.1.0');
  });

  it('copies title and time bounds unmodified (BI-2)', () => {
    const out = buildItemJson(sourceItem, [makeScene('ULID1')]);
    expect(out.properties.title).toBe('Operation Foxtrot');
    expect(out.properties.start_datetime).toBe('2025-01-15T00:00:00Z');
    expect(out.properties.end_datetime).toBe('2025-01-15T23:59:59Z');
  });

  it('retains only Scene-thumbnail assets referenced by Scenes (BI-3)', () => {
    const out = buildItemJson(sourceItem, [makeScene('ULID1'), makeScene('ULID2')]);
    const keys = Object.keys(out.assets).sort();
    expect(keys).toEqual([
      'scene-thumbnail-ULID1',
      'scene-thumbnail-ULID1-sm',
      'scene-thumbnail-ULID2',
      'scene-thumbnail-ULID2-sm',
    ]);
    expect(keys).not.toContain('scene-thumbnail-ORPHAN');
    expect(keys).not.toContain('rep-source');
  });

  it('preserves asset hrefs unchanged (BI-4)', () => {
    const out = buildItemJson(sourceItem, [makeScene('ULID1')]);
    expect(out.assets['scene-thumbnail-ULID1']?.href).toBe('./scene-thumbnails/scene-ULID1.png');
  });

  it('reduces links to self only, with relative href (BI-5)', () => {
    const out = buildItemJson(sourceItem, [makeScene('ULID1')]);
    expect(out.links).toEqual([{ rel: 'self', href: './item.json' }]);
  });

  it('produces an empty assets map when no Scenes are in scope', () => {
    const out = buildItemJson(sourceItem, []);
    expect(out.assets).toEqual({});
  });

  it('does not mutate the source item', () => {
    const before = JSON.stringify(sourceItem);
    buildItemJson(sourceItem, [makeScene('ULID1')]);
    expect(JSON.stringify(sourceItem)).toBe(before);
  });
});
