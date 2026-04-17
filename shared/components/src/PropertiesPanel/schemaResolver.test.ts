/**
 * Unit tests for the schema-to-spec resolver.
 */

import { describe, it, expect } from 'vitest';
import { resolveFieldSpec } from './schemaResolver';

describe('resolveFieldSpec', () => {
  it('maps string + format date-time to datetime', () => {
    const spec = resolveFieldSpec(
      { type: 'string', format: 'date-time' },
      'start_datetime',
    );
    expect(spec).toEqual({ kind: 'datetime' });
  });

  it('strips null from tuple types ([string, null])', () => {
    const spec = resolveFieldSpec(
      { type: ['string', 'null'], format: 'date-time' },
      'datetime',
    );
    expect(spec).toEqual({ kind: 'datetime' });
  });

  it('maps string + enum to enum', () => {
    const spec = resolveFieldSpec(
      { type: 'string', enum: ['low', 'high'] },
      'severity',
    );
    expect(spec).toEqual({ kind: 'enum', allowedValues: ['low', 'high'] });
  });

  it('maps plain string to string with maxLength and pattern', () => {
    const spec = resolveFieldSpec(
      { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9 ]+$' },
      'title',
    );
    expect(spec).toEqual({
      kind: 'string',
      maxLength: 80,
      pattern: '^[A-Za-z0-9 ]+$',
    });
  });

  it('maps strings with PT-prefix pattern to duration', () => {
    const spec = resolveFieldSpec(
      { type: 'string', pattern: '^PT(\\d+H)?(\\d+M)?(\\d+S)?$' },
      'interval',
    );
    expect(spec).toEqual({ kind: 'duration' });
  });

  it('maps integer to number with integer flag', () => {
    const spec = resolveFieldSpec(
      { type: 'integer', minimum: 0, maximum: 99 },
      'count',
    );
    expect(spec).toEqual({ kind: 'number', min: 0, max: 99, integer: true });
  });

  it('maps number to number without integer flag', () => {
    const spec = resolveFieldSpec({ type: 'number' }, 'speed');
    expect(spec).toEqual({ kind: 'number' });
  });

  it('maps boolean to boolean', () => {
    const spec = resolveFieldSpec({ type: 'boolean' }, 'active');
    expect(spec).toEqual({ kind: 'boolean' });
  });

  it('maps string array to string-array', () => {
    const spec = resolveFieldSpec(
      { type: 'array', items: { type: 'string' }, maxItems: 10 },
      'debrief:tags',
    );
    expect(spec).toEqual({ kind: 'string-array', maxItems: 10 });
  });

  it('retains itemEnum for string array with enum items', () => {
    const spec = resolveFieldSpec(
      { type: 'array', items: { type: 'string', enum: ['a', 'b'] } },
      'tags',
    );
    expect(spec).toEqual({ kind: 'string-array', itemEnum: ['a', 'b'] });
  });

  it('maps 4-number array to bbox', () => {
    const spec = resolveFieldSpec(
      {
        type: 'array',
        items: { type: 'number' },
        minItems: 4,
        maxItems: 4,
      },
      'bbox',
    );
    expect(spec).toEqual({ kind: 'bbox' });
  });

  it('maps arrays of PlatformRecord refs to platform-array', () => {
    const spec = resolveFieldSpec(
      {
        type: ['array', 'null'],
        items: { $ref: '#/$defs/PlatformRecord' },
      },
      'debrief:platforms',
    );
    expect(spec).toEqual({ kind: 'platform-array' });
  });

  it('falls back to unsupported for unknown array items', () => {
    const spec = resolveFieldSpec(
      { type: 'array', items: { type: 'object' } },
      'misc',
    );
    expect(spec.kind).toBe('unsupported');
    if (spec.kind === 'unsupported') {
      expect(spec.reason).toContain('misc');
    }
  });

  it('falls back to unsupported for non-object input', () => {
    const spec = resolveFieldSpec(null, 'foo');
    expect(spec.kind).toBe('unsupported');
  });

  it('falls back to unsupported for unknown scalar types', () => {
    const spec = resolveFieldSpec({ type: 'object' }, 'thing');
    expect(spec.kind).toBe('unsupported');
  });
});
