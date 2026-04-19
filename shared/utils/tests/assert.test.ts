/**
 * Tests for the `assertNever` exhaustiveness helper.
 */

import { describe, it, expect } from 'vitest';
import { assertNever } from '../src/assert.js';

describe('assertNever', () => {
  it('throws at runtime when reached', () => {
    // Cast an unreachable value to `never` so the compiler permits the call.
    const unreachable = 'surprise' as unknown as never;
    expect(() => assertNever(unreachable)).toThrow(/assertNever/);
  });

  it('includes the offending value in the thrown error message', () => {
    const unreachable = 'diamond' as unknown as never;
    expect(() => assertNever(unreachable)).toThrow(/diamond/);
  });
});
