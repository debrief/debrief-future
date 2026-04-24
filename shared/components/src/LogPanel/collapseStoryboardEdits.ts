/**
 * LogPanel consecutive-same-op collapse (Feature 218 — FR-EDIT-026).
 *
 * Collapses runs of 3+ consecutive `debrief.storyboardEdit` timeline
 * entries that share the same (op, actor) within a **rolling** 120-
 * second window into a single collapsed group. The window is rolling
 * per the spec: each candidate entry checks whether its timestamp is
 * within 120 s of the preceding entry in the same run. An entry 121 s
 * after the previous breaks the run.
 *
 * This function is pure — no React, no state, no I/O — so it's
 * trivially unit-testable and trivially integratable into any
 * timeline renderer that opts in (gated on the VS Code setting
 * `debrief.logPanel.collapseConsecutiveSameOp`).
 *
 * SC-013: `getTimeline` output MUST be byte-identical with / without
 * the collapse — the collapse is rendering-only. Callers run the
 * collapser on a COPY of the entries array; the input is never
 * mutated.
 */

import type { TimelineEntry } from './types';

export const STORYBOARD_EDIT_TOOL_NAME = 'debrief.storyboardEdit';

const DEFAULT_WINDOW_MS = 120_000;
const DEFAULT_MIN_RUN_LENGTH = 3;

export interface CollapsedRun {
  readonly kind: 'run';
  /** All entries in the collapsed run, in the same order as the input. */
  readonly entries: readonly TimelineEntry[];
  /** The shared op name (e.g. `rename`, `update-to-current`). */
  readonly op: string;
  /** The shared actor. */
  readonly actor: string;
}

export interface CollapsedSingle {
  readonly kind: 'entry';
  readonly entry: TimelineEntry;
}

export type CollapsedTimelineItem = CollapsedRun | CollapsedSingle;

export interface CollapseOptions {
  /** Rolling-window size in milliseconds (default: 120 000). */
  readonly windowMs?: number;
  /** Minimum run length to trigger collapse (default: 3). */
  readonly minRunLength?: number;
}

function parseTimestamp(entry: TimelineEntry): number {
  return Date.parse(entry.timestamp);
}

function readParamString(entry: TimelineEntry, key: string): string | null {
  const pv = entry.parameters[key];
  if (!pv) {return null;}
  const value = pv.value;
  return typeof value === 'string' ? value : null;
}

/**
 * Read the (op, actor) pair from a storyboard-edit entry. Returns null
 * for non-storyboard-edit entries or if required params are missing.
 */
function readCollapseKey(
  entry: TimelineEntry,
): { readonly op: string; readonly actor: string } | null {
  if (entry.toolName !== STORYBOARD_EDIT_TOOL_NAME) {return null;}
  const op = readParamString(entry, 'op');
  const actor = readParamString(entry, 'actor');
  if (op === null || actor === null) {return null;}
  return { op, actor };
}

/**
 * Group consecutive storyboard-edit entries that share the same
 * (op, actor) within a rolling `windowMs`-millisecond gap between
 * adjacent entries. Runs with fewer than `minRunLength` entries stay
 * expanded (one `CollapsedSingle` per entry).
 *
 * Non-storyboard-edit entries always pass through as individual
 * `CollapsedSingle` items. They break a run the same way a
 * different-op storyboard-edit entry would.
 */
export function collapseStoryboardEdits(
  entries: readonly TimelineEntry[],
  options: CollapseOptions = {},
): CollapsedTimelineItem[] {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const minRun = options.minRunLength ?? DEFAULT_MIN_RUN_LENGTH;

  const output: CollapsedTimelineItem[] = [];
  let i = 0;
  while (i < entries.length) {
    const current = entries[i]!;
    const key = readCollapseKey(current);
    if (key === null) {
      output.push({ kind: 'entry', entry: current });
      i += 1;
      continue;
    }
    // Walk forward while the next entry matches (op, actor) AND falls
    // within windowMs of the previous entry's timestamp.
    const run: TimelineEntry[] = [current];
    let prevTs = parseTimestamp(current);
    let j = i + 1;
    while (j < entries.length) {
      const next = entries[j]!;
      const nextKey = readCollapseKey(next);
      if (
        nextKey === null ||
        nextKey.op !== key.op ||
        nextKey.actor !== key.actor
      ) {
        break;
      }
      const nextTs = parseTimestamp(next);
      if (Number.isNaN(nextTs) || Number.isNaN(prevTs)) {
        break;
      }
      if (Math.abs(nextTs - prevTs) > windowMs) {
        break;
      }
      run.push(next);
      prevTs = nextTs;
      j += 1;
    }
    if (run.length >= minRun) {
      output.push({
        kind: 'run',
        entries: run,
        op: key.op,
        actor: key.actor,
      });
    } else {
      for (const e of run) {
        output.push({ kind: 'entry', entry: e });
      }
    }
    i = j;
  }
  return output;
}
