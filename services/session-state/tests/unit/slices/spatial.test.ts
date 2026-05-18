/**
 * Unit tests for spatial state slice.
 * Feature: 024-document-session-state
 * Updated: 203-spatial-types-linkml (object-form Coordinate, canonical ViewportPolygon).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';
import type { ViewportPolygon } from '@debrief/schemas';

describe('Spatial Slice', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('default state', () => {
    it('should have null viewport by default', () => {
      expect(store.getState().viewport).toBeNull();
    });

    it('should have rotation of 0 by default', () => {
      expect(store.getState().rotation).toBe(0);
    });
  });

  describe('setViewport (FR-012)', () => {
    it('should set valid viewport', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -5, latitude: 55 }, // NW
          { longitude: 5, latitude: 55 }, // NE
          { longitude: 5, latitude: 50 }, // SE
          { longitude: -5, latitude: 50 }, // SW
        ],
      };
      store.getState().setViewport(viewport);
      expect(store.getState().viewport).toEqual(viewport);
    });

    it('should allow null viewport', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -5, latitude: 55 },
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      store.getState().setViewport(viewport);
      store.getState().setViewport(null);
      expect(store.getState().viewport).toBeNull();
    });

    it('should reject viewport with invalid longitude > 180', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: 181, latitude: 55 }, // Invalid longitude
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should reject viewport with invalid longitude < -180', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -181, latitude: 55 }, // Invalid longitude
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should reject viewport with invalid latitude > 90', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -5, latitude: 91 }, // Invalid latitude
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should reject viewport with invalid latitude < -90', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -5, latitude: -91 }, // Invalid latitude
          { longitude: 5, latitude: 55 },
          { longitude: 5, latitude: 50 },
          { longitude: -5, latitude: 50 },
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should accept viewport at boundary values', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -180, latitude: 90 }, // Max boundaries
          { longitude: 180, latitude: 90 },
          { longitude: 180, latitude: -90 },
          { longitude: -180, latitude: -90 },
        ],
      };
      store.getState().setViewport(viewport);
      expect(store.getState().viewport).toEqual(viewport);
    });
  });

  describe('setRotation (FR-013)', () => {
    it('should set rotation', () => {
      store.getState().setRotation(45);
      expect(store.getState().rotation).toBe(45);
    });

    it('should normalize rotation to [0, 360)', () => {
      store.getState().setRotation(360);
      expect(store.getState().rotation).toBe(0);
    });

    it('should normalize negative rotation', () => {
      store.getState().setRotation(-90);
      expect(store.getState().rotation).toBe(270);
    });

    it('should handle rotation > 360', () => {
      store.getState().setRotation(450);
      expect(store.getState().rotation).toBe(90);
    });
  });

  describe('getCenter', () => {
    it('should return null when viewport is null', () => {
      expect(store.getState().getCenter()).toBeNull();
    });

    it('should calculate center of viewport', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: -10, latitude: 60 }, // NW
          { longitude: 10, latitude: 60 }, // NE
          { longitude: 10, latitude: 40 }, // SE
          { longitude: -10, latitude: 40 }, // SW
        ],
      };
      store.getState().setViewport(viewport);
      const center = store.getState().getCenter();
      expect(center).toEqual({ longitude: 0, latitude: 50 });
    });

    it('should calculate center of asymmetric viewport', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          { longitude: 0, latitude: 10 }, // NW
          { longitude: 20, latitude: 10 }, // NE
          { longitude: 20, latitude: 0 }, // SE
          { longitude: 0, latitude: 0 }, // SW
        ],
      };
      store.getState().setViewport(viewport);
      const center = store.getState().getCenter();
      expect(center).toEqual({ longitude: 10, latitude: 5 });
    });
  });

  describe('drawingMode (FR-093)', () => {
    it('should have null drawingMode by default (T004)', () => {
      expect(store.getState().drawingMode).toBeNull();
    });

    it('should set drawingMode value (T004)', () => {
      store.getState().setDrawingMode('rectangle');
      expect(store.getState().drawingMode).toBe('rectangle');

      store.getState().setDrawingMode('polygon');
      expect(store.getState().drawingMode).toBe('polygon');

      store.getState().setDrawingMode(null);
      expect(store.getState().drawingMode).toBeNull();
    });

    it('should not create undo history when drawingMode changes (T005)', () => {
      const initialCanUndo = store.getState().canUndo();
      expect(initialCanUndo).toBe(false);

      store.getState().setDrawingMode('point');
      expect(store.getState().drawingMode).toBe('point');
      expect(store.getState().canUndo()).toBe(false);

      store.getState().setDrawingMode('polyline');
      expect(store.getState().drawingMode).toBe('polyline');
      expect(store.getState().canUndo()).toBe(false);
    });

    it('should reset drawingMode to null on store.reset() (T007)', () => {
      store.getState().setDrawingMode('rectangle');
      expect(store.getState().drawingMode).toBe('rectangle');

      store.getState().reset();
      expect(store.getState().drawingMode).toBeNull();
    });
  });

  // Spec 260 — viewport lock (FR-001, FR-006, FR-011, FR-012).
  describe('viewportLocked (spec 260)', () => {
    it('should default to false', () => {
      expect(store.getState().viewportLocked).toBe(false);
    });

    it('should flip true on setViewportLocked(true)', () => {
      store.getState().setViewportLocked(true);
      expect(store.getState().viewportLocked).toBe(true);
    });

    it('should flip back to false on setViewportLocked(false)', () => {
      store.getState().setViewportLocked(true);
      store.getState().setViewportLocked(false);
      expect(store.getState().viewportLocked).toBe(false);
    });

    it('should be idempotent — setting same value is a no-op', () => {
      store.getState().setViewportLocked(false);
      expect(store.getState().viewportLocked).toBe(false);
      store.getState().setViewportLocked(true);
      store.getState().setViewportLocked(true);
      expect(store.getState().viewportLocked).toBe(true);
    });

    it('should reset to false on store.reset()', () => {
      store.getState().setViewportLocked(true);
      expect(store.getState().viewportLocked).toBe(true);
      store.getState().reset();
      expect(store.getState().viewportLocked).toBe(false);
    });
  });
});
