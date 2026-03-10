/**
 * Unit tests for BrowserFilterSlice.
 * Feature: 132-three-view-sync (T035)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';

describe('BrowserFilterSlice', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('defaults', () => {
    it('has null metadataFilteredIds by default', () => {
      expect(store.getState().metadataFilteredIds).toBeNull();
    });

    it('has null metadataExpression by default', () => {
      expect(store.getState().metadataExpression).toBeNull();
    });

    it('has spatialFilterActive false by default', () => {
      expect(store.getState().spatialFilterActive).toBe(false);
    });

    it('has temporalFilterActive false by default', () => {
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });

  describe('setMetadataFilteredIds', () => {
    it('sets a non-null set of IDs', () => {
      const ids = new Set(['ex-1', 'ex-2', 'ex-3']);
      store.getState().setMetadataFilteredIds(ids);
      expect(store.getState().metadataFilteredIds).toBe(ids);
    });

    it('clears with null', () => {
      store.getState().setMetadataFilteredIds(new Set(['ex-1']));
      store.getState().setMetadataFilteredIds(null);
      expect(store.getState().metadataFilteredIds).toBeNull();
    });

    it('accepts empty set (zero matches)', () => {
      const ids = new Set<string>();
      store.getState().setMetadataFilteredIds(ids);
      expect(store.getState().metadataFilteredIds).toBe(ids);
      expect(store.getState().metadataFilteredIds!.size).toBe(0);
    });
  });

  describe('setMetadataExpression', () => {
    it('sets an expression', () => {
      const expr = { predicates: [{ type: 'vessel-class', value: 'Submarine' }], orGroups: [] };
      store.getState().setMetadataExpression(expr);
      expect(store.getState().metadataExpression).toBe(expr);
    });

    it('clears with null', () => {
      store.getState().setMetadataExpression({ predicates: [], orGroups: [] });
      store.getState().setMetadataExpression(null);
      expect(store.getState().metadataExpression).toBeNull();
    });
  });

  describe('setSpatialFilterActive', () => {
    it('activates spatial filter', () => {
      store.getState().setSpatialFilterActive(true);
      expect(store.getState().spatialFilterActive).toBe(true);
    });

    it('deactivates spatial filter', () => {
      store.getState().setSpatialFilterActive(true);
      store.getState().setSpatialFilterActive(false);
      expect(store.getState().spatialFilterActive).toBe(false);
    });
  });

  describe('setTemporalFilterActive', () => {
    it('activates temporal filter', () => {
      store.getState().setTemporalFilterActive(true);
      expect(store.getState().temporalFilterActive).toBe(true);
    });

    it('deactivates temporal filter', () => {
      store.getState().setTemporalFilterActive(true);
      store.getState().setTemporalFilterActive(false);
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });

  describe('clearAllBrowserFilters', () => {
    it('resets all browser filter state to defaults', () => {
      // Activate all filters
      store.getState().setMetadataFilteredIds(new Set(['ex-1']));
      store.getState().setMetadataExpression({ predicates: [], orGroups: [] });
      store.getState().setSpatialFilterActive(true);
      store.getState().setTemporalFilterActive(true);

      // Clear all
      store.getState().clearAllBrowserFilters();

      expect(store.getState().metadataFilteredIds).toBeNull();
      expect(store.getState().metadataExpression).toBeNull();
      expect(store.getState().spatialFilterActive).toBe(false);
      expect(store.getState().temporalFilterActive).toBe(false);
    });

    it('does not affect other slices', () => {
      store.getState().setCurrentTime(1000);
      store.getState().setSpatialFilterActive(true);
      store.getState().clearAllBrowserFilters();

      // Temporal state should be unaffected
      expect(store.getState().currentTime).toBe(1000);
    });
  });

  describe('reset', () => {
    it('clears browser filter state on global reset', () => {
      store.getState().setMetadataFilteredIds(new Set(['ex-1']));
      store.getState().setSpatialFilterActive(true);
      store.getState().setTemporalFilterActive(true);

      store.getState().reset();

      expect(store.getState().metadataFilteredIds).toBeNull();
      expect(store.getState().spatialFilterActive).toBe(false);
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });
});
