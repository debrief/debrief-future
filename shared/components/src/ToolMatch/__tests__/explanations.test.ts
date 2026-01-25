/**
 * Unit tests for explanation generator.
 */

import { describe, it, expect } from 'vitest';
import { getInactiveReason, getAllInactiveReasons } from '../explanations';
import { createSelectionFromCounts } from '../types';
import type { Tool } from '@debrief/schemas';

describe('getInactiveReason', () => {
  describe('under-selection', () => {
    it('should explain when needs 2 but has 1', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      };
      const selection = createSelectionFromCounts({ TRACK: 1 });

      expect(getInactiveReason(tool, selection)).toBe(
        'Requires exactly 2 tracks (1 selected)'
      );
    });

    it('should explain when needs 2 but has 0', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      };
      const selection = createSelectionFromCounts({});

      expect(getInactiveReason(tool, selection)).toBe(
        'Requires exactly 2 tracks (0 selected)'
      );
    });

    it('should explain when needs at least 1 but has 0', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 1 }],
      };
      const selection = createSelectionFromCounts({});

      expect(getInactiveReason(tool, selection)).toBe(
        'Requires at least 1 track'
      );
    });

    it('should explain when needs at least N but has fewer (non-exact)', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 3 }],
      };
      const selection = createSelectionFromCounts({ TRACK: 1 });

      expect(getInactiveReason(tool, selection)).toBe(
        'Requires at least 3 tracks (1 selected)'
      );
    });
  });

  describe('over-selection', () => {
    it('should explain when max is exceeded', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 1, max: 2 }],
      };
      const selection = createSelectionFromCounts({ TRACK: 3 });

      expect(getInactiveReason(tool, selection)).toBe(
        'Maximum 2 tracks allowed (3 selected)'
      );
    });

    it('should explain when exact count exceeded', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      };
      const selection = createSelectionFromCounts({ TRACK: 3 });

      expect(getInactiveReason(tool, selection)).toBe(
        'Requires exactly 2 tracks (3 selected)'
      );
    });

    it('should explain when kind not accepted (max: 0)', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'NARRATIVE', max: 0 }],
      };
      const selection = createSelectionFromCounts({ NARRATIVE: 2 });

      expect(getInactiveReason(tool, selection)).toBe(
        'Does not accept narrative features (2 in selection)'
      );
    });
  });

  describe('multiple requirements', () => {
    it('should return first unmet requirement', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [
          { kind: 'TRACK', min: 1, max: 1 },
          { kind: 'POINT', min: 1, max: 1 },
        ],
      };
      const selection = createSelectionFromCounts({ TRACK: 1 });

      expect(getInactiveReason(tool, selection)).toBe(
        'Requires at least 1 point'
      );
    });
  });

  describe('active tools', () => {
    it('should return empty string for active tool', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      };
      const selection = createSelectionFromCounts({ TRACK: 2 });

      expect(getInactiveReason(tool, selection)).toBe('');
    });

    it('should return empty string for tool with no requirements', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [],
      };
      const selection = createSelectionFromCounts({ TRACK: 5 });

      expect(getInactiveReason(tool, selection)).toBe('');
    });

    it('should return empty string for tool with undefined requirements', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
      };
      const selection = createSelectionFromCounts({ TRACK: 5 });

      expect(getInactiveReason(tool, selection)).toBe('');
    });
  });

  describe('kind formatting', () => {
    it('should format TRACK as track', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'TRACK', min: 1 }],
      };
      const selection = createSelectionFromCounts({});

      expect(getInactiveReason(tool, selection)).toContain('track');
    });

    it('should format REFERENCE_LOCATION as reference location', () => {
      const tool: Tool = {
        id: 'test',
        name: 'Test',
        requirements: [{ kind: 'REFERENCE_LOCATION', min: 1 }],
      };
      const selection = createSelectionFromCounts({});

      expect(getInactiveReason(tool, selection)).toContain('reference location');
    });
  });
});

describe('getAllInactiveReasons', () => {
  it('should return all reasons for multiple failures', () => {
    const tool: Tool = {
      id: 'test',
      name: 'Test',
      requirements: [
        { kind: 'TRACK', min: 1, max: 1 },
        { kind: 'POINT', min: 1, max: 1 },
      ],
    };
    const selection = createSelectionFromCounts({ TRACK: 3 });

    const reasons = getAllInactiveReasons(tool, selection);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toContain('track');
    expect(reasons[1]).toContain('point');
  });

  it('should return empty array for active tool', () => {
    const tool: Tool = {
      id: 'test',
      name: 'Test',
      requirements: [{ kind: 'TRACK', min: 2 }],
    };
    const selection = createSelectionFromCounts({ TRACK: 3 });

    expect(getAllInactiveReasons(tool, selection)).toEqual([]);
  });

  it('should return empty array for tool with no requirements', () => {
    const tool: Tool = {
      id: 'test',
      name: 'Test',
      requirements: [],
    };
    const selection = createSelectionFromCounts({});

    expect(getAllInactiveReasons(tool, selection)).toEqual([]);
  });
});
