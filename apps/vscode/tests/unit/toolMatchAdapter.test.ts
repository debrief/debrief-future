/**
 * Unit tests for ToolMatchAdapter
 *
 * Tests the bridge between session-state selection and ToolMatchService.
 * Feature: 038-context-tool-vscode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolMatchAdapter } from '../../src/services/toolMatchAdapter';
import type { Tool } from '../../src/types/tool';

// Mock FeatureSelection type (avoids importing from @debrief/session-state which pulls in leaflet)
interface FeatureSelection {
  featureIds: string[];
  primary: string | null;
  timestamp: { epoch: number; iso: string };
}

// Mock tools for testing
const mockTools: Tool[] = [
  {
    id: 'range-bearing',
    name: 'Range & Bearing',
    description: 'Calculate distance and bearing between two tracks',
    version: '1.0.0',
    requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
  },
  {
    id: 'track-stats',
    name: 'Track Statistics',
    description: 'Calculate statistics for a single track',
    version: '1.0.0',
    requirements: [{ kind: 'TRACK', min: 1, max: 1 }],
  },
  {
    id: 'distance-to-point',
    name: 'Distance to Point',
    description: 'Calculate distance from track to point',
    version: '1.0.0',
    requirements: [
      { kind: 'TRACK', min: 1, max: 1 },
      { kind: 'POINT', min: 1, max: 1 },
    ],
  },
  {
    id: 'universal-info',
    name: 'Feature Information',
    description: 'Display info about any selected feature',
    version: '1.0.0',
    requirements: [],
  },
];

// Mock feature data for kind lookup
const mockFeatureData = new Map<string, string>([
  ['track-hms-defender', 'TRACK'],
  ['track-uss-freedom', 'TRACK'],
  ['loc-alpha-point', 'POINT'],
  ['loc-bravo-datum', 'POINT'],
  ['circle-exclusion-zone', 'CIRCLE'],
  ['rect-exercise-area', 'RECTANGLE'],
  ['line-boundary', 'LINE'],
  ['vector-wind', 'VECTOR'],
]);

describe('ToolMatchAdapter', () => {
  let adapter: ToolMatchAdapter;

  beforeEach(() => {
    adapter = new ToolMatchAdapter(mockTools, (id) => mockFeatureData.get(id));
  });

  describe('constructor', () => {
    it('should initialize with tools sorted alphabetically', () => {
      const allTools = adapter.getAllTools();
      expect(allTools).toHaveLength(4);
      expect(allTools[0].name).toBe('Distance to Point');
      expect(allTools[1].name).toBe('Feature Information');
      expect(allTools[2].name).toBe('Range & Bearing');
      expect(allTools[3].name).toBe('Track Statistics');
    });
  });

  describe('updateSelection', () => {
    it('should convert feature IDs to selection map with kind counts', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender', 'track-uss-freedom'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const activeTools = adapter.getActiveTools();
      // With 2 tracks: Range & Bearing and Universal should be active
      const activeIds = activeTools.map((t) => t.id);
      expect(activeIds).toContain('range-bearing');
      expect(activeIds).toContain('universal-info');
      expect(activeIds).not.toContain('track-stats'); // Needs exactly 1
    });

    it('should handle single track selection', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const activeTools = adapter.getActiveTools();
      const activeIds = activeTools.map((t) => t.id);
      expect(activeIds).toContain('track-stats');
      expect(activeIds).toContain('universal-info');
      expect(activeIds).not.toContain('range-bearing'); // Needs exactly 2
    });

    it('should handle mixed selection (track + point)', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender', 'loc-alpha-point'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const activeTools = adapter.getActiveTools();
      const activeIds = activeTools.map((t) => t.id);
      expect(activeIds).toContain('distance-to-point');
      expect(activeIds).toContain('universal-info');
    });

    it('should handle empty selection', () => {
      const selection: FeatureSelection = {
        featureIds: [],
        primary: null,
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const activeTools = adapter.getActiveTools();
      // Only universal (no requirements) should be active
      expect(activeTools).toHaveLength(1);
      expect(activeTools[0].id).toBe('universal-info');
    });
  });

  describe('getActiveTools', () => {
    it('should return empty array when no tools match', () => {
      const selection: FeatureSelection = {
        featureIds: ['loc-alpha-point', 'loc-bravo-datum', 'circle-exclusion-zone'],
        primary: null,
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const activeTools = adapter.getActiveTools();
      // Only universal should match (2 points + 1 circle doesn't match specific tools)
      expect(activeTools).toHaveLength(1);
      expect(activeTools[0].id).toBe('universal-info');
    });
  });

  describe('getMatchResults', () => {
    it('should return all tools with active/inactive status', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const results = adapter.getMatchResults();
      expect(results).toHaveLength(4);

      const trackStats = results.find((r) => r.tool.id === 'track-stats');
      expect(trackStats?.isActive).toBe(true);

      const rangeBearing = results.find((r) => r.tool.id === 'range-bearing');
      expect(rangeBearing?.isActive).toBe(false);
      expect(rangeBearing?.explanation).toContain('TRACK');
    });

    it('should provide explanations for inactive tools', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      const results = adapter.getMatchResults();
      const rangeBearing = results.find((r) => r.tool.id === 'range-bearing');

      expect(rangeBearing?.isActive).toBe(false);
      // Should mention needing 2 tracks but having 1
      expect(rangeBearing?.explanation).toBeTruthy();
    });
  });

  describe('clearSelection', () => {
    it('should clear selection and recompute matches', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender', 'track-uss-freedom'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);
      expect(adapter.getActiveTools().length).toBeGreaterThan(1);

      adapter.clearSelection();

      const activeTools = adapter.getActiveTools();
      // Only universal (no requirements) should be active after clear
      expect(activeTools).toHaveLength(1);
    });
  });

  describe('updateTools', () => {
    it('should update tool inventory and recompute matches', () => {
      const selection: FeatureSelection = {
        featureIds: ['track-hms-defender'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      };

      adapter.updateSelection(selection);

      // Add a new tool
      const newTools: Tool[] = [
        ...mockTools,
        {
          id: 'new-track-tool',
          name: 'New Track Tool',
          description: 'A new tool for single tracks',
          version: '1.0.0',
          requirements: [{ kind: 'TRACK', min: 1 }],
        },
      ];

      adapter.updateTools(newTools);

      const activeTools = adapter.getActiveTools();
      const activeIds = activeTools.map((t) => t.id);
      expect(activeIds).toContain('new-track-tool');
    });
  });

  describe('hasSelection', () => {
    it('should return true when features are selected', () => {
      adapter.updateSelection({
        featureIds: ['track-hms-defender'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      });

      expect(adapter.hasSelection()).toBe(true);
    });

    it('should return false when no features are selected', () => {
      adapter.clearSelection();
      expect(adapter.hasSelection()).toBe(false);
    });
  });

  describe('getSelectionSummary', () => {
    it('should return counts by feature kind', () => {
      adapter.updateSelection({
        featureIds: ['track-hms-defender', 'track-uss-freedom', 'loc-alpha-point'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      });

      const summary = adapter.getSelectionSummary();
      expect(summary.get('TRACK')).toBe(2);
      expect(summary.get('POINT')).toBe(1);
    });
  });

  describe('feature kind lookup fallback', () => {
    it('should handle unknown feature IDs gracefully', () => {
      const adapterWithMissing = new ToolMatchAdapter(mockTools, (id) => {
        if (id === 'unknown-feature') return undefined;
        return mockFeatureData.get(id);
      });

      adapterWithMissing.updateSelection({
        featureIds: ['track-hms-defender', 'unknown-feature'],
        primary: 'track-hms-defender',
        timestamp: { epoch: Date.now(), iso: new Date().toISOString() },
      });

      // Should still work with the known feature
      const activeTools = adapterWithMissing.getActiveTools();
      expect(activeTools.length).toBeGreaterThan(0);
    });
  });
});
