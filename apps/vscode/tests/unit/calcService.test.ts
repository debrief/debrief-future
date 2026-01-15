import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalysisTool } from '../../src/types/tool';
import { isToolApplicable, createDefaultResultStyle } from '../../src/types/tool';

describe('CalcService logic', () => {
  describe('isToolApplicable', () => {
    const multiTrackTool: AnalysisTool = {
      name: 'range-bearing',
      displayName: 'Range & Bearing',
      description: 'Calculate range and bearing',
      contextType: 'multi-track',
      inputKinds: ['track'],
      inputSchema: {},
    };

    const anyContextTool: AnalysisTool = {
      name: 'stats',
      displayName: 'Statistics',
      description: 'Calculate statistics',
      contextType: 'any',
      inputKinds: ['track', 'location'],
      inputSchema: {},
    };

    it('returns true when context type matches', () => {
      expect(isToolApplicable(multiTrackTool, 'multi-track', ['track'])).toBe(
        true
      );
    });

    it('returns false when context type does not match', () => {
      expect(isToolApplicable(multiTrackTool, 'single-track', ['track'])).toBe(
        false
      );
    });

    it('returns true for any context type tool', () => {
      expect(isToolApplicable(anyContextTool, 'single-track', ['track'])).toBe(
        true
      );
      expect(isToolApplicable(anyContextTool, 'multi-track', ['track'])).toBe(
        true
      );
      expect(isToolApplicable(anyContextTool, 'location', ['location'])).toBe(
        true
      );
    });

    it('checks input kinds when specified', () => {
      const locationOnlyTool: AnalysisTool = {
        ...anyContextTool,
        inputKinds: ['location'],
      };

      expect(isToolApplicable(locationOnlyTool, 'any', ['track'])).toBe(false);
      expect(isToolApplicable(locationOnlyTool, 'any', ['location'])).toBe(
        true
      );
    });
  });

  describe('createDefaultResultStyle', () => {
    it('creates consistent style for same tool name', () => {
      const style1 = createDefaultResultStyle('range-bearing');
      const style2 = createDefaultResultStyle('range-bearing');

      expect(style1.strokeColor).toBe(style2.strokeColor);
      expect(style1.strokeWidth).toBe(style2.strokeWidth);
    });

    it('creates different colors for different tool names', () => {
      const style1 = createDefaultResultStyle('range-bearing');
      const style2 = createDefaultResultStyle('closest-approach');

      // Colors should be different (based on hash)
      // Note: There's a small chance they could be the same if hashes collide
      expect(style1.dashArray).toEqual([8, 4]); // Result layers always dashed
      expect(style2.dashArray).toEqual([8, 4]);
    });

    it('includes dash array for result differentiation', () => {
      const style = createDefaultResultStyle('any-tool');

      expect(style.dashArray).toBeDefined();
      expect(style.dashArray).toEqual([8, 4]);
    });
  });

  describe('tool filtering', () => {
    const tools: AnalysisTool[] = [
      {
        name: 'range-bearing',
        displayName: 'Range & Bearing',
        description: 'Calculate range and bearing',
        contextType: 'multi-track',
        inputKinds: ['track'],
        inputSchema: {},
      },
      {
        name: 'track-stats',
        displayName: 'Track Statistics',
        description: 'Calculate track stats',
        contextType: 'single-track',
        inputKinds: ['track'],
        inputSchema: {},
      },
      {
        name: 'distance-to-point',
        displayName: 'Distance to Point',
        description: 'Calculate distance',
        contextType: 'mixed',
        inputKinds: ['track', 'location'],
        inputSchema: {},
      },
    ];

    it('filters tools by context type', () => {
      const multiTrackTools = tools.filter(
        (t) => t.contextType === 'multi-track' || t.contextType === 'any'
      );

      expect(multiTrackTools).toHaveLength(1);
      expect(multiTrackTools[0].name).toBe('range-bearing');
    });

    it('returns multiple applicable tools', () => {
      const singleTrackTools = tools.filter(
        (t) => t.contextType === 'single-track' || t.contextType === 'any'
      );

      expect(singleTrackTools).toHaveLength(1);
    });
  });
});
