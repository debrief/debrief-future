/**
 * Unit tests for spatial state slice.
 * Feature: 024-document-session-state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';
import type { ViewportPolygon } from '../../../src/types/index.js';

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
          [-5, 55],   // NW
          [5, 55],    // NE
          [5, 50],    // SE
          [-5, 50],   // SW
        ],
      };
      store.getState().setViewport(viewport);
      expect(store.getState().viewport).toEqual(viewport);
    });

    it('should allow null viewport', () => {
      const viewport: ViewportPolygon = {
        coordinates: [[-5, 55], [5, 55], [5, 50], [-5, 50]],
      };
      store.getState().setViewport(viewport);
      store.getState().setViewport(null);
      expect(store.getState().viewport).toBeNull();
    });

    it('should reject viewport with invalid longitude > 180', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          [181, 55],  // Invalid longitude
          [5, 55],
          [5, 50],
          [-5, 50],
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should reject viewport with invalid longitude < -180', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          [-181, 55], // Invalid longitude
          [5, 55],
          [5, 50],
          [-5, 50],
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should reject viewport with invalid latitude > 90', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          [-5, 91],   // Invalid latitude
          [5, 55],
          [5, 50],
          [-5, 50],
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should reject viewport with invalid latitude < -90', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          [-5, -91],  // Invalid latitude
          [5, 55],
          [5, 50],
          [-5, 50],
        ],
      };
      expect(() => store.getState().setViewport(viewport)).toThrow();
    });

    it('should accept viewport at boundary values', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          [-180, 90],   // Max boundaries
          [180, 90],
          [180, -90],
          [-180, -90],
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
          [-10, 60],  // NW
          [10, 60],   // NE
          [10, 40],   // SE
          [-10, 40],  // SW
        ],
      };
      store.getState().setViewport(viewport);
      const center = store.getState().getCenter();
      expect(center).toEqual([0, 50]);
    });

    it('should calculate center of asymmetric viewport', () => {
      const viewport: ViewportPolygon = {
        coordinates: [
          [0, 10],   // NW
          [20, 10],  // NE
          [20, 0],   // SE
          [0, 0],    // SW
        ],
      };
      store.getState().setViewport(viewport);
      const center = store.getState().getCenter();
      expect(center).toEqual([10, 5]);
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
});
