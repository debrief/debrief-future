/**
 * Persistence tests.
 * Feature: 024-document-session-state
 * Phase 6: User Story 4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../src/store/index.js';
import {
  extractPersistentState,
  serializeState,
  isVersionCompatible,
  isFutureVersion,
  SCHEMA_VERSIONS,
} from '../../src/persistence/index.js';

// Mock fs/promises for file operations
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('{}'),
}));

describe('Persistence', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractPersistentState', () => {
    it('should extract temporal state', () => {
      store.getState().setPlaybackRate(2.0);
      store.getState().setDisplayMode('snailTrail');

      const persistent = extractPersistentState(store);

      expect(persistent.temporal.playbackRate).toBe(2.0);
      expect(persistent.temporal.displayMode).toBe('snailTrail');
    });

    it('should extract spatial state', () => {
      store.getState().setRotation(45);

      const persistent = extractPersistentState(store);

      expect(persistent.spatial.rotation).toBe(45);
    });

    it('should extract features state', () => {
      store.getState().setSelection(['f1', 'f2'], 'f1');
      store.getState().setHiddenFeatures(['f3']);

      const persistent = extractPersistentState(store);

      expect(persistent.features.selection.featureIds).toEqual(['f1', 'f2']);
      expect(persistent.features.selection.primary).toBe('f1');
      expect(persistent.features.hiddenFeatureIds).toEqual(['f3']);
    });

    it('should exclude ephemeral playbackState', () => {
      store.getState().setPlaybackState('playing');

      const persistent = extractPersistentState(store);

      // playbackState should not be in persistent state
      expect((persistent.temporal as Record<string, unknown>).playbackState).toBeUndefined();
    });

    it('should exclude ephemeral drawingMode (T006)', () => {
      store.getState().setDrawingMode('rectangle');

      const persistent = extractPersistentState(store);

      // drawingMode should always be null in persistent state (FR-010)
      expect((persistent.spatial as Record<string, unknown>).drawingMode).toBeNull();
    });

    it('should include schema version', () => {
      const persistent = extractPersistentState(store);
      expect(persistent.schemaVersion).toBe('1.0.0');
    });

    it('should include savedAt timestamp', () => {
      const persistent = extractPersistentState(store);
      expect(persistent.savedAt).toBeDefined();
      expect(new Date(persistent.savedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('serializeState', () => {
    it('should return valid JSON', () => {
      const json = serializeState(store);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include version header', () => {
      const json = serializeState(store);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0.0');
    });

    it('should include savedAt', () => {
      const json = serializeState(store);
      const parsed = JSON.parse(json);
      expect(parsed.savedAt).toBeDefined();
    });

    it('should include temporal, spatial, and features sections', () => {
      const json = serializeState(store);
      const parsed = JSON.parse(json);
      expect(parsed.temporal).toBeDefined();
      expect(parsed.spatial).toBeDefined();
      expect(parsed.features).toBeDefined();
    });
  });

  describe('version compatibility', () => {
    it('should recognize compatible versions', () => {
      expect(isVersionCompatible('1.0')).toBe(true);
      expect(isVersionCompatible('1.0.0')).toBe(true);
    });

    it('should recognize incompatible versions', () => {
      expect(isVersionCompatible('0.1')).toBe(false);
      expect(isVersionCompatible('0.9')).toBe(false);
    });

    it('should identify future versions', () => {
      expect(isFutureVersion('2.0')).toBe(true);
      expect(isFutureVersion('99.0')).toBe(true);
    });

    it('should not identify current version as future', () => {
      expect(isFutureVersion('1.0')).toBe(false);
    });
  });

  describe('SCHEMA_VERSIONS', () => {
    it('should expose schema versions', () => {
      expect(SCHEMA_VERSIONS).toBeDefined();
      expect(SCHEMA_VERSIONS.CURRENT).toBe('1.0.0');
      expect(SCHEMA_VERSIONS.MIN_SUPPORTED).toBe('1.0.0');
    });
  });
});

describe('Persistence round-trip', () => {
  it('should preserve state through serialize/deserialize', () => {
    const store1 = createSessionStore();

    // Set up some state
    store1.getState().setPlaybackRate(2.5);
    store1.getState().setRotation(90);
    store1.getState().setSelection(['f1'], 'f1');
    store1.getState().setDisplayMode('snailTrail');

    // Serialize
    const json = serializeState(store1);
    const parsed = JSON.parse(json);

    // Create new store and verify structure matches
    const store2 = createSessionStore();

    // Apply parsed state
    if (parsed.temporal.playbackRate) {
      store2.getState().setPlaybackRate(parsed.temporal.playbackRate);
    }
    if (parsed.spatial.rotation !== undefined) {
      store2.getState().setRotation(parsed.spatial.rotation);
    }
    if (parsed.features.selection?.featureIds) {
      store2.getState().setSelection(
        parsed.features.selection.featureIds,
        parsed.features.selection.primary
      );
    }
    if (parsed.temporal.displayMode) {
      store2.getState().setDisplayMode(parsed.temporal.displayMode);
    }

    // Verify
    expect(store2.getState().playbackRate).toBe(2.5);
    expect(store2.getState().rotation).toBe(90);
    expect(store2.getState().selection.featureIds).toEqual(['f1']);
    expect(store2.getState().displayMode).toBe('snailTrail');
  });
});
