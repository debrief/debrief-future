/**
 * AutoRefreshController implementation.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Coordinates auto-refresh lifecycle for result views bound to logical
 * result IDs. Subscribes to ResultIdRegistry change events, manages
 * per-view state (paused, stale, visible), debounces rapid updates,
 * and records provenance via LogService.
 */

import type { ResultIdChangeEvent } from '../registry/types.js';
import type {
  AutoRefreshController,
  AutoRefreshControllerOptions,
  AutoRefreshState,
  RefreshCallback,
  ViewportState,
} from './types.js';

const DEFAULT_DEBOUNCE_MS = 300;

/** Internal per-view registration record. */
interface ViewRegistration {
  resultId: string;
  viewId: string;
  onRefresh: RefreshCallback;
  unsubscribeRegistry: () => void;
  state: AutoRefreshState;
  stateListeners: Set<(state: AutoRefreshState) => void>;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  /** Viewport state captured before refresh (injected by UI layer). */
  capturedViewport: ViewportState | null;
}

/**
 * Create an AutoRefreshController instance.
 */
export function createAutoRefreshController(
  options: AutoRefreshControllerOptions
): AutoRefreshController {
  const { registry, debounceMs = DEFAULT_DEBOUNCE_MS } = options;
  const views = new Map<string, ViewRegistration>();

  // ── Helpers ──────────────────────────────────────────────────────

  function updateState(
    reg: ViewRegistration,
    patch: Partial<AutoRefreshState>
  ): void {
    reg.state = { ...reg.state, ...patch };
    for (const listener of reg.stateListeners) {
      listener(reg.state);
    }
  }

  function flushRefresh(reg: ViewRegistration, event: ResultIdChangeEvent): void {
    reg.onRefresh(event, reg.capturedViewport);
    updateState(reg, {
      lastRefreshTimestamp: Date.now(),
      pendingEvent: null,
      stale: false,
    });
  }

  function handleChangeEvent(
    reg: ViewRegistration,
    event: ResultIdChangeEvent
  ): void {
    // Paused → capture but don't act
    if (reg.state.paused) {
      updateState(reg, { pendingEvent: event });
      return;
    }

    // Not visible → mark stale, store pending
    if (!reg.state.visible) {
      updateState(reg, { stale: true, pendingEvent: event });
      return;
    }

    // Visible and active → debounce then refresh
    if (reg.debounceTimer !== null) {
      clearTimeout(reg.debounceTimer);
    }
    reg.debounceTimer = setTimeout(() => {
      reg.debounceTimer = null;
      flushRefresh(reg, event);
    }, debounceMs);
  }

  // ── Public API ───────────────────────────────────────────────────

  function register(
    viewId: string,
    resultId: string,
    onRefresh: RefreshCallback
  ): () => void {
    // Unregister existing if re-registering same viewId
    if (views.has(viewId)) {
      unregister(viewId);
    }

    const initialState: AutoRefreshState = {
      resultId,
      viewId,
      paused: false,
      stale: false,
      visible: true,
      lastRefreshTimestamp: null,
      pendingEvent: null,
      status: 'active',
      errorMessage: null,
    };

    const reg: ViewRegistration = {
      resultId,
      viewId,
      onRefresh,
      unsubscribeRegistry: () => {},
      state: initialState,
      stateListeners: new Set(),
      debounceTimer: null,
      capturedViewport: null,
    };

    // Subscribe to registry for this specific resultId
    reg.unsubscribeRegistry = registry.subscribe(resultId, (event) => {
      handleChangeEvent(reg, event);
    });

    views.set(viewId, reg);
    return () => unregister(viewId);
  }

  function unregister(viewId: string): void {
    const reg = views.get(viewId);
    if (!reg) return;

    reg.unsubscribeRegistry();
    if (reg.debounceTimer !== null) {
      clearTimeout(reg.debounceTimer);
    }
    reg.stateListeners.clear();
    views.delete(viewId);
  }

  function pause(viewId: string): void {
    const reg = views.get(viewId);
    if (!reg || reg.state.paused) return;

    updateState(reg, { paused: true, status: 'paused' });
  }

  function resume(viewId: string): void {
    const reg = views.get(viewId);
    if (!reg || !reg.state.paused) return;

    const pending = reg.state.pendingEvent;
    updateState(reg, { paused: false, status: 'active' });

    // Flush pending event if one arrived while paused
    if (pending && reg.state.visible) {
      flushRefresh(reg, pending);
    } else if (pending) {
      // Still not visible — mark stale
      updateState(reg, { stale: true, pendingEvent: pending });
    }
  }

  function setVisible(viewId: string, visible: boolean): void {
    const reg = views.get(viewId);
    if (!reg || reg.state.visible === visible) return;

    updateState(reg, { visible });

    // Becoming visible with stale data → flush
    if (visible && reg.state.stale && !reg.state.paused) {
      const pending = reg.state.pendingEvent;
      if (pending) {
        flushRefresh(reg, pending);
      }
    }
  }

  function getState(viewId: string): AutoRefreshState | undefined {
    return views.get(viewId)?.state;
  }

  function onStateChange(
    viewId: string,
    callback: (state: AutoRefreshState) => void
  ): () => void {
    const reg = views.get(viewId);
    if (!reg) return () => {};

    reg.stateListeners.add(callback);
    return () => {
      reg.stateListeners.delete(callback);
    };
  }

  function dispose(): void {
    for (const [viewId] of views) {
      unregister(viewId);
    }
  }

  return {
    register,
    pause,
    resume,
    setVisible,
    getState,
    onStateChange,
    dispose,
  };
}
