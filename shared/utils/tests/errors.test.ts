/**
 * Tests for the `InvalidPointShapeError` typed error.
 */

import { describe, it, expect } from 'vitest';
import { InvalidPointShapeError } from '../src/errors.js';

describe('InvalidPointShapeError', () => {
  it('preserves the offending value and valid-shape list on the instance', () => {
    const err = new InvalidPointShapeError('star', [
      'circle',
      'square',
      'triangle',
      'diamond',
      'cross',
    ]);

    expect(err.offendingValue).toBe('star');
    expect(err.validShapes).toEqual([
      'circle',
      'square',
      'triangle',
      'diamond',
      'cross',
    ]);
  });

  it('mentions the offending value in the error message', () => {
    const err = new InvalidPointShapeError('star', ['circle']);
    expect(err.message).toContain('star');
  });

  it('mentions each valid shape in the error message', () => {
    const err = new InvalidPointShapeError('star', ['circle', 'square']);
    expect(err.message).toContain('circle');
    expect(err.message).toContain('square');
  });

  it('is an instance of Error', () => {
    const err = new InvalidPointShapeError('star', ['circle']);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidPointShapeError');
  });
});
