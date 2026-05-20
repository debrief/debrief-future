import { describe, it, expect, beforeEach } from 'vitest';
import { withHaltGuard, guardTween } from '../haltedState';
import { useBriefingStore } from '../../store';

beforeEach(() => {
  useBriefingStore.setState({ bootState: 'ready', haltedReason: null });
});

describe('withHaltGuard (T-FAILURE-MODES-ADAPTERS, T054)', () => {
  it('forwards regular method calls untouched', () => {
    const adapter = { ping: () => 'pong' };
    const guarded = withHaltGuard(adapter, 'TestAdapter');
    expect(guarded.ping()).toBe('pong');
    expect(useBriefingStore.getState().bootState).toBe('ready');
  });

  it('transitions the store to halted on a sync throw and names the adapter', () => {
    const adapter = {
      blowUp: () => {
        throw new Error('boom');
      },
    };
    const guarded = withHaltGuard(adapter, 'TestAdapter');
    expect(() => guarded.blowUp()).toThrow(/boom/);
    const state = useBriefingStore.getState();
    expect(state.bootState).toBe('halted');
    expect(state.haltedReason?.kind).toBe('adapter');
    if (state.haltedReason?.kind === 'adapter') {
      expect(state.haltedReason.adapter).toBe('TestAdapter');
      expect(state.haltedReason.message).toBe('boom');
    }
  });

  it('transitions the store to halted on an async throw', async () => {
    const adapter = {
      blowUpAsync: async () => {
        throw new Error('async boom');
      },
    };
    const guarded = withHaltGuard(adapter, 'AsyncAdapter');
    await expect(guarded.blowUpAsync()).rejects.toThrow(/async boom/);
    const state = useBriefingStore.getState();
    expect(state.bootState).toBe('halted');
    if (state.haltedReason?.kind === 'adapter') {
      expect(state.haltedReason.adapter).toBe('AsyncAdapter');
    }
  });

  it('does not blow up when reading non-function props', () => {
    const adapter = { name: 'x', op: () => 1 };
    const guarded = withHaltGuard(adapter, 'X');
    expect(guarded.name).toBe('x');
    expect(guarded.op()).toBe(1);
  });
});

describe('guardTween (T-FAILURE-MODES-TWEEN, T055)', () => {
  it('resolves silently when the tween Promise resolves', async () => {
    await guardTween(Promise.resolve({ ok: true }));
    expect(useBriefingStore.getState().bootState).toBe('ready');
  });

  it('transitions to halted on a tween rejection', async () => {
    await guardTween(Promise.reject(new Error('tween rejected')));
    const state = useBriefingStore.getState();
    expect(state.bootState).toBe('halted');
    expect(state.haltedReason?.kind).toBe('tween');
    if (state.haltedReason?.kind === 'tween') {
      expect(state.haltedReason.message).toMatch(/tween rejected/);
    }
  });

  it('does not re-throw on rejection — the SPA stays alive', async () => {
    // No throw expected.
    await guardTween(Promise.reject(new Error('boom')), 'Scene XYZ');
    const state = useBriefingStore.getState();
    if (state.haltedReason?.kind === 'tween') {
      expect(state.haltedReason.message).toContain('Scene XYZ');
    }
  });
});
