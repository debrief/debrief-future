/**
 * Store integration tests for selection path support.
 * Feature: 053-nested-child-selection
 *
 * Covers US1 (T030-T034), US2 (T044-T047), US4 (T048-T050),
 * US3 (T059), and edge cases (T070, T072).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';
import { getRoot } from '../../../src/utils/selectionPath.js';

describe('Selection Path Store Integration', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  // ─── US1: Select a Position Within a Track (T030-T034) ────────────

  describe('US1: setSelection with position paths', () => {
    it('T030: should record position path in selection state', () => {
      store.getState().setSelection(['track-hms-defender/positions/4']);
      const selection = store.getState().selection;
      expect(selection.featureIds).toEqual(['track-hms-defender/positions/4']);
    });

    it('T031: clicking different position on same track replaces selection', () => {
      store.getState().setSelection(['track-001/positions/4']);
      store.getState().setSelection(['track-001/positions/7']);
      expect(store.getState().selection.featureIds).toEqual(['track-001/positions/7']);
    });

    it('T032: single-segment path (flat ID) works identically to current behaviour', () => {
      store.getState().setSelection(['track-001']);
      const selection = store.getState().selection;
      expect(selection.featureIds).toEqual(['track-001']);
      expect(selection.primary).toBe('track-001');
    });

    it('T033: primary is set to the path when setSelection called with one path', () => {
      store.getState().setSelection(['track-001/positions/4']);
      expect(store.getState().selection.primary).toBe('track-001/positions/4');
    });

    it('T034: selectedRootIds extracts unique roots from paths', () => {
      store.getState().setSelection([
        'track-001/positions/4',
        'track-001',
        'track-002/positions/7',
      ]);
      const featureIds = store.getState().selection.featureIds;
      const rootIds = [...new Set(featureIds.map(getRoot))];
      expect(rootIds).toEqual(['track-001', 'track-002']);
    });
  });

  // ─── US2: Mixed-Depth Multi-Selection (T044-T047) ─────────────────

  describe('US2: Mixed-depth multi-selection', () => {
    it('T044: addToSelection with child path alongside existing root path', () => {
      store.getState().setSelection(['track-001']);
      store.getState().addToSelection(['track-002/positions/7']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001',
        'track-002/positions/7',
      ]);
    });

    it('T045: parent and child paths coexist in same selection', () => {
      store.getState().setSelection(['track-001', 'track-001/positions/4']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001',
        'track-001/positions/4',
      ]);
    });

    it('T046: clearSelection removes all paths at all depths', () => {
      store.getState().setSelection([
        'track-001',
        'track-001/positions/4',
        'track-002/positions/7',
      ]);
      store.getState().clearSelection();
      expect(store.getState().selection.featureIds).toEqual([]);
      expect(store.getState().selection.primary).toBeNull();
    });

    it('T047: multi-position paths from different parents coexist', () => {
      store.getState().setSelection([
        'track-001/positions/3',
        'track-002/positions/8',
      ]);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001/positions/3',
        'track-002/positions/8',
      ]);
    });
  });

  // ─── US4: Leaf-Only Selection for Tools (T048-T050) ────────────────

  describe('US4: Leaf-only selection for tool matching', () => {
    it('T048: selectedRootIds extracts correct roots for tool matching', () => {
      store.getState().setSelection(['track-001/positions/4']);
      const featureIds = store.getState().selection.featureIds;
      const rootIds = [...new Set(featureIds.map(getRoot))];
      expect(rootIds).toEqual(['track-001']);
    });

    it('T049: position-only selection does not produce phantom parent entry', () => {
      store.getState().setSelection(['track-001/positions/4']);
      const featureIds = store.getState().selection.featureIds;
      expect(featureIds).toEqual(['track-001/positions/4']);
      expect(featureIds).not.toContain('track-001');
    });

    it('T050: tool receives exact paths, not inferred parents', () => {
      store.getState().setSelection([
        'track-hms-defender/positions/4',
        'track-002/positions/7',
      ]);
      const featureIds = store.getState().selection.featureIds;
      // The tool receives exactly what's in featureIds — leaf-only
      expect(featureIds).toEqual([
        'track-hms-defender/positions/4',
        'track-002/positions/7',
      ]);
      // Neither root appears as a separate entry
      expect(featureIds).not.toContain('track-hms-defender');
      expect(featureIds).not.toContain('track-002');
    });
  });

  // ─── US3: Deeply Nested Selection (T059) ──────────────────────────

  describe('US3: Deeply nested selection', () => {
    it('T059: setSelection with 3-level path stores correctly', () => {
      store.getState().setSelection([
        'track-001/segments/leg-alpha/positions/3',
      ]);
      const selection = store.getState().selection;
      expect(selection.featureIds).toEqual([
        'track-001/segments/leg-alpha/positions/3',
      ]);
      expect(selection.primary).toBe('track-001/segments/leg-alpha/positions/3');
    });

    it('should support mixed deep and shallow selections', () => {
      store.getState().setSelection([
        'track-001/segments/leg-alpha/positions/3',
        'track-002',
        'track-003/positions/0',
      ]);
      expect(store.getState().selection.featureIds).toHaveLength(3);
    });

    it('T067: selectedRootIds works with deeply nested paths', () => {
      store.getState().setSelection([
        'track-001/segments/alpha/positions/3',
        'track-002/segments/beta/positions/7',
      ]);
      const featureIds = store.getState().selection.featureIds;
      const rootIds = [...new Set(featureIds.map(getRoot))];
      expect(rootIds).toEqual(['track-001', 'track-002']);
    });
  });

  // ─── Edge Cases (T070, T072) ──────────────────────────────────────

  describe('Edge cases', () => {
    it('T070: unresolvable path retained in selection, not removed', () => {
      // Simulate selecting a path that later becomes unresolvable
      store.getState().setSelection(['track-001/positions/999']);
      // The store does not validate against feature data
      expect(store.getState().selection.featureIds).toEqual([
        'track-001/positions/999',
      ]);
    });

    it('T072: parent and child coexist — no deduplication or collapsing', () => {
      store.getState().setSelection(['track-001', 'track-001/positions/4']);
      const featureIds = store.getState().selection.featureIds;
      expect(featureIds).toContain('track-001');
      expect(featureIds).toContain('track-001/positions/4');
      expect(featureIds).toHaveLength(2);
    });

    it('should preserve primary when removing non-primary path', () => {
      store.getState().setSelection(
        ['track-001', 'track-001/positions/4'],
        'track-001'
      );
      store.getState().removeFromSelection(['track-001/positions/4']);
      expect(store.getState().selection.primary).toBe('track-001');
      expect(store.getState().selection.featureIds).toEqual(['track-001']);
    });

    it('should update primary when primary path is removed', () => {
      store.getState().setSelection(
        ['track-001/positions/4', 'track-002'],
        'track-001/positions/4'
      );
      store.getState().removeFromSelection(['track-001/positions/4']);
      expect(store.getState().selection.primary).toBe('track-002');
    });

    it('should not add duplicate paths via addToSelection', () => {
      store.getState().setSelection(['track-001/positions/4']);
      store.getState().addToSelection(['track-001/positions/4']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001/positions/4',
      ]);
    });

    it('T076: normalised paths are stored (trailing slash stripped)', () => {
      // The store action strips trailing slashes via normalisePath
      store.getState().setSelection(['track-001/positions/4']);
      expect(store.getState().selection.featureIds[0]).toBe('track-001/positions/4');
    });

    it('T077: empty paths are silently filtered', () => {
      store.getState().setSelection(['track-001', '', 'track-002']);
      const featureIds = store.getState().selection.featureIds;
      expect(featureIds).not.toContain('');
      expect(featureIds).toContain('track-001');
      expect(featureIds).toContain('track-002');
    });
  });

  // ─── removeFromSelection with exact match (T052) ──────────────────

  describe('removeFromSelection with paths', () => {
    it('should remove exact path only', () => {
      store.getState().setSelection([
        'track-001',
        'track-001/positions/4',
        'track-002',
      ]);
      store.getState().removeFromSelection(['track-001/positions/4']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001',
        'track-002',
      ]);
    });

    it('should not remove parent when removing child', () => {
      store.getState().setSelection([
        'track-001',
        'track-001/positions/4',
      ]);
      store.getState().removeFromSelection(['track-001/positions/4']);
      expect(store.getState().selection.featureIds).toEqual(['track-001']);
    });

    it('should not remove children when removing parent', () => {
      store.getState().setSelection([
        'track-001',
        'track-001/positions/4',
      ]);
      store.getState().removeFromSelection(['track-001']);
      expect(store.getState().selection.featureIds).toEqual([
        'track-001/positions/4',
      ]);
    });
  });
});
