/**
 * Unit tests for browser filter state slice (#132).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';

describe('BrowserFilter Slice', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('default state', () => {
    it('should have null metadataFilteredIds by default', () => {
      expect(store.getState().metadataFilteredIds).toBeNull();
    });

    it('should have null metadataExpression by default', () => {
      expect(store.getState().metadataExpression).toBeNull();
    });

    it('should have spatialFilterActive false by default', () => {
      expect(store.getState().spatialFilterActive).toBe(false);
    });

    it('should have temporalFilterActive false by default', () => {
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });

  describe('setMetadataFilteredIds', () => {
    it('should set metadata filtered IDs', () => {
      const ids = new Set(['ex-001', 'ex-002']);
      store.getState().setMetadataFilteredIds(ids);
      expect(store.getState().metadataFilteredIds).toEqual(ids);
    });

    it('should clear metadata filtered IDs with null', () => {
      store.getState().setMetadataFilteredIds(new Set(['ex-001']));
      store.getState().setMetadataFilteredIds(null);
      expect(store.getState().metadataFilteredIds).toBeNull();
    });
  });

  describe('setMetadataExpression', () => {
    it('should set metadata expression', () => {
      const expr = {
        predicates: [{ type: 'vessel-class', value: 'submarine' }],
        orGroups: [],
      };
      store.getState().setMetadataExpression(expr);
      expect(store.getState().metadataExpression).toEqual(expr);
    });

    it('should clear metadata expression with null', () => {
      store.getState().setMetadataExpression({
        predicates: [{ type: 'tag', value: 'exercise' }],
        orGroups: [],
      });
      store.getState().setMetadataExpression(null);
      expect(store.getState().metadataExpression).toBeNull();
    });
  });

  describe('setSpatialFilterActive', () => {
    it('should enable spatial filtering', () => {
      store.getState().setSpatialFilterActive(true);
      expect(store.getState().spatialFilterActive).toBe(true);
    });

    it('should disable spatial filtering', () => {
      store.getState().setSpatialFilterActive(true);
      store.getState().setSpatialFilterActive(false);
      expect(store.getState().spatialFilterActive).toBe(false);
    });
  });

  describe('setTemporalFilterActive', () => {
    it('should enable temporal filtering', () => {
      store.getState().setTemporalFilterActive(true);
      expect(store.getState().temporalFilterActive).toBe(true);
    });

    it('should disable temporal filtering', () => {
      store.getState().setTemporalFilterActive(true);
      store.getState().setTemporalFilterActive(false);
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });

  describe('clearAllBrowserFilters', () => {
    it('should reset all browser filter state to defaults', () => {
      // Set everything
      store.getState().setMetadataFilteredIds(new Set(['ex-001']));
      store.getState().setMetadataExpression({
        predicates: [{ type: 'tag', value: 'exercise' }],
        orGroups: [],
      });
      store.getState().setSpatialFilterActive(true);
      store.getState().setTemporalFilterActive(true);

      // Clear all
      store.getState().clearAllBrowserFilters();

      expect(store.getState().metadataFilteredIds).toBeNull();
      expect(store.getState().metadataExpression).toBeNull();
      expect(store.getState().spatialFilterActive).toBe(false);
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });

  describe('store reset', () => {
    it('should reset browser filter state on global reset', () => {
      store.getState().setSpatialFilterActive(true);
      store.getState().setTemporalFilterActive(true);
      store.getState().setMetadataFilteredIds(new Set(['ex-001']));

      store.getState().reset();

      expect(store.getState().metadataFilteredIds).toBeNull();
      expect(store.getState().spatialFilterActive).toBe(false);
      expect(store.getState().temporalFilterActive).toBe(false);
    });
  });
});
