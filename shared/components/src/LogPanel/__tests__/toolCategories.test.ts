/**
 * Unit tests for the manifest-fed `resolveToolCategory` resolver.
 *
 * Feature: 207 Commit B — the interim `TOOL_ID_TO_CATEGORY` shim has
 * been removed; resolution is exclusively via the passed-in manifest map.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveToolCategory,
  TOOL_CATEGORY_CONFIGS,
  UNKNOWN_CATEGORY_CONFIG,
} from '../toolCategories';
import type { ToolCategoryMap } from '../types';

describe('resolveToolCategory — manifest-fed resolution (feature 207)', () => {
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

describe('resolveToolCategory — unloaded manifest state (feature 207 R4)', () => {
  it('returns UNKNOWN for every tool when no manifest is supplied', () => {
    // Pre-manifest-delivery render path: the webview calls resolveToolCategory
    // with no map until the `tools:manifest` message arrives. Every card
    // must render grey until then — no flashing of incorrect (non-grey) colours.
    expect(resolveToolCategory('import-rep')).toBe(UNKNOWN_CATEGORY_CONFIG);
    expect(resolveToolCategory('change-track-color')).toBe(UNKNOWN_CATEGORY_CONFIG);
    expect(resolveToolCategory('some-brand-new-tool')).toBe(UNKNOWN_CATEGORY_CONFIG);
  });

  it('UNKNOWN and undefined-manifest are observationally identical', () => {
    // Intentional — callers relying on the legacy shim must now pass
    // a manifest map. The Commit B migration updated every first-party
    // tool to declare `category` at its registration site, so no
    // production caller needs the shim behaviour.
    expect(resolveToolCategory('import-rep')).toEqual(UNKNOWN_CATEGORY_CONFIG);
    expect(resolveToolCategory('import-rep', {})).toEqual(UNKNOWN_CATEGORY_CONFIG);
    expect(resolveToolCategory('import-rep', { 'other': 'calc' })).toEqual(
      UNKNOWN_CATEGORY_CONFIG,
    );
  });
});
