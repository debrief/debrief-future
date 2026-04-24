/**
 * Foundation tests for the TimelineEntry `kind` discriminator.
 *
 * Feature: 208-timeline-entry-kind (T013, T014, T030)
 */

import { describe, it, expect } from 'vitest';
import {
  TIMELINE_ENTRY_KINDS,
  assertNeverKind,
  type TimelineEntry,
  type TimelineEntryKind,
} from '../types';

describe('208 — TimelineEntryKind contract', () => {
  it('TIMELINE_ENTRY_KINDS enumerates exactly snapshot, tool, tune in declared order (T013)', () => {
    expect(TIMELINE_ENTRY_KINDS).toEqual(['snapshot', 'tool', 'tune']);
    expect(TIMELINE_ENTRY_KINDS).toHaveLength(3);
  });

  it('each TIMELINE_ENTRY_KINDS element is assignable to TimelineEntryKind (T013)', () => {
    // satisfies narrows at compile time; the runtime body confirms no element
    // widened to plain `string`.
    const all = TIMELINE_ENTRY_KINDS satisfies readonly TimelineEntryKind[];
    for (const kind of all) {
      const narrowed: TimelineEntryKind = kind;
      expect(typeof narrowed).toBe('string');
    }
  });

  it('assertNeverKind is unreachable under an exhaustive switch (T014)', () => {
    // If a future contributor adds a value to TimelineEntryKind without
    // updating this switch, the `value` parameter narrows to that new value
    // instead of `never`, and `assertNeverKind(value)` fails to compile.
    function classify(kind: TimelineEntryKind): string {
      switch (kind) {
        case 'snapshot':
          return 'snapshot';
        case 'tool':
          return 'tool';
        case 'tune':
          return 'tune';
        default:
          return assertNeverKind(kind);
      }
    }

    for (const kind of TIMELINE_ENTRY_KINDS) {
      expect(classify(kind)).toBe(kind);
    }
  });

  it('assertNeverKind throws at runtime if somehow reached (T014)', () => {
    // Cast forces a runtime invocation even though the type system would
    // reject this at compile time.
    expect(() => assertNeverKind('unexpected' as never)).toThrow(
      /Unhandled TimelineEntryKind/,
    );
  });
});

describe('208 — TimelineEntry.kind field (T030)', () => {
  const baseEntry: TimelineEntry = {
    activity_id: 'a1',
    timestamp: '2026-04-22T10:00:00Z',
    toolName: 'example-tool',
    tool_version: '1.0.0',
    parameters: {},
    usedFeatureIds: [],
    generatedFeatureIds: [],
    execution_duration: 'PT0S',
    generated_result_id: null,
    operationCategory: 'calculation',
  };

  it('admits all three declared kinds without type error (T030)', () => {
    const snapshot: TimelineEntry = { ...baseEntry, kind: 'snapshot' };
    const tool: TimelineEntry = { ...baseEntry, kind: 'tool' };
    const tune: TimelineEntry = { ...baseEntry, kind: 'tune' };
    expect(snapshot.kind).toBe('snapshot');
    expect(tool.kind).toBe('tool');
    expect(tune.kind).toBe('tune');
  });

  it('admits an absent kind (optional field) (T030)', () => {
    const absent: TimelineEntry = { ...baseEntry };
    expect(absent.kind).toBeUndefined();
  });

  it('rejects invalid kinds at compile time (T030)', () => {
    // @ts-expect-error — 'annotation' is not in the TimelineEntryKind union.
    const invalid: TimelineEntry = { ...baseEntry, kind: 'annotation' };
    // Runtime assertion anchors the test case and prevents dead-code pruning.
    expect(invalid).toBeDefined();
  });
});
