/**
 * Unit tests for SC-005 (#108) — drawing-mode and palette-index are
 * observable by non-map consumers via the standard Zustand subscribe API.
 *
 * These tests do not exercise the map component at all; they prove the
 * slice is the single source of truth and that any consumer with a handle
 * to the store can observe and mutate drawing state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';

describe('Spatial slice — drawing-state observability (#108 / SC-005)', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  it('drawing mode is observable by external subscribers', () => {
    const observed: (string | null)[] = [];
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.drawingMode !== prev.drawingMode) {
        observed.push(state.drawingMode);
      }
    });

    store.getState().setDrawingMode('polygon');
    store.getState().setDrawingMode('rectangle');
    store.getState().setDrawingMode(null);

    unsubscribe();

    expect(observed).toEqual(['polygon', 'rectangle', null]);
  });

  it('drawing mode subscriber fires exactly once per change', () => {
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.drawingMode !== prev.drawingMode) {
        subscriber(state.drawingMode);
      }
    });

    store.getState().setDrawingMode('point');
    store.getState().setDrawingMode('point'); // same value — subscriber should not fire
    store.getState().setDrawingMode(null);

    unsubscribe();

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenNthCalledWith(1, 'point');
    expect(subscriber).toHaveBeenNthCalledWith(2, null);
  });

  it('drawing palette index is observable by external subscribers', () => {
    const observed: number[] = [];
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.drawingPaletteIndex !== prev.drawingPaletteIndex) {
        observed.push(state.drawingPaletteIndex);
      }
    });

    store.getState().incrementDrawingPaletteIndex();
    store.getState().incrementDrawingPaletteIndex();
    store.getState().incrementDrawingPaletteIndex();

    unsubscribe();

    expect(observed).toEqual([1, 2, 3]);
  });

  it('the same store snapshot exposes drawing state to any reader (read-side observability)', () => {
    // A "non-map consumer" simulated as a second handle to the same store.
    store.getState().setDrawingMode('polyline');
    store.getState().incrementDrawingPaletteIndex();

    const nonMapReader = store.getState;
    expect(nonMapReader().drawingMode).toBe('polyline');
    expect(nonMapReader().drawingPaletteIndex).toBe(1);
  });
});
