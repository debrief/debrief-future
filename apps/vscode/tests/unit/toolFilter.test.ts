import { describe, it, expect } from 'vitest';
import type { AnalysisTool } from '../../src/types/tool';
import type { SelectionContextType, FeatureKind } from '../../src/types/plot';

describe('Tool filtering', () => {
  const mockTools: AnalysisTool[] = [
    {
      name: 'range-bearing',
      displayName: 'Range & Bearing',
      description: 'Calculate range and bearing between tracks',
      contextType: 'multi-track',
      inputKinds: ['track'],
      inputSchema: {},
    },
    {
      name: 'closest-approach',
      displayName: 'Closest Point of Approach',
      description: 'Find closest point between two tracks',
      contextType: 'multi-track',
      inputKinds: ['track'],
      inputSchema: {},
    },
    {
      name: 'track-stats',
      displayName: 'Track Statistics',
      description: 'Calculate statistics for a single track',
      contextType: 'single-track',
      inputKinds: ['track'],
      inputSchema: {},
    },
    {
      name: 'distance-to-point',
      displayName: 'Distance to Point',
      description: 'Calculate distance from track to location',
      contextType: 'mixed',
      inputKinds: ['track', 'location'],
      inputSchema: {},
    },
    {
      name: 'universal-tool',
      displayName: 'Universal Tool',
      description: 'Works with any selection',
      contextType: 'any',
      inputKinds: ['track', 'location'],
      inputSchema: {},
    },
  ];

  const filterTools = (
    tools: AnalysisTool[],
    contextType: SelectionContextType,
    featureKinds: FeatureKind[]
  ): AnalysisTool[] => {
    return tools.filter((tool) => {
      // Check context type
      if (tool.contextType !== 'any' && tool.contextType !== contextType) {
        return false;
      }

      // Check feature kinds
      if (tool.inputKinds.length > 0) {
        const hasRequiredKind = tool.inputKinds.some((kind) =>
          featureKinds.includes(kind)
        );
        if (!hasRequiredKind) {
          return false;
        }
      }

      return true;
    });
  };

  describe('context type filtering', () => {
    it('returns tools matching single-track context', () => {
      const filtered = filterTools(mockTools, 'single-track', ['track']);

      expect(filtered.map((t) => t.name)).toContain('track-stats');
      expect(filtered.map((t) => t.name)).toContain('universal-tool');
      expect(filtered.map((t) => t.name)).not.toContain('range-bearing');
    });

    it('returns tools matching multi-track context', () => {
      const filtered = filterTools(mockTools, 'multi-track', ['track']);

      expect(filtered.map((t) => t.name)).toContain('range-bearing');
      expect(filtered.map((t) => t.name)).toContain('closest-approach');
      expect(filtered.map((t) => t.name)).toContain('universal-tool');
      expect(filtered.map((t) => t.name)).not.toContain('track-stats');
    });

    it('returns tools matching mixed context', () => {
      const filtered = filterTools(mockTools, 'mixed', ['track', 'location']);

      expect(filtered.map((t) => t.name)).toContain('distance-to-point');
      expect(filtered.map((t) => t.name)).toContain('universal-tool');
    });

    it('returns empty for none context', () => {
      const filtered = filterTools(mockTools, 'none', []);

      // Universal tool wouldn't have matching feature kinds
      expect(filtered).toHaveLength(0);
    });
  });

  describe('feature kind filtering', () => {
    it('filters by required input kinds', () => {
      const locationOnlyTools = mockTools.filter((t) =>
        t.inputKinds.includes('location')
      );

      expect(locationOnlyTools.map((t) => t.name)).toContain(
        'distance-to-point'
      );
      expect(locationOnlyTools.map((t) => t.name)).toContain('universal-tool');
      expect(locationOnlyTools.map((t) => t.name)).not.toContain(
        'range-bearing'
      );
    });
  });

  describe('any context type', () => {
    it('universal tools appear in all valid contexts', () => {
      const singleTrack = filterTools(mockTools, 'single-track', ['track']);
      const multiTrack = filterTools(mockTools, 'multi-track', ['track']);
      const location = filterTools(mockTools, 'location', ['location']);

      expect(singleTrack.map((t) => t.name)).toContain('universal-tool');
      expect(multiTrack.map((t) => t.name)).toContain('universal-tool');
      expect(location.map((t) => t.name)).toContain('universal-tool');
    });
  });
});
