/**
 * Unit tests for the TimelineEntry kind populator in logPanelView.
 *
 * Feature: 208-timeline-entry-kind (T020).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import type { LogEntry } from '@debrief/session-state';
import { toTimelineEntry } from '../../src/views/logPanelView';

function makeLogEntry(overrides: Partial<LogEntry> & { tool: string }): LogEntry {
  return {
    activity_id: 'a1',
    timestamp: '2026-04-22T10:00:00Z',
    was_generated_by: {
      tool: overrides.tool,
      tool_version: '1.0.0',
      parameters: {},
    },
    used: [],
    generated: [],
    execution_duration: 'PT0S',
    generated_result_id: null,
    tune: null,
    ...('deleted' in overrides ? { deleted: overrides.deleted } : {}),
    ...('disabled' in overrides ? { disabled: overrides.disabled } : {}),
    ...('rationale' in overrides ? { rationale: overrides.rationale } : {}),
    ...('input_state' in overrides ? { input_state: overrides.input_state } : {}),
    ...(overrides.was_generated_by ? { was_generated_by: overrides.was_generated_by } : {}),
    ...(overrides.tune !== undefined ? { tune: overrides.tune } : {}),
    ...(overrides.used ? { used: overrides.used } : {}),
    ...(overrides.generated ? { generated: overrides.generated } : {}),
  } as LogEntry;
}

describe('208 — toTimelineEntry kind populator', () => {
  it('maps a snapshot tool (export-png) to kind: "snapshot"', () => {
    const entry = makeLogEntry({ tool: 'export-png' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('snapshot');
  });

  it('maps another snapshot tool (export-csv) to kind: "snapshot"', () => {
    const entry = makeLogEntry({ tool: 'export-csv' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('snapshot');
  });

  it('maps a non-snapshot tool (bearing-between-tracks) to kind: "tool"', () => {
    const entry = makeLogEntry({ tool: 'bearing-between-tracks' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('tool');
  });

  it('maps an unmapped tool (unknown fallback) to kind: "tool"', () => {
    const entry = makeLogEntry({ tool: 'some-unknown-tool-id' });
    const projected = toTimelineEntry(entry);
    expect(projected.kind).toBe('tool');
  });

  it('does NOT emit kind: "tune" even for an entry with a non-null tune annotation', () => {
    const entry = makeLogEntry({
      tool: 'change-color',
      tune: {
        timestamp: '2026-04-22T10:00:00Z',
        parameter: 'color',
        previous_value: '#ff0000',
        new_value: '#00ff00',
      },
    });
    const projected = toTimelineEntry(entry);
    // Per spec.md R5 and FR-005: 'tune' is reserved but not emitted in feature 208.
    expect(projected.kind).toBe('tool');
    expect(projected.kind).not.toBe('tune');
  });

  it('produces stable results under repeat invocation', () => {
    const entry = makeLogEntry({ tool: 'export-geojson' });
    const first = toTimelineEntry(entry);
    const second = toTimelineEntry(entry);
    expect(first.kind).toBe(second.kind);
    expect(first.kind).toBe('snapshot');
  });
});
