import { describe, it, expect } from 'vitest';
import { computeDistinctValues } from '../useDistinctValues';
import type { StacBrowserItem } from '../../filter-engine';

function makeItem(id: string, overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `/catalog/${id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
    ...overrides,
  };
}

describe('computeDistinctValues', () => {
  it('returns empty arrays for empty items', () => {
    const result = computeDistinctValues([]);
    expect(result['nationality']).toEqual([]);
    expect(result['tag']).toEqual([]);
    expect(result['author']).toEqual([]);
  });

  it('extracts and deduplicates nationalities', () => {
    const items = [
      makeItem('1', { platforms: [{ id: 'P1', nationality: 'French' }, { id: 'P2', nationality: 'British' }] }),
      makeItem('2', { platforms: [{ id: 'P3', nationality: 'French' }, { id: 'P4', nationality: 'German' }] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['nationality']).toEqual(['British', 'French', 'German']);
  });

  it('sorts values alphabetically', () => {
    const items = [
      makeItem('1', { platforms: [{ id: 'P1', nationality: 'German' }, { id: 'P2', nationality: 'French' }, { id: 'P3', nationality: 'British' }] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['nationality']).toEqual(['British', 'French', 'German']);
  });

  it('handles null/empty author fields', () => {
    const items = [
      makeItem('1', { author: null }),
      makeItem('2', { author: 'Alice' }),
      makeItem('3', { author: '' }),
      makeItem('4', { author: 'Bob' }),
    ];
    const result = computeDistinctValues(items);
    expect(result['author']).toEqual(['Alice', 'Bob']);
  });

  it('merges tags and featureTags into tag', () => {
    const items = [
      makeItem('1', { tags: ['alpha', 'beta'], featureTags: ['delta'] }),
      makeItem('2', { tags: ['beta', 'gamma'], featureTags: ['alpha'] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['tag']).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });

  it('extracts vessel classes', () => {
    const items = [
      makeItem('1', { platforms: [{ id: 'P1', vessel_class: 'surface/warship/frigate/type23' }] }),
      makeItem('2', { platforms: [{ id: 'P2', vessel_class: 'surface/warship/destroyer/type45' }] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['vessel-class']).toEqual([
      'surface/warship/destroyer/type45',
      'surface/warship/frigate/type23',
    ]);
  });

  it('returns empty arrays for free-text types', () => {
    const items = [makeItem('1', { title: 'Test Title' })];
    const result = computeDistinctValues(items);
    expect(result['title']).toEqual([]);
    expect(result['plot-contents']).toEqual([]);
    expect(result['duration']).toEqual([]);
  });

  it('extracts collections', () => {
    const items = [
      makeItem('1', { collection: 'exercises' }),
      makeItem('2', { collection: 'training' }),
      makeItem('3', { collection: 'exercises' }),
    ];
    const result = computeDistinctValues(items);
    expect(result['collection']).toEqual(['exercises', 'training']);
  });

  it('extracts track names', () => {
    const items = [
      makeItem('1', { platforms: [{ id: 'P1', name: 'HMS Foo' }, { id: 'P2', name: 'HMS Bar' }] }),
      makeItem('2', { platforms: [{ id: 'P3', name: 'HMS Bar' }, { id: 'P4', name: 'HMS Baz' }] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['track-name']).toEqual(['HMS Bar', 'HMS Baz', 'HMS Foo']);
  });

  it('includes featureTags in tag values', () => {
    const items = [
      makeItem('1', { featureTags: ['tag-a', 'tag-b'] }),
      makeItem('2', { featureTags: ['tag-b', 'tag-c'] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['tag']).toEqual(['tag-a', 'tag-b', 'tag-c']);
  });

  // U14 (#186)
  it('U14: produces a platform sub-object with nationality/domain/vessel_role/vessel_type arrays', () => {
    const items = [
      makeItem('1', {
        platforms: [
          {
            id: 'P1',
            name: 'HMS Argyll',
            nationality: 'GB',
            vessel_class: 'surface/warship/frigate/type23',
            vessel_role: 'frigate',
            vessel_type: 'type23',
            domain: 'surface',
          },
        ],
      }),
    ];
    const result = computeDistinctValues(items);
    expect(result.platform).toBeDefined();
    expect(result.platform.nationality).toEqual(['GB']);
    expect(result.platform.domain).toEqual(['surface']);
    expect(result.platform.vessel_role).toEqual(['frigate']);
    expect(result.platform.vessel_type).toEqual(['type23']);
  });

  // U15 (#186)
  it('U15: platform sub-arrays deduplicate, filter empties, and locale-sort', () => {
    const items = [
      makeItem('1', {
        platforms: [
          { id: 'P1', nationality: 'GB', domain: 'surface', vessel_role: 'frigate' },
          { id: 'P2', nationality: 'DE', domain: 'subsurface' },
        ],
      }),
      makeItem('2', {
        platforms: [
          { id: 'P3', nationality: 'GB', domain: 'surface' },
          { id: 'P4', nationality: 'US', domain: 'surface', vessel_role: 'destroyer' },
          // empty string should be filtered
          { id: 'P5', nationality: '' as unknown as string, domain: undefined },
        ],
      }),
    ];
    const result = computeDistinctValues(items);
    expect(result.platform.nationality).toEqual(['DE', 'GB', 'US']);
    expect(result.platform.domain).toEqual(['subsurface', 'surface']);
    expect(result.platform.vessel_role).toEqual(['destroyer', 'frigate']);
  });

  // U16 (#186)
  it('U16: empty catalogue yields empty platform arrays', () => {
    const result = computeDistinctValues([]);
    expect(result.platform).toEqual({
      nationality: [],
      domain: [],
      vessel_role: [],
      vessel_type: [],
    });
  });
});
