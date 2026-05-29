/**
 * Unit tests for selective subscriptions (SC-006).
 * Feature: 024-document-session-state
 *
 * Tests that state changes trigger updates only to subscribed components.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSessionStore,
  type SessionStoreApi,
  subscribeToCurrentTime,
  subscribeToViewport,
  subscribeToSelection,
  subscribeToDirty,
  createTimeInstant,
  type ViewportPolygon,
} from '../../src/index.js';

describe('Selective Subscriptions (SC-006)', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('state change isolation', () => {
    it('should not trigger unrelated subscriptions when temporal state changes', () => {
      const timeListener = vi.fn();
      const viewportListener = vi.fn();
      const selectionListener = vi.fn();
      const dirtyListener = vi.fn();

      subscribeToCurrentTime(store, timeListener);
      subscribeToViewport(store, viewportListener);
      subscribeToSelection(store, selectionListener);
      subscribeToDirty(store, dirtyListener);

      // Change only currentTime
      store.getState().setCurrentTime(createTimeInstant(Date.now()));

      expect(timeListener).toHaveBeenCalledTimes(1);
      expect(viewportListener).not.toHaveBeenCalled();
      expect(selectionListener).not.toHaveBeenCalled();
      // Feature 261 (FR-019): currentTime (playhead) is view-state exploration —
      // it does NOT mark the plot dirty, so the dirty listener is not called.
      expect(dirtyListener).not.toHaveBeenCalled();
    });

    it('should not trigger unrelated subscriptions when spatial state changes', () => {
      const timeListener = vi.fn();
      const viewportListener = vi.fn();
      const selectionListener = vi.fn();
      const dirtyListener = vi.fn();

      subscribeToCurrentTime(store, timeListener);
      subscribeToViewport(store, viewportListener);
      subscribeToSelection(store, selectionListener);
      subscribeToDirty(store, dirtyListener);

      // Change only viewport
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -5, latitude: 55 },
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      store.getState().setViewport(viewport);

      expect(timeListener).not.toHaveBeenCalled();
      expect(viewportListener).toHaveBeenCalledTimes(1);
      expect(selectionListener).not.toHaveBeenCalled();
      // Feature 261 (FR-019): viewport is view-state exploration — it does NOT
      // mark the plot dirty, so the dirty listener is not called.
      expect(dirtyListener).not.toHaveBeenCalled();
    });

    it('should not trigger unrelated subscriptions when features state changes', () => {
      const timeListener = vi.fn();
      const viewportListener = vi.fn();
      const selectionListener = vi.fn();
      const dirtyListener = vi.fn();

      subscribeToCurrentTime(store, timeListener);
      subscribeToViewport(store, viewportListener);
      subscribeToSelection(store, selectionListener);
      subscribeToDirty(store, dirtyListener);

      // Change only selection
      store.getState().setSelection(['track-001']);

      expect(timeListener).not.toHaveBeenCalled();
      expect(viewportListener).not.toHaveBeenCalled();
      expect(selectionListener).toHaveBeenCalledTimes(1);
      // Feature 261 (FR-019): selection is view-state exploration — it does NOT
      // mark the plot dirty, so the dirty listener is not called.
      expect(dirtyListener).not.toHaveBeenCalled();
    });

    it('should not trigger unrelated subscriptions when document state changes', () => {
      const timeListener = vi.fn();
      const viewportListener = vi.fn();
      const selectionListener = vi.fn();
      const dirtyListener = vi.fn();

      subscribeToCurrentTime(store, timeListener);
      subscribeToViewport(store, viewportListener);
      subscribeToSelection(store, selectionListener);
      subscribeToDirty(store, dirtyListener);

      // Change only dirty flag
      store.getState().markDirty();

      expect(timeListener).not.toHaveBeenCalled();
      expect(viewportListener).not.toHaveBeenCalled();
      expect(selectionListener).not.toHaveBeenCalled();
      expect(dirtyListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('batch changes', () => {
    it('should notify each subscription only once per relevant change', () => {
      const timeListener = vi.fn();
      const viewportListener = vi.fn();

      subscribeToCurrentTime(store, timeListener);
      subscribeToViewport(store, viewportListener);

      // Multiple changes in sequence
      store.getState().setCurrentTime(createTimeInstant(1000));
      store.getState().setCurrentTime(createTimeInstant(2000));
      store.getState().setCurrentTime(createTimeInstant(3000));

      // Each change should trigger the listener
      expect(timeListener).toHaveBeenCalledTimes(3);
      expect(viewportListener).not.toHaveBeenCalled();
    });
  });

  describe('no unnecessary re-renders', () => {
    it('should not notify when value is set to same value', () => {
      const time = createTimeInstant(1706097600000);
      store.getState().setCurrentTime(time);

      const listener = vi.fn();
      subscribeToCurrentTime(store, listener);

      // Set to the exact same time object
      store.getState().setCurrentTime(time);

      // Should not notify because the reference is the same
      // Note: This depends on Zustand's shallow equality check
      expect(listener).not.toHaveBeenCalled();
    });

    it('should not notify rotation listener when viewport changes', () => {
      const rotationListener = vi.fn();
      store.subscribe(
        (state) => state.rotation,
        rotationListener
      );

      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -5, latitude: 55 },
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      store.getState().setViewport(viewport);

      expect(rotationListener).not.toHaveBeenCalled();
    });
  });

  describe('derived state subscriptions', () => {
    it('should support subscription to derived values', () => {
      const hasSelectionListener = vi.fn();

      store.subscribe(
        (state) => state.selection.featureIds.length > 0,
        hasSelectionListener
      );

      // First selection - should trigger (false -> true)
      store.getState().setSelection(['track-001']);
      expect(hasSelectionListener).toHaveBeenCalledWith(true, false);

      // Add another - should NOT trigger (true -> true)
      hasSelectionListener.mockClear();
      store.getState().addToSelection(['track-002']);
      expect(hasSelectionListener).not.toHaveBeenCalled();

      // Clear - should trigger (true -> false)
      store.getState().clearSelection();
      expect(hasSelectionListener).toHaveBeenCalledWith(false, true);
    });
  });
});
