/**
 * Unit tests for collapseStoryboardEdits (Feature 218 — FR-EDIT-026 /
 * SC-013 / T092).
 */

import { describe, it, expect } from 'vitest';
import {
  collapseStoryboardEdits,
  STORYBOARD_EDIT_TOOL_NAME,
} from '../collapseStoryboardEdits';
import type { TimelineEntry } from '../types';

function editEntry(opts: {
  readonly activity_id: string;
  readonly timestamp: string;
  readonly op: string;
  readonly actor: string;
}): TimelineEntry {
  return {
    activity_id: opts.activity_id,
    timestamp: opts.timestamp,
    toolName: STORYBOARD_EDIT_TOOL_NAME,
    tool_version: '1',
    parameters: {
      op: { value: opts.op, default: false, tunable: false },
      actor: { value: opts.actor, default: false, tunable: false },
    },
    usedFeatureIds: [],
    generatedFeatureIds: [],
    execution_duration: 'PT0S',
    generated_result_id: null,
    operationCategory: 'tool',
    tuneAnnotation: null,
  } as unknown as TimelineEntry;
}

function otherEntry(opts: {
  readonly activity_id: string;
  readonly timestamp: string;
  readonly toolName: string;
}): TimelineEntry {
  return {
    activity_id: opts.activity_id,
    timestamp: opts.timestamp,
    toolName: opts.toolName,
    tool_version: '1',
    parameters: {},
    usedFeatureIds: [],
    generatedFeatureIds: [],
    execution_duration: 'PT0S',
    generated_result_id: null,
    operationCategory: 'tool',
    tuneAnnotation: null,
  } as unknown as TimelineEntry;
}

describe('collapseStoryboardEdits', () => {
  it('collapses ≥3 consecutive same-(op,actor) entries within 120s (FR-EDIT-026)', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:30Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:01:00Z', op: 'rename', actor: 'alice' }),
    ];
    const result = collapseStoryboardEdits(entries);
    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe('run');
    if (result[0]!.kind === 'run') {
      expect(result[0]!.entries).toHaveLength(3);
      expect(result[0]!.op).toBe('rename');
      expect(result[0]!.actor).toBe('alice');
    }
  });

  it('does NOT collapse 2 entries (below minimum run length)', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:30Z', op: 'rename', actor: 'alice' }),
    ];
    const result = collapseStoryboardEdits(entries);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.kind === 'entry')).toBe(true);
  });

  it('breaks the run when adjacent gap exceeds 120s (rolling window)', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:01:59Z', op: 'rename', actor: 'alice' }), // 119s — within
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:04:01Z', op: 'rename', actor: 'alice' }), // 122s — breaks
    ];
    const result = collapseStoryboardEdits(entries);
    // First two collapse? No — run of 2 is below minRunLength, so both expand.
    // Third is a standalone entry.
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.kind === 'entry')).toBe(true);
  });

  it('rolling window: 119s joins a run even past 120s cumulative (spec rolling semantics)', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:01:59Z', op: 'rename', actor: 'alice' }), // 119s
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:03:58Z', op: 'rename', actor: 'alice' }), // 119s vs b — within rolling window
    ];
    const result = collapseStoryboardEdits(entries);
    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe('run');
  });

  it('different actor breaks the run', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:30Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:00:45Z', op: 'rename', actor: 'bob' }),
      editEntry({ activity_id: 'd', timestamp: '2026-04-24T12:01:00Z', op: 'rename', actor: 'alice' }),
    ];
    const result = collapseStoryboardEdits(entries);
    // [a, b] run of 2 → expanded; [c] single; [d] single.
    expect(result).toHaveLength(4);
    expect(result.every((r) => r.kind === 'entry')).toBe(true);
  });

  it('different op breaks the run', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:10Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:00:20Z', op: 'describe', actor: 'alice' }),
      editEntry({ activity_id: 'd', timestamp: '2026-04-24T12:00:30Z', op: 'describe', actor: 'alice' }),
      editEntry({ activity_id: 'e', timestamp: '2026-04-24T12:00:40Z', op: 'describe', actor: 'alice' }),
    ];
    const result = collapseStoryboardEdits(entries);
    // [a,b] below threshold → expanded. [c,d,e] → collapsed.
    expect(result).toHaveLength(3);
    expect(result[0]!.kind).toBe('entry');
    expect(result[1]!.kind).toBe('entry');
    expect(result[2]!.kind).toBe('run');
  });

  it('non-storyboard-edit entries pass through as individual items', () => {
    const entries = [
      otherEntry({ activity_id: 'tool-1', timestamp: '2026-04-24T12:00:00Z', toolName: 'calc.range' }),
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:10Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:20Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:00:30Z', op: 'rename', actor: 'alice' }),
      otherEntry({ activity_id: 'tool-2', timestamp: '2026-04-24T12:00:40Z', toolName: 'calc.speed' }),
    ];
    const result = collapseStoryboardEdits(entries);
    expect(result).toHaveLength(3);
    expect(result[0]!.kind).toBe('entry');
    expect(result[1]!.kind).toBe('run');
    expect(result[2]!.kind).toBe('entry');
  });

  it('SC-013: input array is never mutated', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:30Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:01:00Z', op: 'rename', actor: 'alice' }),
    ];
    const before = JSON.stringify(entries);
    collapseStoryboardEdits(entries);
    expect(JSON.stringify(entries)).toBe(before);
  });

  it('empty input yields empty output', () => {
    expect(collapseStoryboardEdits([])).toEqual([]);
  });

  it('options.windowMs + options.minRunLength override defaults', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: '2026-04-24T12:00:05Z', op: 'rename', actor: 'alice' }),
    ];
    // minRunLength: 2 → 2-entry run should collapse.
    const result = collapseStoryboardEdits(entries, { minRunLength: 2 });
    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe('run');
  });

  it('malformed timestamps break the run (NaN guard)', () => {
    const entries = [
      editEntry({ activity_id: 'a', timestamp: '2026-04-24T12:00:00Z', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'b', timestamp: 'garbage', op: 'rename', actor: 'alice' }),
      editEntry({ activity_id: 'c', timestamp: '2026-04-24T12:00:30Z', op: 'rename', actor: 'alice' }),
    ];
    const result = collapseStoryboardEdits(entries);
    // Run can't form because of NaN gap; all 3 expand.
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.kind === 'entry')).toBe(true);
  });
});
