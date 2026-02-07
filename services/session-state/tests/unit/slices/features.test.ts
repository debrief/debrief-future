/**
 * Unit tests for features state slice.
 * Feature: 024-document-session-state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';

describe('Features Slice', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('default state', () => {
    it('should have null featureCollectionUri by default', () => {
      expect(store.getState().featureCollectionUri).toBeNull();
    });

    it('should have empty selection by default', () => {
      expect(store.getState().selection.featureIds).toEqual([]);
      expect(store.getState().selection.primary).toBeNull();
    });

    it('should have empty hiddenFeatureIds by default', () => {
      expect(store.getState().hiddenFeatureIds).toEqual([]);
    });
  });

  describe('setFeatureCollectionUri (FR-016)', () => {
    it('should set feature collection URI', () => {
      const uri = 'stac://local/plots/exercise-alpha/features.geojson';
      store.getState().setFeatureCollectionUri(uri);
      expect(store.getState().featureCollectionUri).toBe(uri);
    });

    it('should allow null URI', () => {
      store.getState().setFeatureCollectionUri('some-uri');
      store.getState().setFeatureCollectionUri(null);
      expect(store.getState().featureCollectionUri).toBeNull();
    });
  });

  describe('setSelection (FR-017)', () => {
    it('should set selection with feature IDs', () => {
      store.getState().setSelection(['track-001', 'track-002']);
      const selection = store.getState().selection;
      expect(selection.featureIds).toEqual(['track-001', 'track-002']);
    });

    it('should auto-select first feature as primary', () => {
      store.getState().setSelection(['track-001', 'track-002']);
      expect(store.getState().selection.primary).toBe('track-001');
    });

    it('should allow explicit primary', () => {
      store.getState().setSelection(['track-001', 'track-002'], 'track-002');
      expect(store.getState().selection.primary).toBe('track-002');
    });

    it('should set timestamp', () => {
      const before = Date.now();
      store.getState().setSelection(['track-001']);
      const after = Date.now();
      const timestamp = store.getState().selection.timestamp.epoch;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('clearSelection', () => {
    it('should clear selection', () => {
      store.getState().setSelection(['track-001', 'track-002']);
      store.getState().clearSelection();
      expect(store.getState().selection.featureIds).toEqual([]);
      expect(store.getState().selection.primary).toBeNull();
    });
  });

  describe('addToSelection', () => {
    it('should add features to existing selection', () => {
      store.getState().setSelection(['track-001']);
      store.getState().addToSelection(['track-002', 'track-003']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001',
        'track-002',
        'track-003',
      ]);
    });

    it('should not duplicate existing features', () => {
      store.getState().setSelection(['track-001', 'track-002']);
      store.getState().addToSelection(['track-002', 'track-003']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001',
        'track-002',
        'track-003',
      ]);
    });

    it('should preserve existing primary', () => {
      store.getState().setSelection(['track-001'], 'track-001');
      store.getState().addToSelection(['track-002']);
      expect(store.getState().selection.primary).toBe('track-001');
    });
  });

  describe('removeFromSelection', () => {
    it('should remove features from selection', () => {
      store.getState().setSelection(['track-001', 'track-002', 'track-003']);
      store.getState().removeFromSelection(['track-002']);
      expect(store.getState().selection.featureIds).toEqual(['track-001', 'track-003']);
    });

    it('should update primary if removed', () => {
      store.getState().setSelection(['track-001', 'track-002'], 'track-001');
      store.getState().removeFromSelection(['track-001']);
      expect(store.getState().selection.primary).toBe('track-002');
    });

    it('should set primary to null if all removed', () => {
      store.getState().setSelection(['track-001']);
      store.getState().removeFromSelection(['track-001']);
      expect(store.getState().selection.primary).toBeNull();
    });
  });

  describe('setHiddenFeatures (FR-018)', () => {
    it('should set hidden features', () => {
      store.getState().setHiddenFeatures(['track-003', 'track-004']);
      expect(store.getState().hiddenFeatureIds).toEqual(['track-003', 'track-004']);
    });
  });

  describe('hideFeatures', () => {
    it('should add features to hidden set', () => {
      store.getState().setHiddenFeatures(['track-001']);
      store.getState().hideFeatures(['track-002', 'track-003']);
      expect(store.getState().hiddenFeatureIds).toEqual([
        'track-001',
        'track-002',
        'track-003',
      ]);
    });

    it('should not duplicate existing hidden features', () => {
      store.getState().setHiddenFeatures(['track-001', 'track-002']);
      store.getState().hideFeatures(['track-002', 'track-003']);
      expect(store.getState().hiddenFeatureIds).toEqual([
        'track-001',
        'track-002',
        'track-003',
      ]);
    });
  });

  describe('showFeatures', () => {
    it('should remove features from hidden set', () => {
      store.getState().setHiddenFeatures(['track-001', 'track-002', 'track-003']);
      store.getState().showFeatures(['track-002']);
      expect(store.getState().hiddenFeatureIds).toEqual(['track-001', 'track-003']);
    });
  });

  describe('toggleFeatureVisibility (FR-019)', () => {
    it('should hide visible feature', () => {
      store.getState().setHiddenFeatures([]);
      store.getState().toggleFeatureVisibility('track-001');
      expect(store.getState().hiddenFeatureIds).toContain('track-001');
    });

    it('should show hidden feature', () => {
      store.getState().setHiddenFeatures(['track-001']);
      store.getState().toggleFeatureVisibility('track-001');
      expect(store.getState().hiddenFeatureIds).not.toContain('track-001');
    });
  });
});
