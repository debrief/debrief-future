/**
 * T041: Test web-shell tool-list contains all registered tools.
 *
 * Validates that the web-shell toolService:
 * 1. Contains all TypeScript-implemented tools (styling, analysis, shape, sensor)
 * 2. Each tool has correct name, description, and requirements
 */

import { describe, it, expect } from 'vitest';
import { listTools } from '../toolService';

/** All tool IDs registered in the web-shell */
const EXPECTED_TOOL_IDS = [
  'set-track-color',
  'apply-symbol-style',
  'label-interval',
  'symbol-interval',
  'move-shape',
  'generate-reference-points',
  'generate-courses-speeds',
  'buffer-zone-generator',
  'track-stats',
  'range-bearing',
  'area-summary',
  'point-in-zone-classifier',
];

describe('toolService.listTools (T041)', () => {
  it('returns all registered tools', () => {
    const tools = listTools();
    expect(tools).toHaveLength(EXPECTED_TOOL_IDS.length);
  });

  it('contains all expected tools', () => {
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

  describe('analysis tools have correct structure', () => {
    it('track-stats has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'track-stats');
      expect(tool).toBeDefined();
      expect(tool!.description.toLowerCase()).toContain('statistic');
      expect(tool!.annotations['debrief:category']).toBe('track/analysis');
      expect(tool!.annotations['debrief:outputKind']).toBe('track/statistics');
      expect(tool!.annotations['debrief:selectionRequirements']).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'TRACK', min: 1 })]),
      );
    });

    it('range-bearing has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'range-bearing');
      expect(tool).toBeDefined();
      expect(tool!.description.toLowerCase()).toContain('range');
      expect(tool!.annotations['debrief:category']).toBe('track/analysis');
      expect(tool!.annotations['debrief:outputKind']).toBe('dataset/range_bearing_series');
      expect(tool!.annotations['debrief:selectionRequirements']).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'TRACK', min: 2 })]),
      );
    });

    it('area-summary has correct definition', () => {
      const tools = listTools();
      const tool = tools.find((t) => t.name === 'area-summary');
      expect(tool).toBeDefined();
      expect(tool!.description.toLowerCase()).toContain('area');
      expect(tool!.annotations['debrief:category']).toBe('region/analysis');
      expect(tool!.annotations['debrief:outputKind']).toBe('region/statistics');
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
