import { describe, expect, it } from 'vitest';

import { StacWriterError } from '../../src/errors.js';
import { pathGuard, validateSceneId } from '../../src/core/pathGuard.js';

describe('pathGuard', () => {
  it('accepts catalog-relative paths', () => {
    expect(() => pathGuard('test', 'exercise-alpha/item.json')).not.toThrow();
    expect(() => pathGuard('test', 'user/01HFA8/item.json')).not.toThrow();
    expect(() => pathGuard('test', './nested/item.json')).not.toThrow();
  });

  it('rejects empty input', () => {
    expect(() => pathGuard('test', '')).toThrowError(StacWriterError);
    expect(() => pathGuard('test', '   ')).toThrowError(StacWriterError);
  });

  it('rejects absolute paths', () => {
    expect(() => pathGuard('test', '/abs/path/item.json')).toThrowError(
      /absolute paths/,
    );
    expect(() => pathGuard('test', 'C:\\abs\\path')).toThrowError(
      /absolute paths/,
    );
    expect(() => pathGuard('test', 'file:///etc/passwd')).toThrowError(
      /absolute paths/,
    );
    expect(() => pathGuard('test', 'http://example.com')).toThrowError(
      /absolute paths/,
    );
  });

  it('rejects path traversal', () => {
    expect(() => pathGuard('test', '../etc/passwd')).toThrowError(
      /path traversal/,
    );
    expect(() => pathGuard('test', 'foo/../../etc')).toThrowError(
      /path traversal/,
    );
    expect(() => pathGuard('test', 'foo\\..\\bar')).toThrowError(
      /path traversal/,
    );
  });

  it('rejects control characters', () => {
    expect(() => pathGuard('test', `foo${String.fromCharCode(0)}.json`)).toThrowError(
      /control characters/,
    );
    expect(() => pathGuard('test', `foo${String.fromCharCode(27)}.json`)).toThrowError(
      /control characters/,
    );
  });

  it('attaches the path to the error', () => {
    try {
      pathGuard('myop', '../etc/passwd');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(StacWriterError);
      const e = err as StacWriterError;
      expect(e.kind).toBe('path-rejected');
      expect(e.path).toBe('../etc/passwd');
      expect(e.message).toMatch(/^myop:/);
    }
  });
});

describe('validateSceneId', () => {
  it('accepts a valid ULID', () => {
    expect(() => validateSceneId('01HFA8B7C2D3E4F5G6H7J8K9M0')).not.toThrow();
  });

  it('rejects non-ULID strings', () => {
    expect(() => validateSceneId('not-a-ulid')).toThrowError(StacWriterError);
    expect(() => validateSceneId('01HFA8B7C2D3E4F5G6H7J8K9M0X')).toThrowError(
      StacWriterError,
    );
    expect(() => validateSceneId('01HFA8B7C2D3E4F5G6H7J8K9I0')).toThrowError(
      StacWriterError,
    );
  });
});
