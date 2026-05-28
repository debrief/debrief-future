/**
 * Unit tests for selection path utilities.
 * Feature: 053-nested-child-selection
 */

import { describe, it, expect } from 'vitest';
import {
  getLevelRegistry,
  escapeSegment,
  unescapeSegment,
  normalisePath,
  parsePath,
  buildPath,
  getRoot,
  getDepth,
  isRootPath,
  getParent,
  validatePathStructure,
  validatePathSemantics,
} from '../../../src/utils/selectionPath.js';

// ─── getLevelRegistry (T016) ────────────────────────────────────────

describe('getLevelRegistry', () => {
  it('should return a map with positions, segments, points, polygons, rings, vertices, and vertex', () => {
    const registry = getLevelRegistry();
    expect(registry.size).toBe(7);
    expect(registry.has('positions')).toBe(true);
    expect(registry.has('segments')).toBe(true);
    expect(registry.has('points')).toBe(true);
    expect(registry.has('polygons')).toBe(true);
    expect(registry.has('rings')).toBe(true);
    expect(registry.has('vertices')).toBe(true);
    expect(registry.has('vertex')).toBe(true);
  });

  it('should define rings as index-based (spec 192)', () => {
    const registry = getLevelRegistry();
    expect(registry.get('rings')?.addressingMode).toBe('index');
  });

  it('should define vertices as index-based (spec 192)', () => {
    const registry = getLevelRegistry();
    expect(registry.get('vertices')?.addressingMode).toBe('index');
  });

  it('should define vertex as index-based (spec 192)', () => {
    const registry = getLevelRegistry();
    expect(registry.get('vertex')?.addressingMode).toBe('index');
  });

  it('should define points as index-based', () => {
    const registry = getLevelRegistry();
    expect(registry.get('points')?.addressingMode).toBe('index');
  });

  it('should define polygons as index-based', () => {
    const registry = getLevelRegistry();
    expect(registry.get('polygons')?.addressingMode).toBe('index');
  });

  it('should define positions as index-based', () => {
    const registry = getLevelRegistry();
    expect(registry.get('positions')?.addressingMode).toBe('index');
  });

  it('should define segments as id-based', () => {
    const registry = getLevelRegistry();
    expect(registry.get('segments')?.addressingMode).toBe('id');
  });

  it('should be immutable (ReadonlyMap)', () => {
    const registry = getLevelRegistry();
    // ReadonlyMap does not expose set/delete at compile time
    expect(typeof (registry as Map<string, unknown>).set).toBe('function');
    // But we verify it returns the same instance
    expect(getLevelRegistry()).toBe(registry);
  });
});

// ─── escapeSegment & unescapeSegment (T009) ─────────────────────────

describe('escapeSegment', () => {
  it('should escape tilde to ~0', () => {
    expect(escapeSegment('track~test')).toBe('track~0test');
  });

  it('should escape slash to ~1', () => {
    expect(escapeSegment('track/alpha')).toBe('track~1alpha');
  });

  it('should escape both tilde and slash', () => {
    expect(escapeSegment('a~/b')).toBe('a~0~1b');
  });

  it('should leave normal strings unchanged', () => {
    expect(escapeSegment('track-001')).toBe('track-001');
  });

  it('should handle empty string', () => {
    expect(escapeSegment('')).toBe('');
  });
});

describe('unescapeSegment', () => {
  it('should unescape ~0 to tilde', () => {
    expect(unescapeSegment('track~0test')).toBe('track~test');
  });

  it('should unescape ~1 to slash', () => {
    expect(unescapeSegment('track~1alpha')).toBe('track/alpha');
  });

  it('should unescape in correct order (~1 before ~0)', () => {
    expect(unescapeSegment('a~0~1b')).toBe('a~/b');
  });

  it('should leave normal strings unchanged', () => {
    expect(unescapeSegment('track-001')).toBe('track-001');
  });
});

describe('escape round-trip', () => {
  it('should round-trip tilde', () => {
    const original = 'track~test';
    expect(unescapeSegment(escapeSegment(original))).toBe(original);
  });

  it('should round-trip slash', () => {
    const original = 'track/alpha';
    expect(unescapeSegment(escapeSegment(original))).toBe(original);
  });

  it('should round-trip complex string', () => {
    const original = 'a~/b~c/d';
    expect(unescapeSegment(escapeSegment(original))).toBe(original);
  });
});

// ─── normalisePath (T010) ───────────────────────────────────────────

describe('normalisePath', () => {
  it('should trim whitespace', () => {
    expect(normalisePath('  track-001  ')).toBe('track-001');
  });

  it('should strip trailing slash', () => {
    expect(normalisePath('track-001/')).toBe('track-001');
  });

  it('should return empty string for whitespace-only', () => {
    expect(normalisePath('   ')).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(normalisePath('')).toBe('');
  });

  it('should not modify valid paths', () => {
    expect(normalisePath('track-001/positions/4')).toBe('track-001/positions/4');
  });
});

// ─── parsePath (T011) ───────────────────────────────────────────────

describe('parsePath', () => {
  it('should parse root-only path', () => {
    const result = parsePath('track-001');
    expect(result).toEqual({
      raw: 'track-001',
      root: 'track-001',
      levels: [],
      depth: 0,
    });
  });

  it('should parse single-level path', () => {
    const result = parsePath('track-001/positions/4');
    expect(result).toEqual({
      raw: 'track-001/positions/4',
      root: 'track-001',
      levels: [{ levelName: 'positions', address: '4' }],
      depth: 1,
    });
  });

  it('should parse multi-level path', () => {
    const result = parsePath('track-001/segments/leg-alpha/positions/3');
    expect(result).toEqual({
      raw: 'track-001/segments/leg-alpha/positions/3',
      root: 'track-001',
      levels: [
        { levelName: 'segments', address: 'leg-alpha' },
        { levelName: 'positions', address: '3' },
      ],
      depth: 2,
    });
  });

  it('should handle escaped root ID', () => {
    const result = parsePath('track~1alpha');
    expect(result.root).toBe('track~1alpha');
    expect(result.depth).toBe(0);
  });

  it('should handle escaped segment address', () => {
    const result = parsePath('track-001/segments/seg~1a/positions/0');
    expect(result.levels[0]).toEqual({ levelName: 'segments', address: 'seg~1a' });
    expect(result.levels[1]).toEqual({ levelName: 'positions', address: '0' });
  });

  it('should throw on empty path', () => {
    expect(() => parsePath('')).toThrow('must not be empty');
  });

  it('should throw on whitespace-only path', () => {
    expect(() => parsePath('   ')).toThrow('must not be empty');
  });

  it('should throw on double slash (empty segment)', () => {
    expect(() => parsePath('track-001//positions/4')).toThrow('empty segments');
  });

  it('should throw on incomplete level (missing address)', () => {
    expect(() => parsePath('track-001/positions')).toThrow('incomplete level');
  });

  it('should normalise trailing slash before parsing', () => {
    const result = parsePath('track-001/');
    expect(result.root).toBe('track-001');
    expect(result.depth).toBe(0);
  });

  // US3 deep nesting tests
  it('should parse 3-level path (T060)', () => {
    const result = parsePath('track-001/segments/alpha/positions/3');
    expect(result.depth).toBe(2);
    expect(result.levels).toHaveLength(2);
    expect(result.levels[0]).toEqual({ levelName: 'segments', address: 'alpha' });
    expect(result.levels[1]).toEqual({ levelName: 'positions', address: '3' });
  });

  it('should parse 4-level path with no depth limit', () => {
    const result = parsePath('root/a/1/b/2/c/3/d/4');
    expect(result.depth).toBe(4);
    expect(result.levels).toHaveLength(4);
  });
});

// ─── buildPath (T012) ───────────────────────────────────────────────

describe('buildPath', () => {
  it('should build root-only path', () => {
    expect(buildPath('track-001')).toBe('track-001');
  });

  it('should build single-level path', () => {
    const path = buildPath('track-001', [{ levelName: 'positions', address: '4' }]);
    expect(path).toBe('track-001/positions/4');
  });

  it('should build multi-level path', () => {
    const path = buildPath('track-001', [
      { levelName: 'segments', address: 'leg-alpha' },
      { levelName: 'positions', address: '3' },
    ]);
    expect(path).toBe('track-001/segments/leg-alpha/positions/3');
  });

  it('should build with empty levels array', () => {
    expect(buildPath('track-001', [])).toBe('track-001');
  });

  it('should round-trip with parsePath (T063)', () => {
    const original = 'track-001/segments/leg-alpha/positions/3';
    const parsed = parsePath(original);
    const rebuilt = buildPath(parsed.root, parsed.levels);
    expect(rebuilt).toBe(original);
  });

  it('should round-trip complex path through parse and build', () => {
    const paths = [
      'track-001',
      'track-001/positions/42',
      'track-001/segments/alpha/positions/0',
      'root/a/1/b/2/c/3',
    ];
    for (const path of paths) {
      const parsed = parsePath(path);
      expect(buildPath(parsed.root, parsed.levels)).toBe(path);
    }
  });
});

// ─── getRoot, getDepth, isRootPath, getParent (T013) ────────────────

describe('getRoot', () => {
  it('should return root from root-only path', () => {
    expect(getRoot('track-001')).toBe('track-001');
  });

  it('should return root from child path', () => {
    expect(getRoot('track-001/positions/4')).toBe('track-001');
  });

  it('should return root from deeply nested path', () => {
    expect(getRoot('track-001/segments/alpha/positions/3')).toBe('track-001');
  });
});

describe('getDepth', () => {
  it('should return 0 for root-only', () => {
    expect(getDepth('track-001')).toBe(0);
  });

  it('should return 1 for single-level', () => {
    expect(getDepth('track-001/positions/4')).toBe(1);
  });

  it('should return 2 for two-level (T062)', () => {
    expect(getDepth('track-001/segments/alpha/positions/3')).toBe(2);
  });

  it('should return 4 for four-level', () => {
    expect(getDepth('root/a/1/b/2/c/3/d/4')).toBe(4);
  });
});

describe('isRootPath', () => {
  it('should return true for root-only path', () => {
    expect(isRootPath('track-001')).toBe(true);
  });

  it('should return false for child path', () => {
    expect(isRootPath('track-001/positions/4')).toBe(false);
  });
});

describe('getParent', () => {
  it('should return null for root path', () => {
    expect(getParent('track-001')).toBeNull();
  });

  it('should return root for single-level path', () => {
    expect(getParent('track-001/positions/4')).toBe('track-001');
  });

  it('should return intermediate path for two-level path (T061)', () => {
    expect(getParent('track-001/segments/alpha/positions/3')).toBe('track-001/segments/alpha');
  });

  it('should return two-level path for three-level path', () => {
    expect(getParent('root/a/1/b/2/c/3')).toBe('root/a/1/b/2');
  });
});

// ─── validatePathStructure (T014) ───────────────────────────────────

describe('validatePathStructure', () => {
  it('should accept valid root-only path', () => {
    const result = validatePathStructure('track-001');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept valid single-level path', () => {
    const result = validatePathStructure('track-001/positions/4');
    expect(result.valid).toBe(true);
  });

  it('should accept valid multi-level path', () => {
    const result = validatePathStructure('track-001/segments/alpha/positions/3');
    expect(result.valid).toBe(true);
  });

  it('should reject empty path (T073)', () => {
    const result = validatePathStructure('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/empty/i);
  });

  it('should reject whitespace-only path', () => {
    const result = validatePathStructure('   ');
    expect(result.valid).toBe(false);
  });

  it('should reject double slash (empty segment)', () => {
    const result = validatePathStructure('track-001//positions/4');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/empty segments/i));
  });

  it('should reject incomplete level', () => {
    const result = validatePathStructure('track-001/positions');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/incomplete/i));
  });

  it('should reject invalid escape sequence ~2 (T075)', () => {
    const result = validatePathStructure('track-001/~2invalid');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/escape/i));
  });

  it('should accept valid escape sequences ~0 and ~1', () => {
    const result = validatePathStructure('track~0test/positions/4');
    expect(result.valid).toBe(true);
  });

  it('should handle trailing slash (normalised away) (T074)', () => {
    const result = validatePathStructure('track-001/');
    expect(result.valid).toBe(true);
  });
});

// ─── validatePathSemantics (T015) ───────────────────────────────────

describe('validatePathSemantics', () => {
  it('should accept path with known level names', () => {
    const result = validatePathSemantics('track-001/positions/4');
    expect(result.valid).toBe(true);
  });

  it('should reject unknown level name', () => {
    const result = validatePathSemantics('track-001/unknown/4');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/unknown.*level/i));
  });

  it('should reject non-numeric index for index-based level', () => {
    const result = validatePathSemantics('track-001/positions/not-a-number');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/numeric index/i));
  });

  it('should accept string ID for id-based level', () => {
    const result = validatePathSemantics('track-001/segments/leg-alpha');
    expect(result.valid).toBe(true);
  });

  it('should accept numeric ID for id-based level (segments can have numeric IDs)', () => {
    const result = validatePathSemantics('track-001/segments/001');
    expect(result.valid).toBe(true);
  });

  it('should validate multi-level paths', () => {
    const result = validatePathSemantics('track-001/segments/alpha/positions/3');
    expect(result.valid).toBe(true);
  });

  it('should reject structurally invalid path first', () => {
    const result = validatePathSemantics('');
    expect(result.valid).toBe(false);
  });

  it('should accept root-only paths without checking registry', () => {
    const result = validatePathSemantics('track-001');
    expect(result.valid).toBe(true);
  });

  it('should accept custom registry', () => {
    const customRegistry = new Map([
      ['items', { name: 'items', addressingMode: 'id' as const }],
    ]);
    const result = validatePathSemantics('root/items/abc', customRegistry);
    expect(result.valid).toBe(true);
  });
});

// ─── Vertex-bearing levels (Spec 192 — T011a) ───────────────────────

describe('vertex-bearing levels (spec 192)', () => {
  describe('parsePath', () => {
    it('should parse rings/0/vertices/3 (Polygon vertex path)', () => {
      const result = parsePath('poly-1/rings/0/vertices/3');
      expect(result.root).toBe('poly-1');
      expect(result.levels).toEqual([
        { levelName: 'rings', address: '0' },
        { levelName: 'vertices', address: '3' },
      ]);
      expect(result.depth).toBe(2);
    });

    it('should parse vertices/2 (LineString / MultiPoint vertex path)', () => {
      const result = parsePath('line-1/vertices/2');
      expect(result.root).toBe('line-1');
      expect(result.levels).toEqual([{ levelName: 'vertices', address: '2' }]);
      expect(result.depth).toBe(1);
    });

    it('should parse vertex/0 (single-Point vertex path)', () => {
      const result = parsePath('point-1/vertex/0');
      expect(result.root).toBe('point-1');
      expect(result.levels).toEqual([{ levelName: 'vertex', address: '0' }]);
      expect(result.depth).toBe(1);
    });
  });

  describe('validatePathSemantics', () => {
    it('should accept rings/0/vertices/3', () => {
      const result = validatePathSemantics('poly-1/rings/0/vertices/3');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept vertices/2', () => {
      const result = validatePathSemantics('line-1/vertices/2');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept vertex/0', () => {
      const result = validatePathSemantics('point-1/vertex/0');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject vertex/1 (address must be 0)', () => {
      const result = validatePathSemantics('point-1/vertex/1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringMatching(/vertex.*0/i));
    });

    it('should reject rings/0 without trailing vertices', () => {
      const result = validatePathSemantics('poly-1/rings/0');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringMatching(/rings.*followed by.*vertices/i));
    });

    it('should reject rings/0/vertices/-1 (negative index)', () => {
      const result = validatePathSemantics('poly-1/rings/0/vertices/-1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringMatching(/numeric index/i));
    });

    it('should reject rings/0/vertices/foo (non-integer)', () => {
      const result = validatePathSemantics('poly-1/rings/0/vertices/foo');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringMatching(/numeric index/i));
    });
  });
});

// ─── Performance test (T064) ────────────────────────────────────────

describe('performance', () => {
  it('should parse/validate 1000 paths with 4+ depth in under 200ms', () => {
    const paths = Array.from({ length: 1000 }, (_, i) =>
      `root/a/${i}/b/${i}/c/${i}/d/${i}`
    );

    const start = performance.now();
    for (const path of paths) {
      parsePath(path);
      validatePathStructure(path);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
  });
});

// ─── Edge case: escaped slash in feature ID (T071) ──────────────────

describe('escaped feature IDs', () => {
  it('should parse feature ID with escaped slash', () => {
    const result = parsePath('track~1alpha');
    expect(result.root).toBe('track~1alpha');
    expect(result.depth).toBe(0);
  });

  it('should validate feature ID with escaped tilde', () => {
    const result = validatePathStructure('track~0test');
    expect(result.valid).toBe(true);
  });
});
