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
      store.getState().setDisplayMode('trail');

      const persistent = extractPersistentState(store);

      expect(persistent.temporal.playbackRate).toBe(2.0);
      expect(persistent.temporal.displayMode).toBe('trail');
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

    it('should exclude all ephemeral spatial fields (spec 260 T011)', () => {
      // Mutate every ephemeral field in-memory so the test surfaces a
      // regression if any one of them leaks back into the persisted shape.
      store.getState().setDrawingMode('rectangle');
      store.getState().incrementDrawingPaletteIndex();
      store.getState().setViewportLocked(true);

      const persistent = extractPersistentState(store);
      const keys = Object.keys(persistent.spatial as Record<string, unknown>);

      // Article IV.5 — Omit<> at the type boundary means none of these
      // ephemeral keys appear at runtime either.
      expect(keys).not.toContain('drawingMode');
      expect(keys).not.toContain('drawingPaletteIndex');
      expect(keys).not.toContain('viewportLocked');
    });

    it('should include schema version', () => {
      const persistent = extractPersistentState(store);
      expect(persistent.schemaVersion).toBe('1.1.0');
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
      expect(parsed.version).toBe('1.1.0');
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
      expect(SCHEMA_VERSIONS.CURRENT).toBe('1.1.0');
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
    store1.getState().setDisplayMode('trail');

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
    expect(store2.getState().displayMode).toBe('trail');
  });
});

describe('Persistence loadSession — viewport lock force-unlock (spec 260)', () => {
  it('forces viewportLocked to false on load even when persisted value is true (FR-011)', async () => {
    const { readFile } = await import('fs/promises');
    // Defence-in-depth: even if a buggy save smuggled the field back into
    // the on-disk shape, load.ts overwrites it to false (per T007).
    const payloadWithLockSmuggledIn = {
      version: '1.1.0',
      savedAt: '2026-05-18T00:00:00.000Z',
      temporal: {
        currentTime: null,
        timeRange: null,
        timeFilter: null,
        stepSize: { value: 1, unit: 'minute' },
        playbackRate: 1,
        playbackState: 'stopped',
        displayMode: 'full',
      },
      spatial: {
        viewport: null,
        rotation: 0,
        // Smuggled-in ephemeral fields — load.ts MUST ignore.
        viewportLocked: true,
        drawingMode: null,
        drawingPaletteIndex: 0,
      },
      features: {
        featureCollectionUri: null,
        selection: {
          featureIds: [],
          primary: undefined,
          timestamp: { epoch: 0, iso: '1970-01-01T00:00:00.000Z' },
        },
        hiddenFeatureIds: [],
      },
    };
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(payloadWithLockSmuggledIn),
    );

    const store = createSessionStore();
    // Pre-set in-memory lock so the test surfaces a regression if load.ts
    // forgets to reset (the prior `store.reset()` would mask this).
    store.getState().setViewportLocked(true);

    const { loadSession } = await import('../../src/persistence/index.js');
    const result = await loadSession(store, '/fake/session.debrief.json');

    expect(result.success).toBe(true);
    expect(store.getState().viewportLocked).toBe(false);
  });
});

describe('Persistence loadSession — legacy tuple-form viewport (feature 203)', () => {
  it('rehydrates version 1.0.0 tuple-form coordinates into canonical object form', async () => {
    const { writeFile, readFile } = await import('fs/promises');
    const legacyFile = {
      version: '1.0.0',
      savedAt: '2026-01-01T00:00:00.000Z',
      temporal: {
        currentTime: null,
        timeRange: null,
        timeFilter: null,
        stepSize: { value: 1, unit: 'minute' },
        playbackRate: 1,
        playbackState: 'stopped',
        displayMode: 'full',
      },
      spatial: {
        viewport: {
          coordinates: [
            [-1, 52], // NW (tuple form — legacy)
            [1, 52], // NE
            [1, 51], // SE
            [-1, 51], // SW
          ],
          zoom: 10,
        },
        rotation: 0,
        drawingMode: null,
        drawingPaletteIndex: 0,
      },
      features: {
        featureCollectionUri: null,
        selection: { featureIds: [], primary: undefined, timestamp: { epoch: 0, iso: '1970-01-01T00:00:00.000Z' } },
        hiddenFeatureIds: [],
      },
    };

    // The mock in the outer describe replaces fs/promises. Replace the readFile
    // mock to return our legacy payload.
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(legacyFile),
    );
    // writeFile is mocked as a no-op already; suppress unused binding warning.
    void writeFile;

    const store = createSessionStore();
    const { loadSession } = await import('../../src/persistence/index.js');
    const result = await loadSession(store, '/fake/legacy.debrief.json');

    expect(result.success).toBe(true);
    const rehydrated = store.getState().viewport;
    expect(rehydrated).not.toBeNull();
    expect(rehydrated!.coordinates).toEqual([
      { longitude: -1, latitude: 52 },
      { longitude: 1, latitude: 52 },
      { longitude: 1, latitude: 51 },
      { longitude: -1, latitude: 51 },
    ]);
    expect(rehydrated!.zoom).toBe(10);
  });
});

describe('loadSession — temporal enum validation (Feature 205 / FR-023a)', () => {
  /**
   * Load-boundary validation for DisplayMode and PlaybackState: legacy,
   * unknown, or typo values MUST be rejected with a typed error, returning
   * `LoadResult { success: false, error: ... }` — no throw (R2-1A,
   * R2-3A). The tests assert on `result.success` + `result.error` shape
   * only, never `rejects.toThrow`.
   */
  function buildValidSessionPayload(overrides: {
    displayMode?: unknown;
    playbackState?: unknown;
  } = {}): Record<string, unknown> {
    return {
      version: '1.1.0',
      savedAt: '2026-04-21T00:00:00.000Z',
      temporal: {
        currentTime: null,
        timeRange: null,
        timeFilter: null,
        stepSize: { value: 1, unit: 'minute' },
        playbackRate: 1,
        playbackState: overrides.playbackState ?? 'stopped',
        displayMode: overrides.displayMode ?? 'full',
      },
      spatial: {
        viewport: null,
        rotation: 0,
        drawingMode: null,
        drawingPaletteIndex: 0,
      },
      features: {
        featureCollectionUri: null,
        selection: { featureIds: [], primary: undefined, timestamp: { epoch: 0, iso: '1970-01-01T00:00:00.000Z' } },
        hiddenFeatureIds: [],
      },
    };
  }

  async function runLoad(payload: Record<string, unknown>) {
    const { readFile } = await import('fs/promises');
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify(payload),
    );
    const store = createSessionStore();
    const { loadSession } = await import('../../src/persistence/index.js');
    return loadSession(store, '/fake/session.debrief.json');
  }

  it('returns LoadResult {success:false} for legacy displayMode "snailTrail"', async () => {
    const result = await runLoad(buildValidSessionPayload({ displayMode: 'snailTrail' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid temporal\.displayMode.*snailTrail/);
  });

  it('returns LoadResult {success:false} for legacy displayMode "normal"', async () => {
    const result = await runLoad(buildValidSessionPayload({ displayMode: 'normal' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid temporal\.displayMode.*normal/);
  });

  it('returns LoadResult {success:false} for typo playbackState "palying"', async () => {
    const result = await runLoad(buildValidSessionPayload({ playbackState: 'palying' }));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid temporal\.playbackState.*palying/);
  });

  it('returns LoadResult {success:true} for every canonical permissible value', async () => {
    for (const playbackState of ['stopped', 'playing', 'paused'] as const) {
      for (const displayMode of ['full', 'trail'] as const) {
        const result = await runLoad(buildValidSessionPayload({ playbackState, displayMode }));
        expect(result.success, `playback=${playbackState} display=${displayMode}`).toBe(true);
        expect(result.error).toBeUndefined();
      }
    }
  });
});
