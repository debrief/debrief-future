/**
 * Unit tests for the manifest-fed `resolveToolCategory` resolver.
 *
 * Feature: 207 (replaces the static TOOL_ID_TO_CATEGORY shim with a
 * manifest-fed lookup; shim preserved as a transitional fallback).
 */

import { describe, it, expect } from 'vitest';
import {
  resolveToolCategory,
  TOOL_CATEGORY_CONFIGS,
  UNKNOWN_CATEGORY_CONFIG,
} from '../toolCategories';
import type { ToolCategoryMap } from '../types';

describe('resolveToolCategory — manifest-fed path (feature 207)', () => {
  it('uses the manifest category when tool declared one', () => {
    const map: ToolCategoryMap = { 'my-tool': 'calc' };
    const config = resolveToolCategory('my-tool', map);
    expect(config).toBe(TOOL_CATEGORY_CONFIGS.calc);
  });

  it('returns UNKNOWN when manifest is defined but tool is absent', () => {
    const map: ToolCategoryMap = { 'other-tool': 'style' };
    const config = resolveToolCategory('my-tool', map);
    expect(config).toBe(UNKNOWN_CATEGORY_CONFIG);
  });

  it('returns UNKNOWN when manifest declares null for the tool', () => {
    const map: ToolCategoryMap = { 'my-tool': null };
    const config = resolveToolCategory('my-tool', map);
    expect(config).toBe(UNKNOWN_CATEGORY_CONFIG);
  });

  it('returns UNKNOWN for every tool when the manifest is empty', () => {
    const map: ToolCategoryMap = {};
    expect(resolveToolCategory('import-rep', map)).toBe(UNKNOWN_CATEGORY_CONFIG);
    expect(resolveToolCategory('change-color', map)).toBe(UNKNOWN_CATEGORY_CONFIG);
    expect(resolveToolCategory('brand-new-tool', map)).toBe(UNKNOWN_CATEGORY_CONFIG);
  });

  it.each([['import'], ['style'], ['calc'], ['filter'], ['snapshot']] as const)(
    'resolves every canonical value: %s',
    (value) => {
      const map: ToolCategoryMap = { x: value };
      expect(resolveToolCategory('x', map)).toBe(TOOL_CATEGORY_CONFIGS[value]);
    },
  );
});

describe('resolveToolCategory — legacy shim fallback (feature 207 transitional)', () => {
  it('consults TOOL_ID_TO_CATEGORY when no manifest is supplied', () => {
    // Pre-#207 callers (Storybook stories, unit tests not yet threaded with
    // a manifest) still get the correct colour for the 16 hand-listed tools.
    expect(resolveToolCategory('import-rep')).toBe(TOOL_CATEGORY_CONFIGS.import);
    expect(resolveToolCategory('change-track-color')).toBe(
      TOOL_CATEGORY_CONFIGS.style,
    );
    expect(resolveToolCategory('move-track')).toBe(TOOL_CATEGORY_CONFIGS.calc);
    expect(resolveToolCategory('time-filter')).toBe(TOOL_CATEGORY_CONFIGS.filter);
    expect(resolveToolCategory('export-png')).toBe(TOOL_CATEGORY_CONFIGS.snapshot);
  });

  it('returns UNKNOWN when no manifest + tool not in shim', () => {
    expect(resolveToolCategory('some-new-tool')).toBe(UNKNOWN_CATEGORY_CONFIG);
  });
});

describe('resolveToolCategory — manifest precedence over shim', () => {
  it('uses manifest when defined even if the shim has a different answer', () => {
    // 'import-rep' is `import` in the shim. A manifest that re-categorises
    // it (e.g. to style) should win — the manifest is the source of truth.
    const map: ToolCategoryMap = { 'import-rep': 'style' };
    expect(resolveToolCategory('import-rep', map)).toBe(
      TOOL_CATEGORY_CONFIGS.style,
    );
  });

  it('does NOT fall back to the shim when manifest is empty', () => {
    // Key difference from legacy behaviour: an empty map is "no tool
    // declared a category", not "ask the shim".
    const map: ToolCategoryMap = {};
    expect(resolveToolCategory('import-rep', map)).toBe(UNKNOWN_CATEGORY_CONFIG);
  });
});
