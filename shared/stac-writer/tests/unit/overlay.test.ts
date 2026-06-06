import { describe, expect, it } from 'vitest';

import { mergeOverlay } from '../../src/overlay.js';
import type { StacItem, StoredItem } from '../../src/interface.js';

const bundled: StacItem = {
  id: 'exercise-alpha',
  properties: { title: 'Bundled', 'debrief:platforms': ['HMS Boat'] },
  assets: {
    thumbnail: { href: './thumb.png', type: 'image/png' },
    data: { href: './data.geojson', type: 'application/geo+json' },
  },
  links: [{ rel: 'self', href: 'https://example.com/alpha' }],
};

describe('mergeOverlay truth table', () => {
  it('(null, null) returns null', () => {
    expect(mergeOverlay(null, null)).toBeNull();
  });

  it('(bundled, null) returns bundled as-is', () => {
    expect(mergeOverlay(bundled, null)).toBe(bundled);
  });

  it('(null, standalone) returns the stored record', () => {
    const standalone: StoredItem = {
      kind: 'standalone',
      record: {
        id: 'user-track-1',
        properties: { title: 'My Track' },
      },
      mtimeMs: 1234,
    };
    expect(mergeOverlay(null, standalone)).toBe(standalone.record);
  });

  it('(null, overlay) throws — logically impossible', () => {
    const overlay: StoredItem = {
      kind: 'overlay',
      record: { id: 'exercise-alpha', properties: {} },
      mtimeMs: 1234,
    };
    expect(() => mergeOverlay(null, overlay)).toThrowError(/impossible/);
  });

  it('(bundled, standalone) throws — illegal pairing', () => {
    const standalone: StoredItem = {
      kind: 'standalone',
      record: { id: 'exercise-alpha', properties: {} },
      mtimeMs: 1234,
    };
    expect(() => mergeOverlay(bundled, standalone)).toThrowError(/illegal/);
  });
});

describe('mergeOverlay shallow-merge rule', () => {
  it('overlay properties win for fields they set', () => {
    const overlay: StoredItem = {
      kind: 'overlay',
      record: {
        id: 'exercise-alpha',
        properties: { title: 'Overlay-edited' },
      },
      mtimeMs: 1234,
    };
    const merged = mergeOverlay(bundled, overlay);
    expect(merged?.properties.title).toBe('Overlay-edited');
    expect(merged?.properties['debrief:platforms']).toEqual(['HMS Boat']);
  });

  it('overlay assets layer on top, bundled-only assets remain visible', () => {
    const overlay: StoredItem = {
      kind: 'overlay',
      record: {
        id: 'exercise-alpha',
        properties: {},
        assets: {
          'scene-thumbnail-01H': { href: 'idb:exercise-alpha::scene-thumbnail-01H' },
        },
      },
      mtimeMs: 1234,
    };
    const merged = mergeOverlay(bundled, overlay);
    expect(merged?.assets?.thumbnail).toEqual(bundled.assets!.thumbnail);
    expect(merged?.assets?.data).toEqual(bundled.assets!.data);
    expect(merged?.assets?.['scene-thumbnail-01H']).toBeDefined();
  });

  it('overlay assets override bundled when keys collide', () => {
    const overlay: StoredItem = {
      kind: 'overlay',
      record: {
        id: 'exercise-alpha',
        properties: {},
        assets: {
          thumbnail: { href: 'idb:overridden::thumbnail' },
        },
      },
      mtimeMs: 1234,
    };
    const merged = mergeOverlay(bundled, overlay);
    expect(merged?.assets?.thumbnail.href).toBe('idb:overridden::thumbnail');
  });

  it('links replace wholesale when overlay sets them', () => {
    const overlay: StoredItem = {
      kind: 'overlay',
      record: {
        id: 'exercise-alpha',
        properties: {},
        links: [{ rel: 'parent', href: 'https://example.com/cat' }],
      },
      mtimeMs: 1234,
    };
    const merged = mergeOverlay(bundled, overlay);
    expect(merged?.links).toEqual([
      { rel: 'parent', href: 'https://example.com/cat' },
    ]);
  });

  it('links pass through when overlay does not set them', () => {
    const overlay: StoredItem = {
      kind: 'overlay',
      record: { id: 'exercise-alpha', properties: { title: 'edited' } },
      mtimeMs: 1234,
    };
    const merged = mergeOverlay(bundled, overlay);
    expect(merged?.links).toBe(bundled.links);
  });
});
