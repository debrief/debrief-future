/**
 * Unit tests for MCP adapter.
 */

import { describe, it, expect, vi } from 'vitest';
import { fromMCPTool, fromMCPTools, extractParameters, type MCPToolDefinition } from '../mcpAdapter';

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
      expect(tools[0]!.id).toBe('set-track-color');
      expect(tools[1]!.id).toBe('label-interval');
    });

    it('returns empty array for empty input', () => {
      const tools = fromMCPTools([]);
      expect(tools).toEqual([]);
    });
  });

  describe('extractParameters', () => {
    it('returns empty array when no params section exists', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        inputSchema: {
          type: 'object' as const,
          properties: {
            features: { type: 'array', items: { type: 'object' } },
          },
        },
      };
      const params = extractParameters(mcpTool);
      expect(params).toEqual([]);
    });

    it('extracts enum parameter with x-debrief-param-type', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        inputSchema: {
          type: 'object' as const,
          properties: {
            features: { type: 'array', items: { type: 'object' } },
            params: {
              type: 'object',
              properties: {
                color: {
                  type: 'string',
                  description: 'Track color',
                  'x-debrief-param-type': 'FeatureColor',
                },
              },
            },
          },
        },
      };
      const params = extractParameters(mcpTool);
      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        name: 'color',
        valueType: 'enum',
        description: 'Track color',
        paramType: 'FeatureColor',
      });
    });

    it('extracts parameter with explicit choices but no param_type', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        inputSchema: {
          type: 'object' as const,
          properties: {
            features: { type: 'array', items: { type: 'object' } },
            params: {
              type: 'object',
              properties: {
                direction: {
                  type: 'string',
                  description: 'Bearing direction',
                  enum: ['north', 'south', 'east', 'west'],
                  default: 'north',
                },
              },
            },
          },
        },
      };
      const params = extractParameters(mcpTool);
      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({
        name: 'direction',
        valueType: 'enum',
        description: 'Bearing direction',
        choices: ['north', 'south', 'east', 'west'],
        defaultValue: 'north',
      });
    });

    it('handles multiple parameters with different types', () => {
      const mcpTool: MCPToolDefinition = {
        ...sampleMCPTool,
        inputSchema: {
          type: 'object' as const,
          properties: {
            features: { type: 'array', items: { type: 'object' } },
            params: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description: 'Display label',
                },
                interval: {
                  type: 'number',
                  description: 'Interval in seconds',
                  default: 60,
                },
                visible: {
                  type: 'boolean',
                  description: 'Whether labels are visible',
                },
              },
            },
          },
        },
      };
      const params = extractParameters(mcpTool);
      expect(params).toHaveLength(3);
      expect(params[0]).toEqual({
        name: 'label',
        valueType: 'string',
        description: 'Display label',
      });
      expect(params[1]).toEqual({
        name: 'interval',
        valueType: 'number',
        description: 'Interval in seconds',
        defaultValue: 60,
      });
      expect(params[2]).toEqual({
        name: 'visible',
        valueType: 'boolean',
        description: 'Whether labels are visible',
      });
    });
  });
});

describe('mcpAdapter — debrief:uiCategory (feature 207)', () => {
  const sampleWithCategory = (
    uiCategory: unknown | undefined,
    name = 'sample-tool',
  ): MCPToolDefinition =>
    ({
      name,
      description: 'Sample',
      inputSchema: {
        type: 'object' as const,
        properties: {
          features: { type: 'array', items: { type: 'object' } },
          params: { type: 'object', properties: {} },
        },
      },
      annotations: {
        'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
        'debrief:category': 'track/styling',
        'debrief:version': '1.0.0',
        'debrief:outputKind': 'mutation/track/styled',
        ...(uiCategory !== undefined ? { 'debrief:uiCategory': uiCategory } : {}),
      },
    }) as unknown as MCPToolDefinition;

  it('extracts canonical debrief:uiCategory into Tool.category', async () => {
    const { fromMCPTool } = await import('../mcpAdapter');
    const tool = fromMCPTool(sampleWithCategory('style'));
    expect(tool.category).toBe('style');
  });

  it('returns undefined category when annotation is missing', async () => {
    const { fromMCPTool } = await import('../mcpAdapter');
    const tool = fromMCPTool(sampleWithCategory(undefined));
    expect(tool.category).toBeUndefined();
  });

  it('coerces an invalid string to undefined and warns exactly once', async () => {
    const { fromMCPTool } = await import('../mcpAdapter');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const tool = fromMCPTool(sampleWithCategory('geometry', 'bad-tool'));
      expect(tool.category).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('bad-tool');
      expect(warn.mock.calls[0][0]).toContain('geometry');
    } finally {
      warn.mockRestore();
    }
  });

  it('coerces a non-string value to undefined and warns', async () => {
    const { fromMCPTool } = await import('../mcpAdapter');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // @ts-expect-error — deliberately wrong type for boundary testing
      const tool = fromMCPTool(sampleWithCategory(42, 'numeric-tool'));
      expect(tool.category).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('numeric-tool');
    } finally {
      warn.mockRestore();
    }
  });

  it('does NOT warn when annotation is absent', async () => {
    const { fromMCPTool } = await import('../mcpAdapter');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      fromMCPTool(sampleWithCategory(undefined, 'quiet-tool'));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it.each([['import'], ['style'], ['calc'], ['filter'], ['snapshot']])(
    'accepts canonical category value %s',
    async (value) => {
      const { fromMCPTool } = await import('../mcpAdapter');
      const tool = fromMCPTool(sampleWithCategory(value));
      expect(tool.category).toBe(value);
    },
  );
});
