/**
 * AutoRefreshController unit tests.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Covers: Phase 2 Foundation, US1, US2, US3, US4.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAutoRefreshController } from '../../../src/refresh/controller.js';
import { createResultIdRegistry } from '../../../src/registry/resultIdRegistry.js';
import type { ResultIdChangeEvent } from '../../../src/registry/types.js';
import type { AutoRefreshController, RefreshCallback } from '../../../src/refresh/types.js';
import type { LogEntry, RecordResult } from '../../../src/log/types.js';

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    activityId: 'act-001',
    timestamp: '2026-02-17T10:00:00Z',
    wasGeneratedBy: {
      tool: 'zone-histogram',
      toolVersion: '1.0.0',
      parameters: {},
    },
    used: ['track-a'],
    generated: ['./results/histogram_v1.json'],
    executionDuration: 'PT0.5S',
    generatedResultId: 'histogram-zone-counts',
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

// ─── Phase 2: Foundation ─────────────────────────────────────────────────

describe('createAutoRefreshController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('factory and initial state', () => {
    it('creates a controller with no registered views', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      expect(controller.getState('nonexistent')).toBeUndefined();
    });
  });

  describe('register()', () => {
    it('registers a view and returns initial active state', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);
      const state = controller.getState('view-1');

      expect(state).toBeDefined();
      expect(state!.viewId).toBe('view-1');
      expect(state!.resultId).toBe('histogram-zone-counts');
      expect(state!.paused).toBe(false);
      expect(state!.stale).toBe(false);
      expect(state!.visible).toBe(true);
      expect(state!.status).toBe('active');
      expect(state!.pendingEvent).toBeNull();
      expect(state!.errorMessage).toBeNull();
    });

    it('returns an unregister function', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const onRefresh = vi.fn();

      const unregister = controller.register('view-1', 'histogram-zone-counts', onRefresh);
      expect(controller.getState('view-1')).toBeDefined();

      unregister();
      expect(controller.getState('view-1')).toBeUndefined();
    });

    it('re-registering same viewId replaces the previous registration', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const onRefresh1 = vi.fn();
      const onRefresh2 = vi.fn();

      controller.register('view-1', 'result-a', onRefresh1);
      controller.register('view-1', 'result-b', onRefresh2);

      const state = controller.getState('view-1');
      expect(state!.resultId).toBe('result-b');
    });
  });

  describe('dispose()', () => {
    it('removes all views', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });

      controller.register('view-1', 'result-a', vi.fn());
      controller.register('view-2', 'result-b', vi.fn());

      controller.dispose();
      expect(controller.getState('view-1')).toBeUndefined();
      expect(controller.getState('view-2')).toBeUndefined();
    });
  });

  describe('onStateChange()', () => {
    it('notifies listeners when state changes', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const onRefresh = vi.fn();
      const stateChanges: any[] = [];

      controller.register('view-1', 'histogram', onRefresh);
      controller.onStateChange('view-1', (s) => stateChanges.push(s));

      controller.pause('view-1');
      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].paused).toBe(true);
    });

    it('returns unsubscribe function', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const stateChanges: any[] = [];

      controller.register('view-1', 'histogram', vi.fn());
      const unsub = controller.onStateChange('view-1', (s) => stateChanges.push(s));

      controller.pause('view-1');
      expect(stateChanges).toHaveLength(1);

      unsub();
      controller.resume('view-1');
      expect(stateChanges).toHaveLength(1); // no more notifications
    });
  });

  // ─── Phase 3 / US1: Change event triggers onRefresh ─────────────────

  describe('US1: auto-refresh on change event', () => {
    it('triggers onRefresh callback when registry emits change event', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);

      // Trigger a change event via the registry
      registry.registerFromLogEntry(makeLogEntry());

      // With 0ms debounce, timer fires immediately on advance
      vi.advanceTimersByTime(1);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          resultId: 'histogram-zone-counts',
          newPath: './results/histogram_v1.json',
        }),
        null // no viewport state
      );
    });

    it('triggers onRefresh with new path when mapping changes', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      // Register initial mapping
      registry.registerFromLogEntry(makeLogEntry({
        generated: ['./results/histogram_v1.json'],
      }));

      // Register view after initial mapping exists
      controller.register('view-1', 'histogram-zone-counts', onRefresh);

      // Update mapping with new path
      registry.registerFromLogEntry(makeLogEntry({
        activityId: 'act-002',
        generated: ['./results/histogram_v2.json'],
      }));

      vi.advanceTimersByTime(1);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          resultId: 'histogram-zone-counts',
          previousPath: './results/histogram_v1.json',
          newPath: './results/histogram_v2.json',
        }),
        null
      );
    });

    it('updates lastRefreshTimestamp after refresh', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });

      controller.register('view-1', 'histogram-zone-counts', vi.fn());
      expect(controller.getState('view-1')!.lastRefreshTimestamp).toBeNull();

      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);

      expect(controller.getState('view-1')!.lastRefreshTimestamp).not.toBeNull();
    });
  });

  // ─── Phase 4 / US2: Viewport state passed through ────────────────────

  describe('US2: viewport state in refresh callback', () => {
    it('passes null viewport by default (no viewport captured)', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);
      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);

      expect(onRefresh).toHaveBeenCalledWith(expect.anything(), null);
    });
  });

  // ─── Phase 5 / US3: Multiple views ────────────────────────────────────

  describe('US3: multiple simultaneous views', () => {
    it('only notifies views bound to the changed result ID', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefreshA = vi.fn();
      const onRefreshB = vi.fn();

      controller.register('view-a', 'histogram-zone-counts', onRefreshA);
      controller.register('view-b', 'speed-profile', onRefreshB);

      // Only histogram changes
      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);

      expect(onRefreshA).toHaveBeenCalledTimes(1);
      expect(onRefreshB).not.toHaveBeenCalled();
    });

    it('notifies both views when bound to the same result ID', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefreshA = vi.fn();
      const onRefreshB = vi.fn();

      controller.register('view-a', 'histogram-zone-counts', onRefreshA);
      controller.register('view-b', 'histogram-zone-counts', onRefreshB);

      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);

      expect(onRefreshA).toHaveBeenCalledTimes(1);
      expect(onRefreshB).toHaveBeenCalledTimes(1);
    });

    it('debounces rapid updates to a single re-render', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 300 });
      const onRefresh = vi.fn();

      // Seed initial mapping
      registry.registerFromLogEntry(makeLogEntry({
        generated: ['./results/histogram_v0.json'],
      }));

      controller.register('view-1', 'histogram-zone-counts', onRefresh);

      // Fire 5 rapid updates
      for (let i = 1; i <= 5; i++) {
        registry.registerFromLogEntry(makeLogEntry({
          activityId: `act-${i}`,
          generated: [`./results/histogram_v${i}.json`],
        }));
      }

      // Before debounce fires
      expect(onRefresh).not.toHaveBeenCalled();

      // After debounce
      vi.advanceTimersByTime(300);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          newPath: './results/histogram_v5.json',
        }),
        null
      );
    });

    it('defers refresh for hidden views and flushes on visible', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);
      controller.setVisible('view-1', false);

      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);

      // Not refreshed while hidden
      expect(onRefresh).not.toHaveBeenCalled();
      expect(controller.getState('view-1')!.stale).toBe(true);

      // Becomes visible → flushes
      controller.setVisible('view-1', true);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Phase 6 / US4: Pause and resume ──────────────────────────────────

  describe('US4: pause and resume', () => {
    it('pause() suppresses refresh and captures pending event', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);
      controller.pause('view-1');

      expect(controller.getState('view-1')!.paused).toBe(true);
      expect(controller.getState('view-1')!.status).toBe('paused');

      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);

      expect(onRefresh).not.toHaveBeenCalled();
      expect(controller.getState('view-1')!.pendingEvent).not.toBeNull();
    });

    it('resume() flushes pending event and triggers refresh', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);
      controller.pause('view-1');

      registry.registerFromLogEntry(makeLogEntry());
      vi.advanceTimersByTime(1);
      expect(onRefresh).not.toHaveBeenCalled();

      controller.resume('view-1');
      expect(controller.getState('view-1')!.paused).toBe(false);
      expect(controller.getState('view-1')!.status).toBe('active');
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('resume() with no pending event does not trigger refresh', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry, debounceMs: 0 });
      const onRefresh = vi.fn();

      controller.register('view-1', 'histogram-zone-counts', onRefresh);
      controller.pause('view-1');
      controller.resume('view-1');

      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('pause() is idempotent', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const stateChanges: any[] = [];

      controller.register('view-1', 'histogram', vi.fn());
      controller.onStateChange('view-1', (s) => stateChanges.push(s));

      controller.pause('view-1');
      controller.pause('view-1'); // second pause should be no-op

      expect(stateChanges).toHaveLength(1); // only one notification
    });

    it('resume() is idempotent', () => {
      const registry = createResultIdRegistry();
      const controller = createAutoRefreshController({ registry });
      const stateChanges: any[] = [];

      controller.register('view-1', 'histogram', vi.fn());
      controller.onStateChange('view-1', (s) => stateChanges.push(s));

      // Already active, resume should be no-op
      controller.resume('view-1');
      expect(stateChanges).toHaveLength(0);
    });
  });
});
