/**
 * spec 267 (FR-003) — surface a non-blocking notification when an orphaned
 * saved playhead is clamped to the plot's time-window edge on load.
 *
 * The shared SystemState helper emits typed `PlayheadClampDiagnostic` data; the
 * host decides how to render it (Article IV.1). In VS Code that is a
 * non-blocking `window.showWarningMessage` — never a modal. Per-plot load means
 * at most one clamp per load (FR-006 coalescing dropped), but the message
 * builder is written to handle the general case defensively.
 *
 * The message text is built by a pure, exported function so the wording — and
 * the "warn, don't error" decision (review 3A, closing the silent-clamp gap) —
 * is unit-testable without a VS Code host.
 */
import * as vscode from 'vscode';
import type { PlayheadClampDiagnostic } from './systemStateBridge';

/**
 * Build the analyst-facing clamp message, or `null` when there is nothing to
 * report (no clamp occurred). Names the edge the playhead was moved to so the
 * analyst can decide whether to re-scrub (FR-003 decision input).
 */
export function buildPlayheadClampMessage(
  clamps: readonly PlayheadClampDiagnostic[],
): string | null {
  if (clamps.length === 0) {
    return null;
  }
  const edge = clamps[0]?.edge === 'start' ? 'start' : 'end';
  const suffix =
    clamps.length > 1 ? ` (${clamps.length} saved time-cursors were adjusted)` : '';
  return `The saved time-cursor was outside this plot's time range and was moved to the window ${edge}${suffix}.`;
}

/**
 * Show the non-blocking clamp notification for the given diagnostics. No-op when
 * the array is empty (valid plots produce zero notifications — FR-009).
 */
export function notifyPlayheadClamps(clamps: readonly PlayheadClampDiagnostic[]): void {
  const message = buildPlayheadClampMessage(clamps);
  if (message !== null) {
    void vscode.window.showWarningMessage(message);
  }
}
