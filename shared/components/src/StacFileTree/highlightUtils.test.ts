import { describe, it, expect } from 'vitest';
import { computeHighlightSets } from './highlightUtils';

describe('computeHighlightSets', () => {
  it('returns empty sets for empty input', () => {
    const result = computeHighlightSets([]);

    expect(result.directPaths.size).toBe(0);
    expect(result.ancestorPaths.size).toBe(0);
  });

  it('computes direct and ancestor paths for single path', () => {
    const result = computeHighlightSets(['/catalog/item-001/snapshot-1.json']);

    expect(result.directPaths.has('/catalog/item-001/snapshot-1.json')).toBe(true);
    expect(result.ancestorPaths.has('/catalog')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/item-001')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/item-001/snapshot-1.json')).toBe(false);
  });

  it('computes ancestors for multiple paths', () => {
    const result = computeHighlightSets([
      '/catalog/item-001/snapshot-1.json',
      '/catalog/item-002/snapshot-2.json',
    ]);

    expect(result.directPaths.size).toBe(2);
    expect(result.directPaths.has('/catalog/item-001/snapshot-1.json')).toBe(true);
    expect(result.directPaths.has('/catalog/item-002/snapshot-2.json')).toBe(true);

    expect(result.ancestorPaths.has('/catalog')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/item-001')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/item-002')).toBe(true);
  });

  it('handles nested paths correctly', () => {
    const result = computeHighlightSets(['/a/b/c/d/file.json']);

    expect(result.directPaths.has('/a/b/c/d/file.json')).toBe(true);
    expect(result.ancestorPaths.has('/a')).toBe(true);
    expect(result.ancestorPaths.has('/a/b')).toBe(true);
    expect(result.ancestorPaths.has('/a/b/c')).toBe(true);
    expect(result.ancestorPaths.has('/a/b/c/d')).toBe(true);
    expect(result.ancestorPaths.has('/a/b/c/d/file.json')).toBe(false);
  });

  it('handles root path', () => {
    const result = computeHighlightSets(['/file.json']);

    expect(result.directPaths.has('/file.json')).toBe(true);
    expect(result.ancestorPaths.size).toBe(0);
  });

  it('handles paths without leading slash', () => {
    const result = computeHighlightSets(['catalog/item-001/file.json']);

    expect(result.directPaths.has('catalog/item-001/file.json')).toBe(true);
    expect(result.ancestorPaths.has('/catalog')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/item-001')).toBe(true);
  });

  it('does not add direct paths to ancestor paths', () => {
    const result = computeHighlightSets(['/catalog', '/catalog/item-001/file.json']);

    expect(result.directPaths.has('/catalog')).toBe(true);
    expect(result.directPaths.has('/catalog/item-001/file.json')).toBe(true);

    // /catalog should not be in ancestorPaths since it's in directPaths
    expect(result.ancestorPaths.has('/catalog')).toBe(false);
    expect(result.ancestorPaths.has('/catalog/item-001')).toBe(true);
  });

  it('handles duplicate paths', () => {
    const result = computeHighlightSets([
      '/catalog/item-001/file.json',
      '/catalog/item-001/file.json',
    ]);

    expect(result.directPaths.size).toBe(1);
    expect(result.directPaths.has('/catalog/item-001/file.json')).toBe(true);
  });

  it('handles shared ancestor paths', () => {
    const result = computeHighlightSets([
      '/catalog/collection-a/item-001/file.json',
      '/catalog/collection-a/item-002/file.json',
      '/catalog/collection-b/item-003/file.json',
    ]);

    expect(result.ancestorPaths.has('/catalog')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/collection-a')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/collection-b')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/collection-a/item-001')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/collection-a/item-002')).toBe(true);
    expect(result.ancestorPaths.has('/catalog/collection-b/item-003')).toBe(true);
  });
});
