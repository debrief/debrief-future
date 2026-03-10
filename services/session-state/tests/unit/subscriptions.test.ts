/**
 * Unit tests for reactive subscriptions.
 * Feature: 024-document-session-state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSessionStore,
  type SessionStoreApi,
  subscribeToSlice,
  subscribeToTemporal,
  subscribeToSpatial,
  subscribeToFeatures,
  subscribeToDocument,
  subscribeToCurrentTime,
  subscribeToViewport,
  subscribeToSelection,
  subscribeToDirty,
  selectors,
  type ViewportPolygon,
} from '../../src/index.js';

describe('Reactive Subscriptions (FR-003)', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('subscribeToSlice', () => {
    it('should notify listener when selected state changes', () => {
      const listener = vi.fn();
      subscribeToSlice(store, selectors.currentTime, listener);

      store.getState().setCurrentTime(1706097600000);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1706097600000, null);
    });

    it('should not notify when unrelated state changes', () => {
      const listener = vi.fn();
      subscribeToSlice(store, selectors.currentTime, listener);

      // Change viewport, not currentTime
      const viewport: ViewportPolygon = {
        coordinates: [[-5, 55], [5, 55], [5, 50], [-5, 50]],
      };
      store.getState().setViewport(viewport);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should unsubscribe when calling returned function', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSlice(store, selectors.currentTime, listener);

      store.getState().setCurrentTime(1706097600000);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      store.getState().setCurrentTime(1706097700000);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support custom equality function', () => {
      const listener = vi.fn();
      // Always consider equal - should never notify
      const alwaysEqual = () => true;
      subscribeToSlice(store, selectors.currentTime, listener, alwaysEqual);

      store.getState().setCurrentTime(1706097600000);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToTemporal', () => {
    it('should notify on temporal slice changes', () => {
      const listener = vi.fn();
      subscribeToTemporal(store, listener);

      store.getState().setCurrentTime(1706097600000);

      expect(listener).toHaveBeenCalled();
      const [newState] = listener.mock.calls[0];
      expect(newState.currentTime).toBe(1706097600000);
    });
  });

  describe('subscribeToSpatial', () => {
    it('should notify on spatial slice changes', () => {
      const listener = vi.fn();
      subscribeToSpatial(store, listener);

      store.getState().setRotation(45);

      expect(listener).toHaveBeenCalled();
      const [newState] = listener.mock.calls[0];
      expect(newState.rotation).toBe(45);
    });
  });

  describe('subscribeToFeatures', () => {
    it('should notify on features slice changes', () => {
      const listener = vi.fn();
      subscribeToFeatures(store, listener);

      store.getState().setSelection(['track-001']);

      expect(listener).toHaveBeenCalled();
      const [newState] = listener.mock.calls[0];
      expect(newState.selection.featureIds).toContain('track-001');
    });
  });

  describe('subscribeToDocument', () => {
    it('should notify on document slice changes', () => {
      const listener = vi.fn();
      subscribeToDocument(store, listener);

      store.getState().markDirty();

      expect(listener).toHaveBeenCalled();
      const [newState] = listener.mock.calls[0];
      expect(newState.dirty).toBe(true);
    });
  });

  describe('subscribeToCurrentTime', () => {
    it('should notify only on currentTime changes', () => {
      const listener = vi.fn();
      subscribeToCurrentTime(store, listener);

      store.getState().setCurrentTime(1706097600000);

      expect(listener).toHaveBeenCalledWith(1706097600000, null);
    });
  });

  describe('subscribeToViewport', () => {
    it('should notify only on viewport changes', () => {
      const listener = vi.fn();
      subscribeToViewport(store, listener);

      const viewport: ViewportPolygon = {
        coordinates: [[-5, 55], [5, 55], [5, 50], [-5, 50]],
      };
      store.getState().setViewport(viewport);

      expect(listener).toHaveBeenCalledWith(viewport, null);
    });
  });

  describe('subscribeToSelection', () => {
    it('should notify only on selection changes', () => {
      const listener = vi.fn();
      subscribeToSelection(store, listener);

      store.getState().setSelection(['track-001', 'track-002']);

      expect(listener).toHaveBeenCalled();
      const [newSelection] = listener.mock.calls[0];
      expect(newSelection.featureIds).toEqual(['track-001', 'track-002']);
    });
  });

  describe('subscribeToDirty', () => {
    it('should notify only on dirty flag changes', () => {
      const listener = vi.fn();
      subscribeToDirty(store, listener);

      store.getState().markDirty();

      expect(listener).toHaveBeenCalledWith(true, false);
    });
  });

  describe('multiple subscriptions', () => {
    it('should support multiple independent subscriptions', () => {
      const timeListener = vi.fn();
      const viewportListener = vi.fn();

      subscribeToCurrentTime(store, timeListener);
      subscribeToViewport(store, viewportListener);

      store.getState().setCurrentTime(1706097600000);

      expect(timeListener).toHaveBeenCalledTimes(1);
      expect(viewportListener).not.toHaveBeenCalled();

      const viewport: ViewportPolygon = {
        coordinates: [[-5, 55], [5, 55], [5, 50], [-5, 50]],
      };
      store.getState().setViewport(viewport);

      expect(timeListener).toHaveBeenCalledTimes(1);
      expect(viewportListener).toHaveBeenCalledTimes(1);
    });
  });
});
