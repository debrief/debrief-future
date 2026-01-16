import { describe, it, expect } from 'vitest';
import { isValidStorePath, buildStacUri, parseStacUri } from '../../src/types/stac';

describe('Store validation', () => {
  describe('isValidStorePath', () => {
    it('accepts absolute Unix paths', () => {
      expect(isValidStorePath('/home/user/data')).toBe(true);
      expect(isValidStorePath('/var/stac/catalogs')).toBe(true);
      expect(isValidStorePath('/')).toBe(true);
    });

    it('accepts absolute Windows paths', () => {
      expect(isValidStorePath('C:\\Users\\data')).toBe(true);
      expect(isValidStorePath('D:/projects/stac')).toBe(true);
      expect(isValidStorePath('E:\\')).toBe(true);
    });

    it('rejects relative paths', () => {
      expect(isValidStorePath('data/catalog')).toBe(false);
      expect(isValidStorePath('./local')).toBe(false);
      expect(isValidStorePath('../parent')).toBe(false);
    });

    it('rejects empty paths', () => {
      expect(isValidStorePath('')).toBe(false);
    });
  });

  describe('buildStacUri', () => {
    it('creates valid stac:// URI', () => {
      const uri = buildStacUri('store-123', 'items/plot-1.json');
      expect(uri).toBe('stac://store-123/items/plot-1.json');
    });

    it('handles paths with slashes', () => {
      const uri = buildStacUri('store-1', 'catalogs/2024/items/plot.json');
      expect(uri).toBe('stac://store-1/catalogs/2024/items/plot.json');
    });
  });

  describe('parseStacUri', () => {
    it('parses valid stac:// URI', () => {
      const result = parseStacUri('stac://store-123/items/plot-1.json');

      expect(result).not.toBeNull();
      expect(result?.storeId).toBe('store-123');
      expect(result?.itemPath).toBe('items/plot-1.json');
    });

    it('handles deep paths', () => {
      const result = parseStacUri(
        'stac://store-1/catalogs/2024/january/items/plot.json'
      );

      expect(result).not.toBeNull();
      expect(result?.storeId).toBe('store-1');
      expect(result?.itemPath).toBe('catalogs/2024/january/items/plot.json');
    });

    it('returns null for non-stac URIs', () => {
      expect(parseStacUri('file:///path/to/file')).toBeNull();
      expect(parseStacUri('http://example.com')).toBeNull();
      expect(parseStacUri('/local/path')).toBeNull();
    });

    it('returns null for invalid stac URIs', () => {
      expect(parseStacUri('stac://')).toBeNull();
      expect(parseStacUri('stac://store-only')).toBeNull();
      expect(parseStacUri('stac:/store/path')).toBeNull();
    });
  });
});
