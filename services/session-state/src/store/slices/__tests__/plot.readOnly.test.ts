/**
 * Plot slice — read-only signal tests.
 * Feature: 192-properties-panel-feature-edit
 * Updated: 261-session-state-systemstate — the `.debrief-session` sidecar
 *   `saveSession` was removed, so the three cases that asserted the read-only
 *   signal escalated from a *sidecar-write* EACCES/ReadOnlyFilesystemError are
 *   gone with it. The read-only signal itself (setReadOnly) is unchanged; it is
 *   now escalated by the host save path (the StacWriter / openPlot capability
 *   probe), exercised in the host tests. The remaining cases pin the plot
 *   slice's setReadOnly contract directly.
 *
 * Contract cases retained:
 *   1. default is false / null
 *   2. setReadOnly(true, reason) → true + reason
 *   3. setReadOnly(false) → false + null
 *   7. setReadOnly(false, null) after a prior `true` resets cleanly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../index.js';

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
