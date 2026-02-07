/**
 * Golden fixture tests for selection path utilities.
 * Feature: 053-nested-child-selection
 *
 * Tests against the canonical fixtures in contracts/golden-fixtures.json.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parsePath,
  validatePathStructure,
  normalisePath,
} from '../../../src/utils/selectionPath.js';

// Load golden fixtures — use process.cwd() since vitest runs from package root
const fixturesPath = resolve(process.cwd(), '../../specs/053-nested-child-selection/contracts/golden-fixtures.json');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

describe('Golden Fixtures: valid paths', () => {
  for (const fixture of fixtures.valid_paths) {
    it(`should parse: ${fixture.description}`, () => {
      const parsed = parsePath(fixture.path);
      expect(parsed.root).toBe(fixture.parsed.root);
      expect(parsed.depth).toBe(fixture.parsed.depth);
      expect(parsed.levels).toEqual(fixture.parsed.levels);
    });

    it(`should validate structurally: ${fixture.description}`, () => {
      const result = validatePathStructure(fixture.path);
      expect(result.valid).toBe(true);
    });
  }
});

describe('Golden Fixtures: invalid paths', () => {
  for (const fixture of fixtures.invalid_paths) {
    if (fixture.normalised !== undefined) {
      // Trailing slash case: normalises to valid path
      it(`should normalise: ${fixture.description}`, () => {
        const normalised = normalisePath(fixture.path);
        expect(normalised).toBe(fixture.normalised);
      });
    } else {
      it(`should reject: ${fixture.description}`, () => {
        const result = validatePathStructure(fixture.path);
        expect(result.valid).toBe(false);
      });
    }
  }
});
