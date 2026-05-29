/**
 * Dirty tracking tests.
 * Feature: 024-document-session-state
 * Updated: 261-session-state-systemstate (FR-019/FR-021).
 *
 * Contract (261): view-state changes are exploration and MUST NOT mark the plot
 * dirty (FR-019); only substantive content edits set the dirty flag, via the
 * Log Service `markDirty()` (FR-021). An explicit save still persists the
 * current view regardless of the dirty flag (FR-020 — host concern).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../src/store/index.js';
import { subscribeToDirty } from '../../src/store/subscriptions.js';
import { hasUnsavedChangesSelector } from '../../src/store/middleware/selector.js';

describe('Dirty Tracking', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('basic dirty state', () => {
    it('should start clean', () => {
      expect(store.getState().dirty).toBe(false);
    });

    it('markDirty() (content-edit mechanism) marks the plot dirty (FR-021)', () => {
      store.getState().markDirty();
      expect(store.getState().dirty).toBe(true);
    });

    it('should become clean after markClean', () => {
      store.getState().markDirty();
      expect(store.getState().dirty).toBe(true);
      store.getState().markClean();
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('view-state changes are exploration (FR-019)', () => {
    it('setPlaybackRate does NOT mark dirty', () => {
      store.getState().setPlaybackRate(2.0);
      expect(store.getState().dirty).toBe(false);
    });

    it('setRotation does NOT mark dirty', () => {
      store.getState().setRotation(45);
      expect(store.getState().dirty).toBe(false);
    });

    it('setSelection does NOT mark dirty', () => {
      store.getState().setSelection(['f1'], 'f1');
      expect(store.getState().dirty).toBe(false);
    });

    it('setHiddenFeatures (hide/reveal) does NOT mark dirty', () => {
      store.getState().setHiddenFeatures(['f1']);
      expect(store.getState().dirty).toBe(false);
    });

    it('setCurrentTime / setTimeRange / setTimeFilter / setStepSize / setDisplayMode do NOT mark dirty', () => {
      const s = store.getState();
      s.setCurrentTime(Date.now());
      s.setTimeRange({ start: 0, end: 1000 });
      s.setTimeFilter({ start: 100, end: 900 });
      s.setStepSize({ value: 5, unit: 'minute' });
      s.setDisplayMode('trail');
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('ephemeral fields', () => {
    it('should NOT become dirty for playbackState changes', () => {
      store.getState().setPlaybackState('playing');
      expect(store.getState().dirty).toBe(false);
    });

    it('should remain clean when only ephemeral fields change', () => {
      store.getState().markClean();
      store.getState().setPlaybackState('playing');
      store.getState().setPlaybackState('paused');
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('subscribeToDirty', () => {
    it('should notify on dirty state changes', () => {
      const callbacks: boolean[] = [];
      const unsubscribe = subscribeToDirty(store, (dirty) => {
        callbacks.push(dirty);
      });

      store.getState().markDirty();
      expect(callbacks).toContain(true);

      store.getState().markClean();
      expect(callbacks).toContain(false);

      unsubscribe();
    });

    it('should not notify for view-state-only changes (FR-019)', () => {
      const callbacks: boolean[] = [];
      const unsubscribe = subscribeToDirty(store, (dirty) => {
        callbacks.push(dirty);
      });

      store.getState().setPlaybackState('playing');
      store.getState().setRotation(30);
      store.getState().setSelection(['f1']);
      expect(callbacks.length).toBe(0);

      unsubscribe();
    });
  });

  describe('hasUnsavedChangesSelector', () => {
    it('should return false when clean', () => {
      const state = store.getState();
      expect(hasUnsavedChangesSelector(state)).toBe(false);
    });

    it('should return true after a content edit (markDirty)', () => {
      store.getState().markDirty();
      const state = store.getState();
      expect(hasUnsavedChangesSelector(state)).toBe(true);
    });
  });

  describe('reset behavior', () => {
    it('should be clean after reset', () => {
      store.getState().markDirty();
      expect(store.getState().dirty).toBe(true);

      store.getState().reset();
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('savePath interaction', () => {
    it('should track savePath independently', () => {
      store.getState().setSavePath('/path/to/session.json');
      expect(store.getState().savePath).toBe('/path/to/session.json');
    });
  });
});
