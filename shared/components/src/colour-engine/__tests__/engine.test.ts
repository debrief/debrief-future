/**
 * Unit tests for the core colour assignment engine (#134).
 */

import { describe, it, expect } from 'vitest';
import { computeColourAssignment, getDefaultColourAssignment } from '../engine';
import { defaultPalette } from '../palette';
import { ageDimension } from '../dimensions/age';
import { tagDimension } from '../dimensions/tag';
import type { StacBrowserItem } from '../../filter-engine/types';
import type { ColourDimension } from '../types';

function makeItem(id: string, overrides: Partial<StacBrowserItem> = {}): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `catalog/${id}/item.json`,
    bbox: null,
    datetime: '2024-06-15T00:00:00Z',
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

describe('computeColourAssignment', () => {
  describe('categorical dimensions', () => {
    it('assigns one colour per unique tag', () => {
      const items: StacBrowserItem[] = [
        makeItem('a', { tags: ['alpha'] }),
        makeItem('b', { tags: ['bravo'] }),
        makeItem('c', { tags: ['alpha'] }),
      ];

      const result = computeColourAssignment(items, tagDimension, defaultPalette);

      // Items with same tag share one colour
      expect(result.colorMap.get('a')).toBe(result.colorMap.get('c'));
      expect(result.colorMap.get('a')).not.toBe(result.colorMap.get('b'));
    });

    it('assigns unclassified colour to items without metadata', () => {
      const items: StacBrowserItem[] = [
        makeItem('a', { tags: ['alpha'] }),
        makeItem('b', { tags: [] }),
      ];

      const result = computeColourAssignment(items, tagDimension, defaultPalette);

      expect(result.colorMap.get('b')).toBe(defaultPalette.unclassifiedColour);
      expect(result.legend!.hasUnclassified).toBe(true);
    });

    it('builds legend entries with correct counts', () => {
      const items: StacBrowserItem[] = [
        makeItem('a', { tags: ['exercise-a'] }),
        makeItem('b', { tags: ['exercise-b'] }),
        makeItem('c', { tags: ['exercise-a'] }),
      ];

      const result = computeColourAssignment(items, tagDimension, defaultPalette);

      expect(result.legend!.entries).toHaveLength(2);
      const entryA = result.legend!.entries.find((e) => e.label === 'exercise-a');
      expect(entryA).toBeDefined();
      expect(entryA!.count).toBe(2);
    });

    it('produces matching colourFn and colorMap outputs', () => {
      const items: StacBrowserItem[] = [
        makeItem('a', { tags: ['alpha'] }),
        makeItem('b', { tags: ['bravo'] }),
      ];

      const result = computeColourAssignment(items, tagDimension, defaultPalette);

      for (const item of items) {
        const mapColour = result.colorMap.get(item.id);
        const fnColour = result.colourFn(item);
        expect(fnColour).toBe(mapColour);
      }
    });

    it('handles empty items array', () => {
      const result = computeColourAssignment([], tagDimension, defaultPalette);
      expect(result.colorMap.size).toBe(0);
      expect(result.legend!.entries).toHaveLength(0);
    });
  });

  describe('gradient dimensions', () => {
    it('assigns colours along the gradient based on date range', () => {
      const items: StacBrowserItem[] = [
        makeItem('old', { datetime: '2020-01-01T00:00:00Z' }),
        makeItem('mid', { datetime: '2023-06-15T00:00:00Z' }),
        makeItem('new', { datetime: '2026-01-01T00:00:00Z' }),
      ];

      const result = computeColourAssignment(items, ageDimension, defaultPalette);

      // All should have different colours
      const oldColour = result.colorMap.get('old')!;
      const midColour = result.colorMap.get('mid')!;
      const newColour = result.colorMap.get('new')!;

      expect(oldColour).not.toBe(newColour);
      expect(midColour).not.toBe(oldColour);
      expect(midColour).not.toBe(newColour);
    });

    it('builds gradient spec with date labels', () => {
      const items: StacBrowserItem[] = [
        makeItem('old', { datetime: '2020-01-01T00:00:00Z' }),
        makeItem('new', { datetime: '2026-01-01T00:00:00Z' }),
      ];

      const result = computeColourAssignment(items, ageDimension, defaultPalette);

      expect(result.legend!.gradient).not.toBeNull();
      expect(result.legend!.gradient!.minLabel).toBeTruthy();
      expect(result.legend!.gradient!.maxLabel).toBeTruthy();
    });

    it('handles same-date items (zero range)', () => {
      const items: StacBrowserItem[] = [
        makeItem('a', { datetime: '2024-01-01T00:00:00Z' }),
        makeItem('b', { datetime: '2024-01-01T00:00:00Z' }),
      ];

      const result = computeColourAssignment(items, ageDimension, defaultPalette);

      // Both should get the same colour (maxColour since t=1 when range=0)
      expect(result.colorMap.get('a')).toBe(result.colorMap.get('b'));
    });

    it('assigns unclassified colour to items without dates', () => {
      const items: StacBrowserItem[] = [
        makeItem('a', { datetime: '2024-01-01T00:00:00Z' }),
        makeItem('b', { datetime: null }),
      ];

      const result = computeColourAssignment(items, ageDimension, defaultPalette);

      expect(result.colorMap.get('b')).toBe(defaultPalette.unclassifiedColour);
      expect(result.legend!.hasUnclassified).toBe(true);
    });
  });
});

describe('getDefaultColourAssignment', () => {
  it('assigns default colour to all items', () => {
    const items: StacBrowserItem[] = [makeItem('a'), makeItem('b')];
    const result = getDefaultColourAssignment(items, defaultPalette);

    expect(result.colorMap.get('a')).toBe(defaultPalette.defaultColour);
    expect(result.colorMap.get('b')).toBe(defaultPalette.defaultColour);
  });

  it('returns null legend', () => {
    const result = getDefaultColourAssignment([makeItem('a')], defaultPalette);
    expect(result.legend).toBeNull();
  });

  it('colourFn returns null', () => {
    const items = [makeItem('a')];
    const result = getDefaultColourAssignment(items, defaultPalette);
    expect(result.colourFn(items[0])).toBeNull();
  });
});

describe('extensibility (FR-010)', () => {
  it('supports a custom dimension without modifying existing ones', () => {
    const customDimension: ColourDimension = {
      id: 'exercise-type',
      label: 'Exercise Type',
      type: 'categorical',
      resolve: (item) => item.collection ?? null,
    };

    const items: StacBrowserItem[] = [
      makeItem('a', { collection: 'CASEX' }),
      makeItem('b', { collection: 'PHOTEX' }),
      makeItem('c', { collection: 'CASEX' }),
    ];

    const result = computeColourAssignment(items, customDimension, defaultPalette);

    expect(result.colorMap.get('a')).toBe(result.colorMap.get('c'));
    expect(result.colorMap.get('a')).not.toBe(result.colorMap.get('b'));
    expect(result.legend!.entries).toHaveLength(2);
  });
});
