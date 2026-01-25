/**
 * Undo/Redo middleware tests.
 * Feature: 024-document-session-state
 * Phase 5: User Story 3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../src/store/index.js';

describe('Undo/Redo Middleware', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('basic undo/redo', () => {
    it('should undo a single change', () => {
      const state = store.getState();
      state.setPlaybackRate(2.0);
      expect(store.getState().playbackRate).toBe(2.0);

      store.getState().undo();
      expect(store.getState().playbackRate).toBe(1.0);
    });

    it('should redo an undone change', () => {
      const state = store.getState();
      state.setPlaybackRate(2.0);
      store.getState().undo();
      expect(store.getState().playbackRate).toBe(1.0);

      store.getState().redo();
      expect(store.getState().playbackRate).toBe(2.0);
    });

    it('should handle multiple undo operations', () => {
      const state = store.getState();
      state.setPlaybackRate(2.0);
      state.setPlaybackRate(3.0);
      state.setPlaybackRate(4.0);

      store.getState().undo();
      expect(store.getState().playbackRate).toBe(3.0);

      store.getState().undo();
      expect(store.getState().playbackRate).toBe(2.0);

      store.getState().undo();
      expect(store.getState().playbackRate).toBe(1.0);
    });

    it('should handle multiple redo operations', () => {
      const state = store.getState();
      state.setPlaybackRate(2.0);
      state.setPlaybackRate(3.0);
      state.setPlaybackRate(4.0);

      store.getState().undo();
      store.getState().undo();
      store.getState().undo();

      store.getState().redo();
      expect(store.getState().playbackRate).toBe(2.0);

      store.getState().redo();
      expect(store.getState().playbackRate).toBe(3.0);

      store.getState().redo();
      expect(store.getState().playbackRate).toBe(4.0);
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false for canUndo when no history', () => {
      expect(store.getState().canUndo()).toBe(false);
    });

    it('should return true for canUndo after a change', () => {
      store.getState().setPlaybackRate(2.0);
      expect(store.getState().canUndo()).toBe(true);
    });

    it('should return false for canRedo when no future', () => {
      expect(store.getState().canRedo()).toBe(false);
    });

    it('should return true for canRedo after an undo', () => {
      store.getState().setPlaybackRate(2.0);
      store.getState().undo();
      expect(store.getState().canRedo()).toBe(true);
    });

    it('should return false for canRedo after a new change following undo', () => {
      store.getState().setPlaybackRate(2.0);
      store.getState().undo();
      store.getState().setPlaybackRate(3.0);
      expect(store.getState().canRedo()).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('should clear all undo history', () => {
      store.getState().setPlaybackRate(2.0);
      store.getState().setPlaybackRate(3.0);
      expect(store.getState().canUndo()).toBe(true);

      store.getState().clearHistory();
      expect(store.getState().canUndo()).toBe(false);
    });

    it('should clear all redo history', () => {
      store.getState().setPlaybackRate(2.0);
      store.getState().undo();
      expect(store.getState().canRedo()).toBe(true);

      store.getState().clearHistory();
      expect(store.getState().canRedo()).toBe(false);
    });
  });

  describe('history limit', () => {
    it('should respect 50-step history limit', () => {
      // Make 60 changes
      for (let i = 1; i <= 60; i++) {
        store.getState().setPlaybackRate(i);
      }

      // Should be able to undo 50 times
      let undoCount = 0;
      while (store.getState().canUndo()) {
        store.getState().undo();
        undoCount++;
      }

      expect(undoCount).toBe(50);
    });
  });

  describe('ephemeral fields exclusion', () => {
    it('should not track playbackState changes in undo history', () => {
      const initialCanUndo = store.getState().canUndo();
      store.getState().setPlaybackState('playing');
      expect(store.getState().playbackState).toBe('playing');
      // Ephemeral fields should not create undo history
      expect(store.getState().canUndo()).toBe(initialCanUndo);
    });
  });

  describe('cross-slice undo', () => {
    it('should undo changes across different slices', () => {
      store.getState().setPlaybackRate(2.0);
      store.getState().setRotation(45);
      store.getState().setSelection(['feature-1'], 'feature-1');

      expect(store.getState().playbackRate).toBe(2.0);
      expect(store.getState().rotation).toBe(45);
      expect(store.getState().selection.featureIds).toEqual(['feature-1']);

      // Undo selection
      store.getState().undo();
      expect(store.getState().selection.featureIds).toEqual([]);

      // Undo rotation
      store.getState().undo();
      expect(store.getState().rotation).toBe(0);

      // Undo playback rate
      store.getState().undo();
      expect(store.getState().playbackRate).toBe(1.0);
    });
  });
});
