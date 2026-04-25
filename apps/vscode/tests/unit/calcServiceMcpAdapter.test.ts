/**
 * CalcService MCP Adapter Tests - Verifies CalcService.listTools() returns
 * Tool[] adapted from MCP tool definitions.
 *
 * Feature: 052-tool-api-integration (US2 Tool Filtering, T015)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tool, MCPToolDefinition } from '../../src/types/tool';
import { adaptMCPToolsForMatching } from '../../src/services/mcpToolAdapter';

// Sample MCP tools/list response (simulates what the MCP server returns)
const mockMCPToolsListResponse: MCPToolDefinition[] = [
  {
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
  },
  {
    name: 'range-bearing',
    description: 'Calculate range and bearing between two tracks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        features: { type: 'array', items: { type: 'object' } },
      },
    },
    annotations: {
      'debrief:selectionRequirements': [{ kind: 'TRACK', min: 2, max: 2 }],
      'debrief:category': 'track/analysis',
      'debrief:version': '2.1.0',
      'debrief:outputKind': 'addition/range-bearing',
    },
  },
  {
    name: 'bearing-to-point',
    description: 'Calculate bearing from track to point',
    inputSchema: {
      type: 'object' as const,
      properties: {
        features: { type: 'array', items: { type: 'object' } },
      },
    },
    annotations: {
      'debrief:selectionRequirements': [
        { kind: 'TRACK', min: 1, max: 1 },
        { kind: 'POINT', min: 1, max: 1 },
      ],
      'debrief:category': 'track/analysis',
      'debrief:version': '1.0.0',
      'debrief:outputKind': 'addition/bearing',
    },
  },
];

describe('CalcService MCP adapter integration (T015)', () => {
  describe('adaptMCPToolsForMatching', () => {
    it('should convert MCPToolDefinition[] to Tool[]', () => {
      const tools = adaptMCPToolsForMatching(mockMCPToolsListResponse);

      expect(tools).toHaveLength(3);
      // Each tool should have id, name, description, requirements
      for (const tool of tools) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.requirements).toBeDefined();
      }
    });

    it('should map MCP tool name to tool id', () => {
      const tools = adaptMCPToolsForMatching(mockMCPToolsListResponse);

      const ids = tools.map((t) => t.id);
      expect(ids).toContain('set-track-color');
      expect(ids).toContain('range-bearing');
      expect(ids).toContain('bearing-to-point');
    });

    it('should convert kebab-case names to display names', () => {
      const tools = adaptMCPToolsForMatching(mockMCPToolsListResponse);

      const trackColor = tools.find((t) => t.id === 'set-track-color');
      expect(trackColor?.name).toBe('Set Track Color');

      const rangeBearing = tools.find((t) => t.id === 'range-bearing');
      expect(rangeBearing?.name).toBe('Range Bearing');
    });

    it('should preserve selection requirements with correct structure', () => {
      const tools = adaptMCPToolsForMatching(mockMCPToolsListResponse);

      const trackColor = tools.find((t) => t.id === 'set-track-color');
      expect(trackColor?.requirements).toEqual([{ kind: 'TRACK', min: 1 }]);

      const rangeBearing = tools.find((t) => t.id === 'range-bearing');
      expect(rangeBearing?.requirements).toEqual([{ kind: 'TRACK', min: 2, max: 2 }]);

      const bearingToPoint = tools.find((t) => t.id === 'bearing-to-point');
      expect(bearingToPoint?.requirements).toEqual([
        { kind: 'TRACK', min: 1, max: 1 },
        { kind: 'POINT', min: 1, max: 1 },
      ]);
    });

    it('should extract version from MCP annotations', () => {
      const tools = adaptMCPToolsForMatching(mockMCPToolsListResponse);

      const rangeBearing = tools.find((t) => t.id === 'range-bearing');
      expect(rangeBearing?.version).toBe('2.1.0');
    });

    it('should return empty array for empty MCP tools list', () => {
      const tools = adaptMCPToolsForMatching([]);
      expect(tools).toEqual([]);
    });

    it('should produce Tool[] compatible with ToolMatchService', () => {
      const tools = adaptMCPToolsForMatching(mockMCPToolsListResponse);

      // Verify each tool conforms to the Tool interface from @debrief/schemas
      for (const tool of tools) {
        expect(typeof tool.id).toBe('string');
        expect(typeof tool.name).toBe('string');
        expect(Array.isArray(tool.requirements)).toBe(true);

        for (const req of tool.requirements!) {
          expect(typeof req.kind).toBe('string');
          expect(typeof req.min).toBe('number');
          if (req.max !== undefined) {
            expect(typeof req.max).toBe('number');
          }
        }
      }
    });
  });

  describe('end-to-end: MCP tools/list -> CalcService.listTools() pattern', () => {
    it('should demonstrate the expected CalcService.listTools() flow', async () => {
      // Simulate what CalcService.listTools() does:
      // 1. Get MCP tools/list response (mocked here)
      const mcpResponse = mockMCPToolsListResponse;

      // 2. Adapt via mcpToolAdapter
      const tools = adaptMCPToolsForMatching(mcpResponse);

      // 3. Result should be usable by ToolMatchService
      expect(tools).toHaveLength(3);
      expect(tools.every((t) => t.id && t.name && t.requirements)).toBe(true);
    });
  });
});


describe('adaptMCPToolsForMatching — debrief:uiCategory (feature 207)', () => {
  it('carries canonical uiCategory through to the adapted Tool', () => {
    const mcp: MCPToolDefinition[] = [
      {
        name: 'range-bearing',
        description: 'Range and bearing',
        inputSchema: { type: 'object' as const, properties: {} },
        annotations: {
          'debrief:selectionRequirements': [{ kind: 'TRACK', min: 2 }],
          'debrief:category': 'dataset/range_bearing_series',
          'debrief:version': '1.0.0',
          'debrief:outputKind': 'dataset/range_bearing_series',
          'debrief:uiCategory': 'calc',
        },
      },
    ];
    const tools = adaptMCPToolsForMatching(mcp);
    expect(tools).toHaveLength(1);
    expect(tools[0].category).toBe('calc');
  });

  it('omits category when tool declared none', () => {
    const mcp: MCPToolDefinition[] = [
      {
        name: 'legacy',
        description: 'Legacy without category',
        inputSchema: { type: 'object' as const, properties: {} },
        annotations: {
          'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
          'debrief:category': 'track',
          'debrief:version': '1.0.0',
          'debrief:outputKind': 'track/statistics',
        },
      },
    ];
    const tools = adaptMCPToolsForMatching(mcp);
    expect(tools[0].category).toBeUndefined();
  });

  it('coerces invalid uiCategory to undefined + warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const mcp: MCPToolDefinition[] = [
        {
          name: 'bad-tool',
          description: 'Invalid category',
          inputSchema: { type: 'object' as const, properties: {} },
          annotations: {
            'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
            'debrief:category': 'track',
            'debrief:version': '1.0.0',
            'debrief:outputKind': 'track/statistics',
            // @ts-expect-error — deliberately invalid for boundary testing
            'debrief:uiCategory': 'geometry',
          },
        },
      ];
      const tools = adaptMCPToolsForMatching(mcp);
      expect(tools[0].category).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('projects category map as Record<toolId, category-or-null> (projection logic)', () => {
    // Simulates CalcService.getToolCategoryMap() projection logic.
    const mcp: MCPToolDefinition[] = [
      {
        name: 'a-calc-tool',
        description: '',
        inputSchema: { type: 'object' as const, properties: {} },
        annotations: {
          'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
          'debrief:category': 'track',
          'debrief:version': '1.0.0',
          'debrief:outputKind': 'track/statistics',
          'debrief:uiCategory': 'calc',
        },
      },
      {
        name: 'a-legacy-tool',
        description: '',
        inputSchema: { type: 'object' as const, properties: {} },
        annotations: {
          'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
          'debrief:category': 'track',
          'debrief:version': '1.0.0',
          'debrief:outputKind': 'track/statistics',
        },
      },
    ];
    const tools = adaptMCPToolsForMatching(mcp);
    const map: Record<string, string | null> = {};
    for (const tool of tools) {
      map[tool.id] = tool.category ?? null;
    }
    expect(map).toEqual({
      'a-calc-tool': 'calc',
      'a-legacy-tool': null,
    });
  });
});
