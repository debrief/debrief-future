/**
 * Plot slice — read-only signal tests.
 * Feature: 192-properties-panel-feature-edit
 * Spec: contracts/read-only-signal.md (Vitest cases section)
 *
 * All 7 cases from the contract:
 *   1. default is false / null
 *   2. setReadOnly(true, reason) → true + reason
 *   3. setReadOnly(false) → false + null
 *   4. saveSession ReadOnlyFilesystemError → true + reason from error
 *   5. saveSession Node EACCES → true + EACCES-derived reason
 *   6. successful save does NOT mutate isReadOnly
 *   7. setReadOnly(false, null) after a prior `true` resets cleanly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import { createSessionStore, type SessionStoreApi } from '../../index.js';
import { saveSession } from '../../../persistence/save.js';

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
}));

/**
 * Local stand-in for the `@debrief/stac-writer`/`apps/vscode/.../stacService.ts`
 * class. `saveSession` detects this error by `.name === 'ReadOnlyFilesystemError'`
 * (see `deriveReadOnlyReason` — cycle-free string check), so any Error whose
 * `name` field matches the canonical string triggers the same code path.
 *
 * We don't import the real class here because `@debrief/components` (its
 * transitive consumer) depends on this package — pulling the real one in
 * would form a workspace cycle. See `save.ts` for the longer-form note.
 */
class ReadOnlyFilesystemError extends Error {
  override readonly name = 'ReadOnlyFilesystemError' as const;
  readonly path: string;
  constructor(path: string, message: string) {
    super(message);
    this.path = path;
  }
}

describe('plot slice — isReadOnly', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('default is false (and readOnlyReason is null)', () => {
    const state = store.getState();
    expect(state.isReadOnly).toBe(false);
    expect(state.readOnlyReason).toBeNull();
  });

  it("setReadOnly(true, 'Storage location is not writable') → true + reason set", () => {
    store.getState().setReadOnly(true, 'Storage location is not writable');
    const state = store.getState();
    expect(state.isReadOnly).toBe(true);
    expect(state.readOnlyReason).toBe('Storage location is not writable');
  });

  it('setReadOnly(false) resets to false + null reason', () => {
    // First escalate
    store.getState().setReadOnly(true, 'some reason');
    expect(store.getState().isReadOnly).toBe(true);

    // Then reset (default-undefined reason → null)
    store.getState().setReadOnly(false);
    const state = store.getState();
    expect(state.isReadOnly).toBe(false);
    expect(state.readOnlyReason).toBeNull();
  });

  it('saveSession ReadOnlyFilesystemError → true + reason from error', async () => {
    store.getState().setSavePath('/some/read-only/path.debrief-session');
    const roError = new ReadOnlyFilesystemError(
      '/some/read-only/path.debrief-session',
      'Cannot write item.json — filesystem is read-only',
    );
    vi.mocked(fsPromises.writeFile).mockRejectedValueOnce(roError);

    const result = await saveSession(store);

    expect(result.success).toBe(false);
    const state = store.getState();
    expect(state.isReadOnly).toBe(true);
    expect(state.readOnlyReason).toContain('read-only');
  });

  it('saveSession EACCES Node error → true + EACCES-derived reason', async () => {
    store.getState().setSavePath('/some/eacces/path.debrief-session');
    const eaccesError: NodeJS.ErrnoException = Object.assign(
      new Error("EACCES: permission denied, open '/some/eacces/path.debrief-session'"),
      { code: 'EACCES' as const },
    );
    vi.mocked(fsPromises.writeFile).mockRejectedValueOnce(eaccesError);

    const result = await saveSession(store);

    expect(result.success).toBe(false);
    const state = store.getState();
    expect(state.isReadOnly).toBe(true);
    expect(state.readOnlyReason).not.toBeNull();
    // Reason should mention permissions / EACCES — exact phrasing owned by save.ts
    expect((state.readOnlyReason ?? '').toLowerCase()).toMatch(/permission|eacces|read-only/);
  });

  it('successful save leaves isReadOnly unchanged (only setReadOnly mutates it)', async () => {
    store.getState().setSavePath('/some/writable/path.debrief-session');
    vi.mocked(fsPromises.writeFile).mockResolvedValueOnce(undefined);

    const before = store.getState();
    expect(before.isReadOnly).toBe(false);

    const result = await saveSession(store);
    expect(result.success).toBe(true);

    const after = store.getState();
    // A successful save does NOT auto-reset; producers (host openPlot) reset.
    expect(after.isReadOnly).toBe(false);
    expect(after.readOnlyReason).toBeNull();
  });

  it('setReadOnly(false, null) after a prior true transition resets cleanly', () => {
    // Escalate
    store.getState().setReadOnly(true, 'fixture: was read-only');
    expect(store.getState().isReadOnly).toBe(true);
    expect(store.getState().readOnlyReason).toBe('fixture: was read-only');

    // Reset explicitly to false + null
    store.getState().setReadOnly(false, null);
    const state = store.getState();
    expect(state.isReadOnly).toBe(false);
    expect(state.readOnlyReason).toBeNull();
  });
});
