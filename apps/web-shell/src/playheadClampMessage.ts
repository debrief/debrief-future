/**
 * spec 267 (FR-003) — analyst-facing message for an orphaned-playhead clamp,
 * shared by every web-shell load path so the wording is single-sourced. Mirrors
 * the VS Code host's `buildPlayheadClampMessage` wording (the two hosts surface
 * the same recovery through their own non-modal surface — FR-010).
 */
import type { PlayheadClampDiagnostic } from '@debrief/session-state';

/** Auto-dismiss dwell (ms) for the clamp toast — long enough to read and notice. */
export const PLAYHEAD_CLAMP_NOTICE_MS = 6000;

/** Build the clamp toast text, or `null` when nothing was clamped (FR-009). */
export function buildPlayheadClampMessage(
  clamps: readonly PlayheadClampDiagnostic[],
): string | null {
  if (clamps.length === 0) {
    return null;
  }
  const edge = clamps[0]?.edge === 'start' ? 'start' : 'end';
  return `The saved time-cursor was outside this plot's time range and was moved to the window ${edge}.`;
}
