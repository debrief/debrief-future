/**
 * Unit tests for paramTypeInference module.
 *
 * Covers:
 * - Heuristic inference from values
 * - Schema-based inference (Gap 1: schema override test)
 * - Priority chain: schema > heuristic > null
 *
 * Feature: 176-log-panel-ux
 */

import { describe, it, expect } from 'vitest';
import { inferParamType, inferFromValue, inferFromSchema } from '../paramTypeInference';
import type { ParameterSchemaEntry } from '../types';

// Helper to build a minimal schema entry
function makeSchema(overrides: Partial<ParameterSchemaEntry>): ParameterSchemaEntry {
  return {
    name: 'test',
    type: 'string',
    description: null,
    tunable: true,
    defaultValue: null,
    minimum: null,
    maximum: null,
    step: null,
    choices: null,
    paramType: null,
    ...overrides,
  };
}

describe('inferFromValue (heuristic)', () => {
  it('returns "boolean" for boolean values', () => {
    expect(inferFromValue('flag', true)).toBe('boolean');
    expect(inferFromValue('flag', false)).toBe('boolean');
  });

  it('returns "number" for numeric values', () => {
    expect(inferFromValue('distance', 42)).toBe('number');
    expect(inferFromValue('distance', 3.14)).toBe('number');
  });

  it('returns "colour" for hex colour strings', () => {
    expect(inferFromValue('fill', '#ff0000')).toBe('colour');
    expect(inferFromValue('fill', '#abc')).toBe('colour');
    expect(inferFromValue('fill', '#aabbccdd')).toBe('colour');
  });

  it('returns "colour" for named colour strings', () => {
    expect(inferFromValue('fill', 'red')).toBe('colour');
    expect(inferFromValue('fill', 'Green')).toBe('colour');
    expect(inferFromValue('fill', 'BLUE')).toBe('colour');
  });

  it('returns "colour" for colour-hinted parameter names', () => {
    expect(inferFromValue('trackColor', 'foo')).toBe('colour');
    expect(inferFromValue('lineColour', 'bar')).toBe('colour');
  });

  it('returns "boolean" for boolean-like strings', () => {
    expect(inferFromValue('visible', 'true')).toBe('boolean');
    expect(inferFromValue('visible', 'false')).toBe('boolean');
  });

  it('returns "number" for numeric strings', () => {
    expect(inferFromValue('speed', '30')).toBe('number');
    expect(inferFromValue('speed', '-2.5')).toBe('number');
  });

  it('returns null for unrecognised values', () => {
    expect(inferFromValue('name', 'HMS Nonsuch')).toBeNull();
    expect(inferFromValue('mode', 'linear')).toBeNull();
  });
});

describe('inferFromSchema', () => {
  it('returns paramType when present', () => {
    expect(inferFromSchema(makeSchema({ paramType: 'colour' }))).toBe('colour');
    expect(inferFromSchema(makeSchema({ paramType: 'color' }))).toBe('colour');
    expect(inferFromSchema(makeSchema({ paramType: 'range' }))).toBe('range');
  });

  it('returns "boolean" for boolean schema type', () => {
    expect(inferFromSchema(makeSchema({ type: 'boolean' }))).toBe('boolean');
  });

  it('returns "enum" when choices are present', () => {
    expect(inferFromSchema(makeSchema({ choices: ['a', 'b', 'c'] }))).toBe('enum');
  });

  it('returns "range" for numbers with min and max', () => {
    expect(inferFromSchema(makeSchema({ type: 'number', minimum: 0, maximum: 100 }))).toBe('range');
  });

  it('returns "number" for number type without range', () => {
    expect(inferFromSchema(makeSchema({ type: 'number' }))).toBe('number');
  });

  it('returns null when no type can be inferred', () => {
    expect(inferFromSchema(makeSchema({}))).toBeNull();
  });
});

describe('inferParamType (priority chain)', () => {
  it('prefers schema over heuristic (Gap 1: schema override test)', () => {
    // Value "42" heuristic would say "number", but schema says "enum"
    const schema = makeSchema({ choices: ['42', '99', '100'] });
    expect(inferParamType('level', 42, schema)).toBe('enum');
  });

  it('prefers schema paramType over schema structural inference', () => {
    // Schema structurally looks like a number, but paramType says colour
    const schema = makeSchema({ type: 'string', paramType: 'colour' });
    expect(inferParamType('fill', '#ff0000', schema)).toBe('colour');
  });

  it('falls back to heuristic when schema has no type info', () => {
    const schema = makeSchema({}); // no type info
    expect(inferParamType('flag', true, schema)).toBe('boolean');
  });

  it('falls back to heuristic when no schema is provided', () => {
    expect(inferParamType('distance', 42)).toBe('number');
    expect(inferParamType('flag', true)).toBe('boolean');
  });

  it('returns null when neither schema nor heuristic can infer', () => {
    expect(inferParamType('name', 'HMS Nonsuch')).toBeNull();
  });
});
