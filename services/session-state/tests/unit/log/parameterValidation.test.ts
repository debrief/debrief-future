/**
 * Parameter validation unit tests.
 * Feature: 076-replay-tune
 */

import { describe, it, expect } from 'vitest';
import {
  validateParameter,
  isValidIsoDuration,
} from '../../../src/log/parameterValidation.js';
import type { ParameterTypeInfo } from '../../../src/log/types.js';

describe('validateParameter', () => {
  describe('float', () => {
    const typeInfo: ParameterTypeInfo = {
      type: 'float',
      label: 'Threshold',
      min: 0,
      max: 100,
    };

    it('valid number returns valid', () => {
      const result = validateParameter(42.5, typeInfo);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    it('NaN returns invalid', () => {
      const result = validateParameter(NaN, typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('finite number');
    });

    it('Infinity returns invalid', () => {
      const result = validateParameter(Infinity, typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('finite number');
    });

    it('below min returns invalid', () => {
      const result = validateParameter(-1, typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('>= 0');
    });

    it('above max returns invalid', () => {
      const result = validateParameter(101, typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('<= 100');
    });
  });

  describe('integer', () => {
    const typeInfo: ParameterTypeInfo = {
      type: 'integer',
      label: 'Count',
      min: 1,
      max: 10,
    };

    it('valid integer returns valid', () => {
      const result = validateParameter(5, typeInfo);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    it('float value returns invalid', () => {
      const result = validateParameter(3.5, typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('integer');
    });

    it('within range valid', () => {
      const result = validateParameter(1, typeInfo);
      expect(result.valid).toBe(true);

      const result2 = validateParameter(10, typeInfo);
      expect(result2.valid).toBe(true);
    });

    it('out of range invalid', () => {
      const result = validateParameter(0, typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('>= 1');

      const result2 = validateParameter(11, typeInfo);
      expect(result2.valid).toBe(false);
      expect(result2.message).toContain('<= 10');
    });
  });

  describe('duration', () => {
    const typeInfo: ParameterTypeInfo = {
      type: 'duration',
      label: 'Interval',
    };

    it('PT30S valid', () => {
      const result = validateParameter('PT30S', typeInfo);
      expect(result.valid).toBe(true);
    });

    it('PT1M valid', () => {
      const result = validateParameter('PT1M', typeInfo);
      expect(result.valid).toBe(true);
    });

    it('PT1H30M valid', () => {
      const result = validateParameter('PT1H30M', typeInfo);
      expect(result.valid).toBe(true);
    });

    it('PT1H30M15S valid', () => {
      const result = validateParameter('PT1H30M15S', typeInfo);
      expect(result.valid).toBe(true);
    });

    it('PT0.5S valid (fractional seconds)', () => {
      const result = validateParameter('PT0.5S', typeInfo);
      expect(result.valid).toBe(true);
    });

    it('"30 seconds" invalid', () => {
      const result = validateParameter('30 seconds', typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('ISO 8601');
    });

    it('"PT" alone invalid (no components)', () => {
      const result = validateParameter('PT', typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('ISO 8601');
    });
  });

  describe('enum', () => {
    const typeInfo: ParameterTypeInfo = {
      type: 'enum',
      label: 'Mode',
      allowed_values: ['fast', 'slow', 'medium'],
    };

    it('valid value returns valid', () => {
      const result = validateParameter('fast', typeInfo);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    it('invalid value returns invalid', () => {
      const result = validateParameter('turbo', typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('one of');
    });
  });

  describe('boolean', () => {
    const typeInfo: ParameterTypeInfo = {
      type: 'boolean',
      label: 'Enabled',
    };

    it('true returns valid', () => {
      const result = validateParameter(true, typeInfo);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    it('false returns valid', () => {
      const result = validateParameter(false, typeInfo);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    it('string "true" returns invalid', () => {
      const result = validateParameter('true', typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('boolean');
    });
  });

  describe('string', () => {
    const typeInfo: ParameterTypeInfo = {
      type: 'string',
      label: 'Name',
    };

    it('non-empty valid', () => {
      const result = validateParameter('hello', typeInfo);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    it('empty string invalid', () => {
      const result = validateParameter('', typeInfo);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not be empty');
    });

    it('matches pattern valid', () => {
      const withPattern: ParameterTypeInfo = {
        type: 'string',
        label: 'Identifier',
        pattern: '^[a-z]+$',
      };
      const result = validateParameter('abc', withPattern);
      expect(result.valid).toBe(true);
    });

    it('fails pattern invalid', () => {
      const withPattern: ParameterTypeInfo = {
        type: 'string',
        label: 'Identifier',
        pattern: '^[a-z]+$',
      };
      const result = validateParameter('ABC123', withPattern);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('pattern');
    });
  });
});

describe('isValidIsoDuration', () => {
  it('returns true for valid durations', () => {
    expect(isValidIsoDuration('PT30S')).toBe(true);
    expect(isValidIsoDuration('PT1M')).toBe(true);
    expect(isValidIsoDuration('PT1H')).toBe(true);
    expect(isValidIsoDuration('PT1H30M')).toBe(true);
    expect(isValidIsoDuration('PT1H30M15S')).toBe(true);
    expect(isValidIsoDuration('PT0.5S')).toBe(true);
  });

  it('returns false for invalid durations', () => {
    expect(isValidIsoDuration('PT')).toBe(false);
    expect(isValidIsoDuration('30S')).toBe(false);
    expect(isValidIsoDuration('30 seconds')).toBe(false);
    expect(isValidIsoDuration('')).toBe(false);
  });
});
