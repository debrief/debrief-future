/**
 * Unit tests for MCP adapter.
 */

import { describe, it, expect } from 'vitest';
import { fromMCPTool, fromMCPTools, type MCPToolDefinition } from '../mcpAdapter';

describe('mcpAdapter', () => {
  const sampleMCPTool: MCPToolDefinition = {
    name: 'set-track-color',
    description: 'Set display color for track features',
    inputSchema: {
      type: 'object' as const,
      properties: {
        features: { type: 'array', items: { type: 'object' } },
        params: { type: 'object', properties: { color: { type: 'string' } } },
      },
    },
    annotations: {
      'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
      'debrief:category': 'track/styling',
      'debrief:version': '1.0.0',
      'debrief:outputKind': 'mutation/track/styled',
    },
  };

  describe('fromMCPTool', () => {
    it('converts name to id', () => {
      const tool = fromMCPTool(sampleMCPTool);
      expect(tool.id).toBe('set-track-color');
    });

    it('formats name from kebab-case to title case', () => {
      const tool = fromMCPTool(sampleMCPTool);
      expect(tool.name).toBe('Set Track Color');
    });

    it('preserves description', () => {
      const tool = fromMCPTool(sampleMCPTool);
      expect(tool.description).toBe('Set display color for track features');
    });

    it('extracts version from annotations', () => {
      const tool = fromMCPTool(sampleMCPTool);
      expect(tool.version).toBe('1.0.0');
    });

    it('maps selection requirements correctly', () => {
      const tool = fromMCPTool(sampleMCPTool);
      expect(tool.requirements).toEqual([{ kind: 'TRACK', min: 1 }]);
    });

    it('maps selection requirements with max', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        name: 'range-bearing',
        annotations: {
          ...sampleMCPTool.annotations,
          'debrief:selectionRequirements': [{ kind: 'TRACK', min: 2, max: 2 }],
        },
      };
      const tool = fromMCPTool(mcpTool);
      expect(tool.requirements).toEqual([{ kind: 'TRACK', min: 2, max: 2 }]);
    });

    it('handles empty selection requirements', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        name: 'global-stats',
        annotations: {
          ...sampleMCPTool.annotations,
          'debrief:selectionRequirements': [],
        },
      };
      const tool = fromMCPTool(mcpTool);
      expect(tool.requirements).toEqual([]);
    });

    it('handles multiple requirements', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        name: 'bearing-to-point',
        annotations: {
          ...sampleMCPTool.annotations,
          'debrief:selectionRequirements': [
            { kind: 'TRACK', min: 1, max: 1 },
            { kind: 'POINT', min: 1, max: 1 },
          ],
        },
      };
      const tool = fromMCPTool(mcpTool);
      expect(tool.requirements).toHaveLength(2);
      expect(tool.requirements).toEqual([
        { kind: 'TRACK', min: 1, max: 1 },
        { kind: 'POINT', min: 1, max: 1 },
      ]);
    });
  });

  describe('fromMCPTools', () => {
    it('converts an array of MCP tools', () => {
      const tools = fromMCPTools([sampleMCPTool, { ...sampleMCPTool, name: 'label-interval' }]);
      expect(tools).toHaveLength(2);
      expect(tools[0].id).toBe('set-track-color');
      expect(tools[1].id).toBe('label-interval');
    });

    it('returns empty array for empty input', () => {
      const tools = fromMCPTools([]);
      expect(tools).toEqual([]);
    });
  });
});
