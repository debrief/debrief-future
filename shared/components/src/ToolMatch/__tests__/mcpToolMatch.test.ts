/**
 * Integration tests: ToolMatchService with MCP-adapted tool definitions.
 *
 * Verifies end-to-end flow: MCPToolDefinition → fromMCPTools → ToolMatchService.match().
 * Ensures MCP-adapted tools work correctly with the matching algorithm.
 *
 * Feature: 052-tool-api-integration (US2 Tool Filtering, T014)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolMatchService } from '../ToolMatchService';
import { fromMCPTools, type MCPToolDefinition } from '../mcpAdapter';
import { createSelectionFromCounts } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures: 4 styling tools, all requiring TRACK with min: 1
// ---------------------------------------------------------------------------

const stylingMCPTools: MCPToolDefinition[] = [
  {
    name: 'set-track-color',
    description: 'Set the display color of selected tracks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        color: { type: 'string', description: 'Hex color value' },
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
    name: 'set-track-width',
    description: 'Set the display width of selected tracks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        width: { type: 'number', description: 'Line width in pixels' },
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
    name: 'set-label-interval',
    description: 'Set the label interval for selected tracks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        interval: { type: 'number', description: 'Interval in seconds' },
      },
    },
    annotations: {
      'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
      'debrief:category': 'track/styling',
      'debrief:version': '1.2.0',
      'debrief:outputKind': 'mutation/track/styled',
    },
  },
  {
    name: 'set-symbol-type',
    description: 'Set the symbol type for selected tracks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        symbol: { type: 'string', description: 'Symbol type identifier' },
      },
    },
    annotations: {
      'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
      'debrief:category': 'track/styling',
      'debrief:version': '1.0.0',
      'debrief:outputKind': 'mutation/track/styled',
    },
  },
];

describe('ToolMatchService with MCP-adapted tools (T014)', () => {
  let service: ToolMatchService;

  beforeEach(() => {
    const tools = fromMCPTools(stylingMCPTools);
    service = new ToolMatchService(tools);
  });

  it('should adapt all 4 MCP tools into Tool[] via fromMCPTools', () => {
    const allTools = service.getAllTools();
    expect(allTools).toHaveLength(4);

    // Verify all tools have proper structure after adaptation
    for (const tool of allTools) {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.requirements).toBeDefined();
      expect(tool.requirements!.length).toBeGreaterThan(0);
      expect(tool.requirements![0].kind).toBe('TRACK');
      expect(tool.requirements![0].min).toBe(1);
    }
  });

  it('should enable all 4 tools when all TRACK features selected', () => {
    const selection = createSelectionFromCounts({ TRACK: 3 });
    const activeTools = service.getActiveTools(selection);

    expect(activeTools).toHaveLength(4);

    const activeIds = activeTools.map((t) => t.id);
    expect(activeIds).toContain('set-track-color');
    expect(activeIds).toContain('set-track-width');
    expect(activeIds).toContain('set-label-interval');
    expect(activeIds).toContain('set-symbol-type');
  });

  it('should disable all 4 tools when no features selected', () => {
    const selection = createSelectionFromCounts({});
    const activeTools = service.getActiveTools(selection);

    expect(activeTools).toHaveLength(0);
  });

  it('should disable all 4 tools when only POINT features selected', () => {
    const selection = createSelectionFromCounts({ POINT: 3 });
    const activeTools = service.getActiveTools(selection);

    expect(activeTools).toHaveLength(0);
  });

  it('should enable all 4 tools when mix of TRACK + POINT features selected', () => {
    // Tracks satisfy the TRACK requirement; POINT features are ignored
    const selection = createSelectionFromCounts({ TRACK: 2, POINT: 1 });
    const activeTools = service.getActiveTools(selection);

    expect(activeTools).toHaveLength(4);

    const activeIds = activeTools.map((t) => t.id);
    expect(activeIds).toContain('set-track-color');
    expect(activeIds).toContain('set-track-width');
    expect(activeIds).toContain('set-label-interval');
    expect(activeIds).toContain('set-symbol-type');
  });

  it('should provide explanations for disabled tools via getMatchResults', () => {
    const selection = createSelectionFromCounts({ POINT: 2 });
    const results = service.getMatchResults(selection);

    expect(results).toHaveLength(4);

    for (const result of results) {
      expect(result.isActive).toBe(false);
      expect(result.explanation).toBeTruthy();
      // Explanation should mention tracks
      expect(result.explanation.toLowerCase()).toContain('track');
    }
  });

  it('should enable all tools with exactly 1 TRACK (min threshold)', () => {
    const selection = createSelectionFromCounts({ TRACK: 1 });
    const activeTools = service.getActiveTools(selection);

    expect(activeTools).toHaveLength(4);
  });

  it('should preserve version from MCP annotations', () => {
    const allTools = service.getAllTools();
    const labelInterval = allTools.find((t) => t.id === 'set-label-interval');

    expect(labelInterval).toBeDefined();
    expect(labelInterval!.version).toBe('1.2.0');
  });

  it('should format tool names from kebab-case to title case', () => {
    const allTools = service.getAllTools();
    const names = allTools.map((t) => t.name);

    expect(names).toContain('Set Track Color');
    expect(names).toContain('Set Track Width');
    expect(names).toContain('Set Label Interval');
    expect(names).toContain('Set Symbol Type');
  });
});
