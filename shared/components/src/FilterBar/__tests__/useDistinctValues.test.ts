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
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
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
      makeItem('1', { nationalities: ['French', 'British'] }),
      makeItem('2', { nationalities: ['French', 'German'] }),
    ];
    const result = computeDistinctValues(items);
    expect(result['nationality']).toEqual(['British', 'French', 'German']);
  });

  it('sorts values alphabetically', () => {
    const items = [
      makeItem('1', { nationalities: ['German', 'French', 'British'] }),
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
      makeItem('1', { vesselClasses: ['surface/warship/frigate/type23'] }),
      makeItem('2', { vesselClasses: ['surface/warship/destroyer/type45'] }),
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
      makeItem('1', { trackNames: ['HMS Foo', 'HMS Bar'] }),
      makeItem('2', { trackNames: ['HMS Bar', 'HMS Baz'] }),
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
});
