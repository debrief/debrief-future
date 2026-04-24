/**
 * @vitest-environment jsdom
 *
 * jsdom is required because importing `../../src/views/logPanelView` transitively
 * pulls in `@debrief/components` (for `VALID_VIEW_MODES`) which in turn pulls in
 * Leaflet — Leaflet checks for `window` at module-eval time and crashes under the
 * default `node` environment. The tested code (`toTimelineEntry`,
 * `kindFromActivityType`) is pure and does not touch the DOM.
 */

import { describe, expect, it } from 'vitest';
import type { LogEntry } from '@debrief/session-state';

import {
  kindFromActivityType,
  toTimelineEntry,
} from '../../src/views/logPanelView';

/**
 * Factory: minimal LogEntry skeleton — only `activity_type` and `tool` vary
 * across test cases. All other fields are constant.
 */
function makeLogEntry(overrides: Partial<LogEntry> & { tool?: string } = {}): LogEntry {
  const { tool = 'calculate-range', ...rest } = overrides;
  return {
    activity_id: 'test-activity',
    timestamp: '2026-04-22T07:00:00Z',
    was_generated_by: {
      tool,
      tool_version: '1.0.0',
      parameters: {},
    },
    used: [],
    generated: [],
    execution_duration: 'PT0.1S',
    generated_result_id: null,
    tune: null,
    ...rest,
  };
}

describe('kindFromActivityType — the PROV projection (FR-006, SC-002, SC-005)', () => {
  it("maps 'snapshot' → 'snapshot'", () => {
    expect(kindFromActivityType('snapshot')).toBe('snapshot');
  });

  it("maps 'tool' → 'tool'", () => {
    expect(kindFromActivityType('tool')).toBe('tool');
  });

  it("maps 'tune' → 'tune'", () => {
    expect(kindFromActivityType('tune')).toBe('tune');
  });

  it("maps undefined → 'tool' (FR-006 fallback)", () => {
    expect(kindFromActivityType(undefined)).toBe('tool');
  });

  it("maps null → 'tool' (FR-006 fallback)", () => {
    expect(kindFromActivityType(null)).toBe('tool');
  });

  it("does not throw — total function, non-throwing for all inputs (FR-006)", () => {
    expect(() => kindFromActivityType('snapshot')).not.toThrow();
    expect(() => kindFromActivityType(undefined)).not.toThrow();
    expect(() => kindFromActivityType(null)).not.toThrow();
  });
});

describe('toTimelineEntry — kind projection is PROV-sourced (FR-005, SC-005)', () => {
  it("emits kind: 'snapshot' when activity_type is 'snapshot', regardless of toolName", () => {
    // toolName is a snapshot-category tool in the legacy mapping, but that
    // must NOT influence the discriminator — only activity_type does.
    const entry = makeLogEntry({ tool: 'export-png', activity_type: 'snapshot' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('snapshot');
  });

  it("emits kind: 'tool' when activity_type is 'tool', regardless of toolName", () => {
    // Even for 'export-png' (which the legacy ToolCategory map labels
    // 'snapshot'), a PROV-stated 'tool' wins — this is the latent-bug fix.
    const entry = makeLogEntry({ tool: 'export-png', activity_type: 'tool' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('tool');
  });

  it("emits kind: 'tune' when activity_type is 'tune'", () => {
    const entry = makeLogEntry({ tool: 'calculate-range', activity_type: 'tune' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('tune');
  });

  it("emits kind: 'tool' when activity_type is absent (FR-006)", () => {
    const entry = makeLogEntry({ tool: 'export-png' });
    expect('activity_type' in entry).toBe(false);
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('tool');
  });

  it("emits kind: 'tool' when activity_type is null (FR-006)", () => {
    const entry = makeLogEntry({ tool: 'calculate-range', activity_type: null });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('tool');
  });

  it('is stable under repeat invocation (pure projection)', () => {
    const entry = makeLogEntry({ activity_type: 'snapshot' });
    const first = toTimelineEntry(entry);
    const second = toTimelineEntry(entry);
    expect(first.kind).toBe(second.kind);
    expect(first).toStrictEqual(second);
  });
});

describe('toTimelineEntry — SC-002 totality (every entry has a defined kind)', () => {
  it('every projection over a representative catalogue yields a defined kind', () => {
    const catalogue: LogEntry[] = [
      makeLogEntry({ tool: 'calculate-range' }),
      makeLogEntry({ tool: 'export-png', activity_type: 'snapshot' }),
      makeLogEntry({ tool: 'export-png', activity_type: 'tool' }),
      makeLogEntry({ tool: 'manual-checkpoint', activity_type: 'snapshot' }),
      makeLogEntry({ tool: 'import-rep' }),
      makeLogEntry({ tool: 'change-color', activity_type: null }),
      makeLogEntry({ tool: 'some-future-tool', activity_type: 'tune' }),
    ];
    for (const entry of catalogue) {
      const projected = toTimelineEntry(entry);
      expect(projected.kind).toBeDefined();
      expect(['snapshot', 'tool', 'tune']).toContain(projected.kind);
    }
  });
});
