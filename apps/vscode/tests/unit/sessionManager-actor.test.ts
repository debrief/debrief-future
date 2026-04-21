/**
 * Unit tests for `SessionManager.actor` (Feature 216, T211).
 *
 * Only the `resolveActor` helper is tested here — the SessionManager class
 * constructor calls `resolveActor()` at construction and exposes it as a
 * `readonly actor` field; the fallback path would otherwise be untestable
 * without stubbing `os`.
 */

import { describe, it, expect } from 'vitest';
import { resolveActor, ACTOR_FALLBACK } from '../../src/services/sessionManager';

describe('resolveActor', () => {
  it('returns the provided username when os.userInfo succeeds', () => {
    expect(resolveActor(() => ({ username: 'alice' }))).toBe('alice');
  });

  it('returns the fallback when os.userInfo throws', () => {
    expect(
      resolveActor(() => {
        throw new Error('ENOENT: no /etc/passwd');
      }),
    ).toBe(ACTOR_FALLBACK);
  });

  it('returns the fallback when os.userInfo returns an empty username', () => {
    expect(resolveActor(() => ({ username: '' }))).toBe(ACTOR_FALLBACK);
  });

  it('returns the fallback when os.userInfo returns whitespace only', () => {
    expect(resolveActor(() => ({ username: '   ' }))).toBe(ACTOR_FALLBACK);
  });

  it('exposes a stable ACTOR_FALLBACK literal', () => {
    expect(ACTOR_FALLBACK).toBe('vscode-user');
  });
});
