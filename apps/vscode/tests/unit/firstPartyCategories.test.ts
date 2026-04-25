/**
 * First-party tool-category coverage test (Feature 207 FR-003, FR-008).
 *
 * Walks every `MCPToolDefinition` exported under `src/tools/` and asserts
 * that its `debrief:uiCategory` annotation is set to one of the five
 * canonical `ToolCategoryEnum` values.
 *
 * Contrib tools registered via future extension-discovery paths are
 * explicitly exempt (spec A3); they live outside `src/tools/` and this
 * test only covers the first-party catalogue shipped with the extension.
 */

import { describe, it, expect } from 'vitest';

// First-party tool definitions (alphabetical, one import per file).
import { toolDefinition as pointInZoneClassifier } from '../../src/tools/reference/classification/pointInZoneClassifier';
import { toolDefinition as generateReferencePoints } from '../../src/tools/reference/generation/generateReferencePoints';
import { toolDefinition as enlargeShape } from '../../src/tools/shape/manipulation/enlargeShape';
import { toolDefinition as moveShape } from '../../src/tools/shape/manipulation/moveShape';
import { toolDefinition as generateCoursesSpeeds } from '../../src/tools/track/manipulation/generateCoursesSpeeds';
import { toolDefinition as applySymbolStyle } from '../../src/tools/track/styling/applySymbolStyle';
import { toolDefinition as labelInterval } from '../../src/tools/track/styling/labelInterval';
import { toolDefinition as setTrackColor } from '../../src/tools/track/styling/setTrackColor';
import { toolDefinition as symbolInterval } from '../../src/tools/track/styling/symbolInterval';

import type { MCPToolDefinition } from '../../src/types/tool';

const FIRST_PARTY_TOOLS: MCPToolDefinition[] = [
  pointInZoneClassifier,
  generateReferencePoints,
  enlargeShape,
  moveShape,
  generateCoursesSpeeds,
  applySymbolStyle,
  labelInterval,
  setTrackColor,
  symbolInterval,
];

const CANONICAL_CATEGORY_VALUES: ReadonlySet<string> = new Set([
  'import',
  'style',
  'calc',
  'filter',
  'snapshot',
]);

describe('first-party tool-category coverage (feature 207)', () => {
  it('every first-party tool exports a MCPToolDefinition', () => {
    for (const tool of FIRST_PARTY_TOOLS) {
      expect(tool).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.annotations).toBeDefined();
    }
  });

  it.each(FIRST_PARTY_TOOLS.map((t) => [t.name, t]))(
    '%s declares a debrief:uiCategory annotation',
    (_name, tool) => {
      const declared = (tool as MCPToolDefinition).annotations['debrief:uiCategory'];
      expect(declared, `${(tool as MCPToolDefinition).name} must declare debrief:uiCategory`).toBeDefined();
    },
  );

  it.each(FIRST_PARTY_TOOLS.map((t) => [t.name, t]))(
    '%s uiCategory is one of the five canonical values',
    (_name, tool) => {
      const declared = (tool as MCPToolDefinition).annotations['debrief:uiCategory'];
      expect(CANONICAL_CATEGORY_VALUES.has(declared as string)).toBe(true);
    },
  );

  it('every first-party tool has a unique name', () => {
    const names = FIRST_PARTY_TOOLS.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
