/**
 * spec 267 (review 3A) — the openPlot clamp branch surfaces a NON-blocking
 * warning, and never an error, for a recoverable clamp. Closes the silent-clamp
 * gap (Article I.3). Exercises the exact helper `openPlot.ts` calls after
 * `hydrateStoreFromFeatures` returns clamps.
 */
import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  buildPlayheadClampMessage,
  notifyPlayheadClamps,
} from '../../src/services/playheadClampNotice';
import type { PlayheadClampDiagnostic } from '../../src/services/systemStateBridge';

const clamp = (edge: 'start' | 'end'): PlayheadClampDiagnostic => ({
  kind: 'playhead-clamped',
  featureId: 'state.temporal',
  edge,
  originalCurrentTime: '2024-02-01T00:00:00Z',
  clampedCurrentTime: edge === 'end' ? '2024-01-07T00:00:00Z' : '2024-01-01T00:00:00Z',
});

describe('buildPlayheadClampMessage', () => {
  it('returns null when no clamp occurred (valid plots are silent — FR-009)', () => {
    expect(buildPlayheadClampMessage([])).toBeNull();
  });

  it('names the window edge the playhead was moved to', () => {
    expect(buildPlayheadClampMessage([clamp('end')])).toMatch(/moved to the window end/);
    expect(buildPlayheadClampMessage([clamp('start')])).toMatch(/moved to the window start/);
  });
});

describe('notifyPlayheadClamps (review 3A)', () => {
  it('shows a non-blocking warning for a returned clamp and never an error', () => {
    notifyPlayheadClamps([clamp('end')]);
    expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringMatching(/saved time-cursor was outside/),
    );
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });

  it('shows nothing for an empty clamp array', () => {
    vi.clearAllMocks();
    notifyPlayheadClamps([]);
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });
});
