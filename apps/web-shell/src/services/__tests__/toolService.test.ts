/**
 * T041: Test web-shell tool-list contains only TypeScript-implemented tools.
 * T045: Verify Python-only tools don't appear in web-shell.
 *
 * Validates that the web-shell toolService:
 * 1. Contains all TypeScript-implemented tools
 * 2. Does NOT include Python-only tools (track-stats, range-bearing, area-summary)
 * 3. Each tool has correct name, description, and requirements
 */

import { describe, it, expect } from 'vitest';
import { listTools, PYTHON_ONLY_TOOLS } from '../toolService';

/** All TypeScript-implemented tool IDs registered in the web-shell */
const EXPECTED_TOOL_IDS = [
  'set-track-color',
  'apply-symbol-style',
  'label-interval',
  'symbol-interval',
  'move-shape',
  'buffer-zone-generator',
];

describe('toolService.listTools (T041)', () => {
  it('returns all registered tools', () => {
    const tools = listTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_IDS.length);
  });

  it('contains all expected TypeScript tools', () => {
    const tools = listTools();
    const toolIds = tools.map((t) => t.name);

    for (const expectedId of EXPECTED_TOOL_IDS) {
      expect(toolIds).toContain(expectedId);
    }
  });

  it('returns tools with correct names matching expected IDs', () => {
    const tools = listTools();
    const toolIds = tools.map((t) => t.name).sort();
    expect(toolIds).toEqual([...EXPECTED_TOOL_IDS].sort());
  });

  describe('styling tools have correct structure', () => {
    it('set-track-color has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'set-track-color');
      expect(tool).toBeDefined();
      expect(tool!.description).toBeTruthy();
      expect(tool!.description.toLowerCase()).toContain('color');
      expect(tool!.inputSchema.type).toBe('object');
      expect(tool!.annotations['debrief:category']).toBe('track/styling');
      expect(tool!.annotations['debrief:version']).toBe('1.0.0');
      expect(tool!.annotations['debrief:selectionRequirements']).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'TRACK', min: 1 })]),
      );
    });

    it('apply-symbol-style has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'apply-symbol-style');
      expect(tool).toBeDefined();
      expect(tool!.description).toBeTruthy();
      expect(tool!.description.toLowerCase()).toContain('symbol');
      expect(tool!.inputSchema.type).toBe('object');
      expect(tool!.annotations['debrief:category']).toBe('track/styling');
      expect(tool!.annotations['debrief:version']).toBe('1.0.0');
      expect(tool!.annotations['debrief:selectionRequirements']).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'TRACK', min: 1 })]),
      );
    });

    it('label-interval has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'label-interval');
      expect(tool).toBeDefined();
      expect(tool!.description).toBeTruthy();
      expect(tool!.description.toLowerCase()).toContain('label');
      expect(tool!.inputSchema.type).toBe('object');
      expect(tool!.annotations['debrief:category']).toBe('track/styling');
      expect(tool!.annotations['debrief:version']).toBe('1.0.0');
      expect(tool!.annotations['debrief:selectionRequirements']).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'TRACK', min: 1 })]),
      );
    });

    it('symbol-interval has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'symbol-interval');
      expect(tool).toBeDefined();
      expect(tool!.description).toBeTruthy();
      expect(tool!.description.toLowerCase()).toContain('symbol');
      expect(tool!.inputSchema.type).toBe('object');
      expect(tool!.annotations['debrief:category']).toBe('track/styling');
      expect(tool!.annotations['debrief:version']).toBe('1.0.0');
      expect(tool!.annotations['debrief:selectionRequirements']).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'TRACK', min: 1 })]),
      );
    });
  });

  describe('all tools have required MCP fields', () => {
    it('every tool has name, description, inputSchema, and annotations', () => {
      const tools = listTools();
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.annotations).toBeDefined();
        expect(tool.annotations['debrief:selectionRequirements']).toBeDefined();
        expect(tool.annotations['debrief:category']).toBeDefined();
        expect(tool.annotations['debrief:version']).toBeDefined();
        expect(tool.annotations['debrief:outputKind']).toBeDefined();
      }
    });
  });
});

describe('Python-only tool exclusion (T045)', () => {
  it('does not contain track-stats', () => {
    const tools = listTools();
    const toolIds = tools.map((t) => t.name);
    expect(toolIds).not.toContain('track-stats');
  });

  it('does not contain range-bearing', () => {
    const tools = listTools();
    const toolIds = tools.map((t) => t.name);
    expect(toolIds).not.toContain('range-bearing');
  });

  it('does not contain area-summary', () => {
    const tools = listTools();
    const toolIds = tools.map((t) => t.name);
    expect(toolIds).not.toContain('area-summary');
  });

  it('none of the known Python-only tools appear in the tool list', () => {
    const tools = listTools();
    const toolIds = new Set(tools.map((t) => t.name));
    for (const pythonTool of PYTHON_ONLY_TOOLS) {
      expect(toolIds.has(pythonTool)).toBe(false);
    }
  });

  it('PYTHON_ONLY_TOOLS constant lists all known Python-only tools', () => {
    expect(PYTHON_ONLY_TOOLS).toContain('track-stats');
    expect(PYTHON_ONLY_TOOLS).toContain('range-bearing');
    expect(PYTHON_ONLY_TOOLS).toContain('area-summary');
    expect(PYTHON_ONLY_TOOLS).toHaveLength(3);
  });
});
