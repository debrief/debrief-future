/**
 * Unit tests for built-in colour dimensions (#134).
 */

import { describe, it, expect } from 'vitest';
import { ageDimension } from '../dimensions/age';
import { tagDimension } from '../dimensions/tag';
import type { StacBrowserItem } from '../../filter-engine/types';

function makeItem(overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id: 'test-item',
    title: 'Test Exercise',
    itemPath: 'catalog/test/item.json',
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

describe('ageDimension', () => {
  it('has correct metadata', () => {
    expect(ageDimension.id).toBe('age');
    expect(ageDimension.label).toBe('Age');
    expect(ageDimension.type).toBe('gradient');
  });

  it('resolves endDatetime preferentially', () => {
    const item = makeItem({
      datetime: '2020-01-01T00:00:00Z',
      startDatetime: '2023-01-01T00:00:00Z',
      endDatetime: '2024-06-15T00:00:00Z',
    });
    expect(ageDimension.resolve(item)).toBe('2024-06-15T00:00:00Z');
  });

  it('falls back to startDatetime', () => {
    const item = makeItem({
      datetime: '2020-01-01T00:00:00Z',
      startDatetime: '2023-01-01T00:00:00Z',
    });
    expect(ageDimension.resolve(item)).toBe('2023-01-01T00:00:00Z');
  });

  it('falls back to datetime', () => {
    const item = makeItem({ datetime: '2020-01-01T00:00:00Z' });
    expect(ageDimension.resolve(item)).toBe('2020-01-01T00:00:00Z');
  });

  it('returns null when no date is available', () => {
    expect(ageDimension.resolve(makeItem())).toBeNull();
  });
});

describe('tagDimension', () => {
  it('has correct metadata', () => {
    expect(tagDimension.id).toBe('tag');
    expect(tagDimension.label).toBe('Tag');
    expect(tagDimension.type).toBe('categorical');
  });

  it('resolves first tag', () => {
    const item = makeItem({ tags: ['exercise-a', 'exercise-b'] });
    expect(tagDimension.resolve(item)).toBe('exercise-a');
  });

  it('returns null for empty tags', () => {
    expect(tagDimension.resolve(makeItem())).toBeNull();
  });
});
