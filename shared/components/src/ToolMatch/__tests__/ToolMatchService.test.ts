/**
 * Unit tests for ToolMatchService.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolMatchService } from '../ToolMatchService';
import { createSelectionFromCounts } from '../types';
import type { Tool } from '@debrief/schemas';

describe('ToolMatchService', () => {
  // Test fixtures
  const rangeCalculation: Tool = {
    id: 'range-calculation',
    name: 'Range Calculation',
    description: 'Calculate range between two tracks',
    requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
  };

  const trackSummary: Tool = {
    id: 'track-summary',
    name: 'Track Summary',
    description: 'Summarize one or more tracks',
    requirements: [{ kind: 'TRACK', min: 1 }],
  };

  const bearingToPoint: Tool = {
    id: 'bearing-to-point',
    name: 'Bearing to Point',
    description: 'Calculate bearing from track to point',
    requirements: [
      { kind: 'TRACK', min: 1, max: 1 },
      { kind: 'POINT', min: 1, max: 1 },
    ],
  };

  const globalStats: Tool = {
    id: 'global-stats',
    name: 'Global Statistics',
    description: 'Show global statistics',
    requirements: [],
  };

  const noRequirements: Tool = {
    id: 'no-requirements',
    name: 'No Requirements Tool',
    // requirements not specified
  };

  const maxOnlyTool: Tool = {
    id: 'max-only',
    name: 'Max Only Tool',
    requirements: [{ kind: 'TRACK', max: 1 }],
  };

  let service: ToolMatchService;

  beforeEach(() => {
    service = new ToolMatchService([
      rangeCalculation,
      trackSummary,
      bearingToPoint,
      globalStats,
      noRequirements,
      maxOnlyTool,
    ]);
  });

  describe('isToolActive', () => {
    it('should return true for tool with exact requirement when selection matches', () => {
      const selection = createSelectionFromCounts({ TRACK: 2 });
      expect(service.isToolActive(rangeCalculation, selection)).toBe(true);
    });

    it('should return false for tool with exact requirement when under-selected', () => {
      const selection = createSelectionFromCounts({ TRACK: 1 });
      expect(service.isToolActive(rangeCalculation, selection)).toBe(false);
    });

    it('should return false for tool with exact requirement when over-selected', () => {
      const selection = createSelectionFromCounts({ TRACK: 3 });
      expect(service.isToolActive(rangeCalculation, selection)).toBe(false);
    });

    it('should return true for tool with min-only requirement when count exceeds min', () => {
      const selection = createSelectionFromCounts({ TRACK: 5 });
      expect(service.isToolActive(trackSummary, selection)).toBe(true);
    });

    it('should return false for tool with min-only requirement when count is below min', () => {
      const selection = createSelectionFromCounts({ TRACK: 0 });
      expect(service.isToolActive(trackSummary, selection)).toBe(false);
    });

    it('should return true for tool with multiple requirements when all satisfied', () => {
      const selection = createSelectionFromCounts({ TRACK: 1, POINT: 1 });
      expect(service.isToolActive(bearingToPoint, selection)).toBe(true);
    });

    it('should return false for tool with multiple requirements when one is not satisfied', () => {
      const selection = createSelectionFromCounts({ TRACK: 1 });
      expect(service.isToolActive(bearingToPoint, selection)).toBe(false);
    });

    it('should return true for tool with no requirements (empty array)', () => {
      const selection = createSelectionFromCounts({ TRACK: 5, POINT: 3 });
      expect(service.isToolActive(globalStats, selection)).toBe(true);
    });

    it('should return true for tool with no requirements (undefined)', () => {
      const selection = createSelectionFromCounts({ TRACK: 5, POINT: 3 });
      expect(service.isToolActive(noRequirements, selection)).toBe(true);
    });

    it('should return true for tool with no requirements when selection is empty', () => {
      const selection = createSelectionFromCounts({});
      expect(service.isToolActive(globalStats, selection)).toBe(true);
    });

    it('should ignore extra kinds in selection not mentioned in requirements', () => {
      const selection = createSelectionFromCounts({ TRACK: 2, NARRATIVE: 5 });
      expect(service.isToolActive(rangeCalculation, selection)).toBe(true);
    });

    it('should respect max-only requirements', () => {
      const selection = createSelectionFromCounts({ TRACK: 1 });
      expect(service.isToolActive(maxOnlyTool, selection)).toBe(true);

      const overSelection = createSelectionFromCounts({ TRACK: 2 });
      expect(service.isToolActive(maxOnlyTool, overSelection)).toBe(false);
    });

    it('should return true for max-only tool with empty selection', () => {
      const selection = createSelectionFromCounts({});
      expect(service.isToolActive(maxOnlyTool, selection)).toBe(true);
    });
  });

  describe('getActiveTools', () => {
    it('should return only active tools', () => {
      const selection = createSelectionFromCounts({ TRACK: 2 });
      const active = service.getActiveTools(selection);
      const activeIds = active.map((t) => t.id);

      expect(activeIds).toContain('range-calculation');
      expect(activeIds).toContain('track-summary');
      expect(activeIds).toContain('global-stats');
      expect(activeIds).toContain('no-requirements');
      expect(activeIds).not.toContain('bearing-to-point'); // needs POINT
    });

    it('should return tools sorted alphabetically by name', () => {
      const selection = createSelectionFromCounts({});
      const active = service.getActiveTools(selection);
      const names = active.map((t) => t.name);

      // Should be sorted
      expect(names).toEqual([...names].sort());
    });

    it('should return only no-requirement tools for empty selection', () => {
      const selection = createSelectionFromCounts({});
      const active = service.getActiveTools(selection);
      const activeIds = active.map((t) => t.id);

      expect(activeIds).toContain('global-stats');
      expect(activeIds).toContain('no-requirements');
      expect(activeIds).toContain('max-only'); // max-only with 0 is satisfied
      expect(activeIds).not.toContain('range-calculation');
      expect(activeIds).not.toContain('track-summary');
    });
  });

  describe('getInactiveTools', () => {
    it('should return only inactive tools', () => {
      const selection = createSelectionFromCounts({ TRACK: 2 });
      const inactive = service.getInactiveTools(selection);
      const inactiveIds = inactive.map((t) => t.id);

      expect(inactiveIds).toContain('bearing-to-point'); // needs POINT
      expect(inactiveIds).toContain('max-only'); // max is 1
      expect(inactiveIds).not.toContain('range-calculation');
    });
  });

  describe('getMatchResults', () => {
    it('should return results for all tools', () => {
      const selection = createSelectionFromCounts({ TRACK: 2 });
      const results = service.getMatchResults(selection);

      expect(results).toHaveLength(6);
    });

    it('should include explanation for inactive tools', () => {
      const selection = createSelectionFromCounts({ TRACK: 1 });
      const results = service.getMatchResults(selection);

      const rangeResult = results.find((r) => r.tool.id === 'range-calculation');
      expect(rangeResult?.isActive).toBe(false);
      expect(rangeResult?.explanation).toBeTruthy();
    });

    it('should have empty explanation for active tools', () => {
      const selection = createSelectionFromCounts({ TRACK: 2 });
      const results = service.getMatchResults(selection);

      const rangeResult = results.find((r) => r.tool.id === 'range-calculation');
      expect(rangeResult?.isActive).toBe(true);
      expect(rangeResult?.explanation).toBe('');
    });
  });

  describe('getAllTools', () => {
    it('should return all tools', () => {
      const all = service.getAllTools();
      expect(all).toHaveLength(6);
    });

    it('should return tools sorted alphabetically', () => {
      const all = service.getAllTools();
      const names = all.map((t) => t.name);
      expect(names).toEqual([...names].sort());
    });
  });
});
