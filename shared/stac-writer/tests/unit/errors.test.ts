import { describe, expect, it } from 'vitest';

import { StacWriterError } from '../../src/errors.js';

describe('StacWriterError', () => {
  it('preserves kind, message, path, cause', () => {
    const cause = new Error('underlying');
    const err = new StacWriterError(
      'write-failed',
      'something blew up',
      { path: 'foo/bar.json', cause },
    );
    expect(err.kind).toBe('write-failed');
    expect(err.message).toBe('something blew up');
    expect(err.path).toBe('foo/bar.json');
    expect(err.cause).toBe(cause);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(StacWriterError);
  });

  it('JSON-serialises cleanly with cause flattened to its message', () => {
    const cause = new Error('disk full');
    const err = new StacWriterError(
      'quota-exceeded',
      'browser quota exceeded',
      { path: 'item.json', cause },
    );
    const json = JSON.parse(JSON.stringify(err));
    expect(json).toEqual({
      name: 'StacWriterError',
      kind: 'quota-exceeded',
      message: 'browser quota exceeded',
      path: 'item.json',
      cause: 'disk full',
    });
  });

  it('round-trips kind discrimination through JSON', () => {
    const kinds = [
      'path-rejected',
      'stac-item-not-found',
      'bundled-item-read-only',
      'item-json-malformed',
      'stale-fingerprint',
      'validation-failed',
      'write-failed',
      'read-only-fs',
      'quota-exceeded',
      'indexeddb-unavailable',
      'empty-png',
    ] as const;
    for (const kind of kinds) {
      const err = new StacWriterError(kind, 'test');
      const round = JSON.parse(JSON.stringify(err));
      expect(round.kind).toBe(kind);
    }
  });

  it('handles missing path and cause', () => {
    const err = new StacWriterError('validation-failed', 'no path provided');
    expect(err.path).toBeUndefined();
    expect(err.cause).toBeUndefined();
    const json = JSON.parse(JSON.stringify(err));
    expect(json.path).toBeUndefined();
    expect(json.cause).toBeUndefined();
  });
});
