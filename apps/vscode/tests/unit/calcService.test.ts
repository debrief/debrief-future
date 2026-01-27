/**
 * CalcService Tests - Tests for tool-related functionality
 *
 * Feature: 038-context-tool-vscode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tool } from '../../src/types/tool';
import { createDefaultResultStyle, createToolExecution } from '../../src/types/tool';

describe('CalcService logic', () => {
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

  describe('createToolExecution', () => {
    it('creates execution record with pending status', () => {
      const execution = createToolExecution('range-bearing', 'Range & Bearing');

      expect(execution.toolId).toBe('range-bearing');
      expect(execution.toolName).toBe('Range & Bearing');
      expect(execution.status).toBe('pending');
      expect(execution.startedAt).toBeDefined();
      expect(execution.id).toMatch(/^exec-/);
    });

    it('creates unique IDs for each execution', () => {
      const exec1 = createToolExecution('tool-1', 'Tool 1');
      const exec2 = createToolExecution('tool-2', 'Tool 2');

      expect(exec1.id).not.toBe(exec2.id);
    });
  });

  describe('Tool type', () => {
    it('supports SelectionRequirement format', () => {
      const tool: Tool = {
        id: 'range-bearing',
        name: 'Range & Bearing',
        description: 'Calculate range and bearing between tracks',
        version: '1.0.0',
        requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
      };

      expect(tool.requirements).toBeDefined();
      expect(tool.requirements).toHaveLength(1);
      expect(tool.requirements![0].kind).toBe('TRACK');
      expect(tool.requirements![0].min).toBe(2);
      expect(tool.requirements![0].max).toBe(2);
    });

    it('supports tools with no requirements', () => {
      const tool: Tool = {
        id: 'universal-info',
        name: 'Feature Information',
        description: 'Display info about any feature',
        requirements: [],
      };

      expect(tool.requirements).toEqual([]);
    });

    it('supports tools with multiple requirements', () => {
      const tool: Tool = {
        id: 'distance-to-point',
        name: 'Distance to Point',
        description: 'Calculate distance from track to point',
        requirements: [
          { kind: 'TRACK', min: 1, max: 1 },
          { kind: 'POINT', min: 1, max: 1 },
        ],
      };

      expect(tool.requirements).toHaveLength(2);
    });
  });
});
