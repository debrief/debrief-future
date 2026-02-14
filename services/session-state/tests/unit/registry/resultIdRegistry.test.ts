/**
 * Result ID Registry unit tests.
 * Feature: 087-logical-result-id-registry (E04)
 *
 * Covers: Foundation (Phase 2), US1 Register/Resolve (Phase 3),
 * US2 Change Events (Phase 4), US4 Edge Cases (Phase 6).
 */

import { createResultIdRegistry } from '../../../src/registry/resultIdRegistry.js';
import type { ResultIdChangeEvent } from '../../../src/registry/types.js';
import type { LogEntry, RecordResult, ArtifactVersion } from '../../../src/log/types.js';

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    activityId: 'act-001',
    timestamp: '2026-02-13T10:00:00Z',
    wasGeneratedBy: {
      tool: 'bearing-time-plot',
      toolVersion: '1.0.0',
      parameters: {},
    },
    used: ['track-a'],
    generated: ['./results/bt_plot_001_v1.png'],
    executionDuration: 'PT0.5S',
    generatedResultId: 'bt_plot_001',
    tune: null,
    ...overrides,
  };
}

function makeRecordResult(entries: LogEntry[]): RecordResult {
  return {
    activityId: entries[0]?.activityId ?? '',
    featuresUpdated: 1,
    entries,
  };
}

function makeArtifactVersion(overrides: Partial<ArtifactVersion> = {}): ArtifactVersion {
  return {
    resultId: 'bt_plot_001',
    version: 2,
    path: './results/bt_plot_001_v2.png',
    previousPath: './results/bt_plot_001_v1.png',
    ...overrides,
  };
}

// ─── Phase 2: Foundation ─────────────────────────────────────────────────

describe('createResultIdRegistry', () => {
  describe('factory and initial state', () => {
    it('creates a registry with zero mappings', () => {
      const registry = createResultIdRegistry();
      expect(registry.size).toBe(0);
      expect(registry.listAll()).toEqual([]);
    });
  });

  describe('resolve()', () => {
    it('returns undefined for unknown result IDs', () => {
      const registry = createResultIdRegistry();
      expect(registry.resolve('nonexistent')).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('removes all mappings', () => {
      const registry = createResultIdRegistry();
      registry.registerFromLogEntry(makeLogEntry());
      expect(registry.size).toBe(1);

      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.resolve('bt_plot_001')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('reflects the number of registered mappings', () => {
      const registry = createResultIdRegistry();
      expect(registry.size).toBe(0);

      registry.registerFromLogEntry(makeLogEntry({ generatedResultId: 'id-1', generated: ['./results/id-1_v1.png'] }));
      expect(registry.size).toBe(1);

      registry.registerFromLogEntry(makeLogEntry({ generatedResultId: 'id-2', generated: ['./results/id-2_v1.png'] }));
      expect(registry.size).toBe(2);
    });
  });
});

// ─── Phase 3: US1 — Register and Resolve ─────────────────────────────────

describe('registerFromLogEntry', () => {
  it('registers a mapping when entry has generatedResultId (FR-002, FR-003)', () => {
    const registry = createResultIdRegistry();
    registry.registerFromLogEntry(makeLogEntry());

    const mapping = registry.resolve('bt_plot_001');
    expect(mapping).toBeDefined();
    expect(mapping!.resultId).toBe('bt_plot_001');
    expect(mapping!.currentPath).toBe('./results/bt_plot_001_v1.png');
  });

  it('no-ops when entry has null generatedResultId (FR-013)', () => {
    const registry = createResultIdRegistry();
    registry.registerFromLogEntry(makeLogEntry({ generatedResultId: null }));
    expect(registry.size).toBe(0);
  });

  it('no-ops when entry has undefined generatedResultId (FR-013)', () => {
    const registry = createResultIdRegistry();
    registry.registerFromLogEntry(makeLogEntry({ generatedResultId: undefined }));
    expect(registry.size).toBe(0);
  });

  it('extracts artifact path from generated array (ignoring feature IDs)', () => {
    const registry = createResultIdRegistry();
    registry.registerFromLogEntry(
      makeLogEntry({
        generated: ['feature-1', './results/bt_plot_001_v1.png'],
      })
    );

    const mapping = registry.resolve('bt_plot_001');
    expect(mapping!.currentPath).toBe('./results/bt_plot_001_v1.png');
  });

  it('no-ops when generated array has no path-like entries', () => {
    const registry = createResultIdRegistry();
    registry.registerFromLogEntry(
      makeLogEntry({
        generatedResultId: 'bt_plot_001',
        generated: ['feature-id-only'],
      })
    );
    expect(registry.size).toBe(0);
  });
});

describe('registerFromRecordResult', () => {
  it('processes all entries in the result', () => {
    const registry = createResultIdRegistry();
    const entries = [
      makeLogEntry({ generatedResultId: 'id-1', generated: ['./results/id-1_v1.png'] }),
      makeLogEntry({ generatedResultId: 'id-2', generated: ['./results/id-2_v1.json'] }),
    ];

    registry.registerFromRecordResult(makeRecordResult(entries));
    expect(registry.size).toBe(2);
    expect(registry.resolve('id-1')!.currentPath).toBe('./results/id-1_v1.png');
    expect(registry.resolve('id-2')!.currentPath).toBe('./results/id-2_v1.json');
  });

  it('skips entries without generatedResultId', () => {
    const registry = createResultIdRegistry();
    const entries = [
      makeLogEntry({ generatedResultId: 'id-1', generated: ['./results/id-1_v1.png'] }),
      makeLogEntry({ generatedResultId: null }),
    ];

    registry.registerFromRecordResult(makeRecordResult(entries));
    expect(registry.size).toBe(1);
  });
});

describe('registerFromReplayResult', () => {
  it('registers mappings from artifact versions', () => {
    const registry = createResultIdRegistry();
    const artifacts: ArtifactVersion[] = [
      makeArtifactVersion({ resultId: 'bt_plot_001', version: 2, path: './results/bt_plot_001_v2.png' }),
    ];

    registry.registerFromReplayResult(artifacts);
    const mapping = registry.resolve('bt_plot_001');
    expect(mapping!.currentPath).toBe('./results/bt_plot_001_v2.png');
    expect(mapping!.version).toBe(2);
  });

  it('processes multiple artifact versions', () => {
    const registry = createResultIdRegistry();
    const artifacts: ArtifactVersion[] = [
      makeArtifactVersion({ resultId: 'id-1', version: 3, path: './results/id-1_v3.png' }),
      makeArtifactVersion({ resultId: 'id-2', version: 1, path: './results/id-2_v1.json' }),
    ];

    registry.registerFromReplayResult(artifacts);
    expect(registry.size).toBe(2);
  });
});

// ─── Phase 4: US2 — Change Events ───────────────────────────────────────

describe('subscribe()', () => {
  it('receives change events when the subscribed result ID updates', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    // Register initial version
    registry.registerFromLogEntry(makeLogEntry());

    // Subscribe to bt_plot_001
    registry.subscribe('bt_plot_001', (e) => events.push(e));

    // Update to v2
    registry.registerFromLogEntry(
      makeLogEntry({
        generated: ['./results/bt_plot_001_v2.png'],
      })
    );

    expect(events).toHaveLength(1);
    expect(events[0].resultId).toBe('bt_plot_001');
    expect(events[0].previousPath).toBe('./results/bt_plot_001_v1.png');
    expect(events[0].newPath).toBe('./results/bt_plot_001_v2.png');
  });

  it('does NOT receive events for other result IDs (SC-004)', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribe('range_plot_001', (e) => events.push(e));

    // Register a different result ID
    registry.registerFromLogEntry(makeLogEntry());

    expect(events).toHaveLength(0);
  });

  it('receives event on first registration (previousPath is null)', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribe('bt_plot_001', (e) => events.push(e));
    registry.registerFromLogEntry(makeLogEntry());

    expect(events).toHaveLength(1);
    expect(events[0].previousPath).toBeNull();
    expect(events[0].newPath).toBe('./results/bt_plot_001_v1.png');
  });
});

describe('subscribeAll()', () => {
  it('receives events for any result ID update', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribeAll((e) => events.push(e));

    registry.registerFromLogEntry(
      makeLogEntry({ generatedResultId: 'id-1', generated: ['./results/id-1_v1.png'] })
    );
    registry.registerFromLogEntry(
      makeLogEntry({ generatedResultId: 'id-2', generated: ['./results/id-2_v1.json'] })
    );

    expect(events).toHaveLength(2);
    expect(events[0].resultId).toBe('id-1');
    expect(events[1].resultId).toBe('id-2');
  });
});

describe('unsubscribe', () => {
  it('stops delivering events after unsubscribe (SC-005)', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    const unsub = registry.subscribe('bt_plot_001', (e) => events.push(e));

    // First registration — triggers event
    registry.registerFromLogEntry(makeLogEntry());
    expect(events).toHaveLength(1);

    // Unsubscribe
    unsub();

    // Update — should NOT trigger event
    registry.registerFromLogEntry(
      makeLogEntry({ generated: ['./results/bt_plot_001_v2.png'] })
    );

    expect(events).toHaveLength(1);
  });

  it('stops global subscription after unsubscribe', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    const unsub = registry.subscribeAll((e) => events.push(e));
    registry.registerFromLogEntry(makeLogEntry());
    expect(events).toHaveLength(1);

    unsub();

    registry.registerFromLogEntry(
      makeLogEntry({ generatedResultId: 'id-2', generated: ['./results/id-2_v1.png'] })
    );
    expect(events).toHaveLength(1);
  });
});

describe('change event content', () => {
  it('contains resultId, previousPath, newPath, previousVersion, newVersion', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribeAll((e) => events.push(e));

    // First registration
    registry.registerFromLogEntry(makeLogEntry());

    expect(events[0]).toEqual({
      resultId: 'bt_plot_001',
      previousPath: null,
      newPath: './results/bt_plot_001_v1.png',
      previousVersion: null,
      newVersion: null,
    });
  });

  it('includes version numbers from replay artifacts', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    // Hydrate initial v1
    registry.hydrateFromAssets({
      'bt_plot_001_v1': {
        href: './results/bt_plot_001_v1.png',
        type: 'image/png',
        'debrief:resultId': 'bt_plot_001',
        'debrief:version': 1,
      },
    });

    registry.subscribeAll((e) => events.push(e));

    // Update via replay to v2
    registry.registerFromReplayResult([
      makeArtifactVersion({ resultId: 'bt_plot_001', version: 2, path: './results/bt_plot_001_v2.png' }),
    ]);

    expect(events[0].previousPath).toBe('./results/bt_plot_001_v1.png');
    expect(events[0].newPath).toBe('./results/bt_plot_001_v2.png');
    expect(events[0].previousVersion).toBe(1);
    expect(events[0].newVersion).toBe(2);
  });
});

describe('multiple subscribers', () => {
  it('notifies all subscribers independently', () => {
    const registry = createResultIdRegistry();
    const events1: ResultIdChangeEvent[] = [];
    const events2: ResultIdChangeEvent[] = [];

    registry.subscribe('bt_plot_001', (e) => events1.push(e));
    registry.subscribe('bt_plot_001', (e) => events2.push(e));

    registry.registerFromLogEntry(makeLogEntry());

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events1[0].resultId).toBe('bt_plot_001');
    expect(events2[0].resultId).toBe('bt_plot_001');
  });
});

// ─── Phase 6: US4 — Subscription Edge Cases ─────────────────────────────

describe('edge cases', () => {
  it('rapid successive updates produce correctly ordered events (FR-015)', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribeAll((e) => events.push(e));

    registry.registerFromLogEntry(
      makeLogEntry({
        generatedResultId: 'bt_plot_001',
        generated: ['./results/bt_plot_001_v1.png'],
      })
    );
    registry.registerFromLogEntry(
      makeLogEntry({
        generatedResultId: 'bt_plot_001',
        generated: ['./results/bt_plot_001_v2.png'],
      })
    );
    registry.registerFromLogEntry(
      makeLogEntry({
        generatedResultId: 'bt_plot_001',
        generated: ['./results/bt_plot_001_v3.png'],
      })
    );

    expect(events).toHaveLength(3);
    expect(events[0].newPath).toBe('./results/bt_plot_001_v1.png');
    expect(events[0].previousPath).toBeNull();
    expect(events[1].newPath).toBe('./results/bt_plot_001_v2.png');
    expect(events[1].previousPath).toBe('./results/bt_plot_001_v1.png');
    expect(events[2].newPath).toBe('./results/bt_plot_001_v3.png');
    expect(events[2].previousPath).toBe('./results/bt_plot_001_v2.png');
  });

  it('registering after hydration triggers change event with old path from hydration', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    // Hydrate initial state
    registry.hydrateFromAssets({
      'bt_plot_001_v1': {
        href: './results/bt_plot_001_v1.png',
        type: 'image/png',
        'debrief:resultId': 'bt_plot_001',
        'debrief:version': 1,
      },
    });

    registry.subscribeAll((e) => events.push(e));

    // New tool execution updates the mapping
    registry.registerFromLogEntry(
      makeLogEntry({
        generatedResultId: 'bt_plot_001',
        generated: ['./results/bt_plot_001_v2.png'],
      })
    );

    expect(events).toHaveLength(1);
    expect(events[0].previousPath).toBe('./results/bt_plot_001_v1.png');
    expect(events[0].newPath).toBe('./results/bt_plot_001_v2.png');
  });

  it('clear() during active subscriptions prevents further callbacks', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribe('bt_plot_001', (e) => events.push(e));
    registry.subscribeAll((e) => events.push(e));

    // Clear removes both mappings and subscriptions
    registry.clear();

    registry.registerFromLogEntry(makeLogEntry());

    // No callbacks should fire because subscriptions were cleared
    expect(events).toHaveLength(0);
  });

  it('does not emit event when same path is registered again (no-change)', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribeAll((e) => events.push(e));

    registry.registerFromLogEntry(makeLogEntry());
    expect(events).toHaveLength(1);

    // Re-register with same path — should NOT emit
    registry.registerFromLogEntry(makeLogEntry());
    expect(events).toHaveLength(1);
  });
});

// ─── Integration: LogService RecordResult → Registry ─────────────────────

describe('integration with LogService flow', () => {
  it('registerFromRecordResult populates registry from mock RecordResult', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    registry.subscribeAll((e) => events.push(e));

    const recordResult: RecordResult = {
      activityId: 'act-123',
      featuresUpdated: 2,
      entries: [
        makeLogEntry({
          activityId: 'act-123',
          generatedResultId: 'range_plot_001',
          generated: ['track-a', 'track-b', './results/range_plot_001_v1.json'],
        }),
      ],
    };

    registry.registerFromRecordResult(recordResult);

    expect(registry.size).toBe(1);
    const mapping = registry.resolve('range_plot_001');
    expect(mapping!.currentPath).toBe('./results/range_plot_001_v1.json');
    expect(events).toHaveLength(1);
  });
});
