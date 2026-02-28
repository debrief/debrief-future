/**
 * useAutoRefresh hook unit tests.
 * Feature: 089-result-auto-refresh (E04)
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoRefresh } from './useAutoRefresh';
import type { AutoRefreshControllerLike, AutoRefreshState } from './useAutoRefresh';

// ─── Mock Controller ────────────────────────────────────────────────────

function createMockController(): AutoRefreshControllerLike & {
  _registrations: Map<string, { resultId: string; onRefresh: Function }>;
  _stateListeners: Map<string, Set<(state: AutoRefreshState) => void>>;
  _states: Map<string, AutoRefreshState>;
  _emitStateChange: (viewId: string, state: AutoRefreshState) => void;
} {
  const registrations = new Map<string, { resultId: string; onRefresh: Function }>();
  const stateListeners = new Map<string, Set<(state: AutoRefreshState) => void>>();
  const states = new Map<string, AutoRefreshState>();

  function makeState(viewId: string, resultId: string, patch: Partial<AutoRefreshState> = {}): AutoRefreshState {
    return {
      resultId,
      viewId,
      paused: false,
      stale: false,
      visible: true,
      lastRefreshTimestamp: null,
      pendingEvent: null,
      status: 'active',
      errorMessage: null,
      ...patch,
    };
  }

  const controller: any = {
    _registrations: registrations,
    _stateListeners: stateListeners,
    _states: states,

    register: vi.fn((viewId: string, resultId: string, onRefresh: Function) => {
      registrations.set(viewId, { resultId, onRefresh });
      states.set(viewId, makeState(viewId, resultId));
      return () => {
        registrations.delete(viewId);
        states.delete(viewId);
        stateListeners.delete(viewId);
      };
    }),

    pause: vi.fn((viewId: string) => {
      const state = states.get(viewId);
      if (state) {
        const newState: AutoRefreshState = { ...state, paused: true, status: 'paused' };
        states.set(viewId, newState);
        const listeners = stateListeners.get(viewId);
        if (listeners) {
          for (const cb of listeners) cb(newState);
        }
      }
    }),

    resume: vi.fn((viewId: string) => {
      const state = states.get(viewId);
      if (state) {
        const newState: AutoRefreshState = { ...state, paused: false, status: 'active', pendingEvent: null };
        states.set(viewId, newState);
        const listeners = stateListeners.get(viewId);
        if (listeners) {
          for (const cb of listeners) cb(newState);
        }
      }
    }),

    setVisible: vi.fn(),

    getState: vi.fn((viewId: string) => states.get(viewId)),

    onStateChange: vi.fn((viewId: string, callback: (state: AutoRefreshState) => void) => {
      if (!stateListeners.has(viewId)) {
        stateListeners.set(viewId, new Set());
      }
      stateListeners.get(viewId)!.add(callback);
      return () => {
        stateListeners.get(viewId)?.delete(callback);
      };
    }),

    dispose: vi.fn(),

    _emitStateChange(viewId: string, state: AutoRefreshState) {
      states.set(viewId, state);
      const listeners = stateListeners.get(viewId);
      if (listeners) {
        for (const cb of listeners) cb(state);
      }
    },
  };

  return controller;
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('useAutoRefresh', () => {
  describe('initialization', () => {
    it('returns default active state when no controller', () => {
      const { result } = renderHook(() =>
        useAutoRefresh(null, 'result-1', 'view-1', vi.fn())
      );

      expect(result.current.state.status).toBe('active');
      expect(result.current.state.paused).toBe(false);
      expect(result.current.hasPendingUpdate).toBe(false);
    });

    it('registers with controller on mount', () => {
      const controller = createMockController();
      const onRefresh = vi.fn();

      renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', onRefresh)
      );

      expect(controller.register).toHaveBeenCalledWith(
        'view-1',
        'result-1',
        expect.any(Function)
      );
    });

    it('unregisters from controller on unmount', () => {
      const controller = createMockController();
      const { unmount } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      expect(controller._registrations.has('view-1')).toBe(true);
      unmount();
      expect(controller._registrations.has('view-1')).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('pauses when active', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      act(() => {
        result.current.toggle();
      });

      expect(controller.pause).toHaveBeenCalledWith('view-1');
      expect(result.current.state.paused).toBe(true);
    });

    it('resumes when paused', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      act(() => {
        result.current.toggle();
      });
      expect(result.current.state.paused).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(controller.resume).toHaveBeenCalledWith('view-1');
      expect(result.current.state.paused).toBe(false);
    });
  });

  describe('hasPendingUpdate', () => {
    it('is false when no pending event and not stale', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      expect(result.current.hasPendingUpdate).toBe(false);
    });

    it('is true when state has pendingEvent', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      act(() => {
        controller._emitStateChange('view-1', {
          ...result.current.state,
          paused: true,
          pendingEvent: {
            resultId: 'result-1',
            previousPath: '/old.json',
            newPath: '/new.json',
            previousVersion: 1,
            newVersion: 2,
          },
        });
      });

      expect(result.current.hasPendingUpdate).toBe(true);
    });

    it('is true when state is stale', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      act(() => {
        controller._emitStateChange('view-1', {
          ...result.current.state,
          stale: true,
        });
      });

      expect(result.current.hasPendingUpdate).toBe(true);
    });
  });

  describe('pause and resume', () => {
    it('calls controller.pause with viewId', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      act(() => {
        result.current.pause();
      });

      expect(controller.pause).toHaveBeenCalledWith('view-1');
    });

    it('calls controller.resume with viewId', () => {
      const controller = createMockController();
      const { result } = renderHook(() =>
        useAutoRefresh(controller, 'result-1', 'view-1', vi.fn())
      );

      act(() => {
        result.current.resume();
      });

      expect(controller.resume).toHaveBeenCalledWith('view-1');
    });
  });
});
