/**
 * Component tests for LogEntry edge cases.
 *
 * Covers:
 *  - Snapshot entries: "Manual checkpoint" + duration omitted
 *  - "No parameters" placeholder
 *  - "+N more" overflow indicator
 *  - Disabled card: badge + opacity CSS class + remains clickable
 *
 * Feature: 176-log-panel-ux (T010)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogEntry } from '../LogEntry';
import { LOG_PANEL_STRINGS } from '../strings';
import type { TimelineEntry, ParameterValue } from '../types';

function buildParams(count: number): Record<string, ParameterValue> {
  const out: Record<string, ParameterValue> = {};
  for (let i = 0; i < count; i++) {
    out[`p${i}`] = { value: i, default: false };
  }
  return out;
}

function entry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    activity_id: 'a1',
    timestamp: '2026-04-19T10:20:30Z',
    toolName: 'bearing-between-tracks',
    tool_version: '1.0.0',
    parameters: { speed: { value: 30, default: false } },
    usedFeatureIds: ['trk-1'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.25S',
    generated_result_id: null,
    operationCategory: 'calculation',
    ...overrides,
  };
}

describe('LogEntry edge cases', () => {
  it('renders "Manual checkpoint" placeholder and omits duration for snapshot entries', () => {
    // Feature 208: snapshot rendering is gated on `entry.kind === 'snapshot'`
    // (PROV-side signal), not on `ToolCategory(toolName) === 'snapshot'`. The
    // fixture keeps `toolName: 'export-png'` to document that the gate is
    // independent of the tool — any entry explicitly flagged `kind: 'snapshot'`
    // renders this way, including an export-that-is-also-a-checkpoint.
    const { container } = render(
      <LogEntry
        entry={entry({ toolName: 'export-png', kind: 'snapshot' })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
        // Feature 207 Commit B — snapshot detection now reads from the
        // manifest map (static shim retired). Supply the map the
        // extension host would push in production.
        toolCategories={{ 'export-png': 'snapshot' }}
      />
    );
    expect(screen.getByTestId('manual-checkpoint-placeholder').textContent).toContain(
      LOG_PANEL_STRINGS.manualCheckpointLabel
    );
    // Duration hidden for snapshot entries
    expect(container.querySelector('.log-panel__entry-duration')).toBeNull();
  });

  it('renders "No parameters" placeholder when chips array is empty', () => {
    render(
      <LogEntry
        entry={entry({ parameters: {} })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(screen.getByTestId('no-params-placeholder').textContent).toContain(
      LOG_PANEL_STRINGS.noParametersLabel
    );
  });

  it('renders "+N more" overflow indicator when >5 params', () => {
    render(
      <LogEntry
        entry={entry({ parameters: buildParams(8) })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
      />
    );
    const overflow = screen.getByTestId('param-chip-overflow');
    expect(overflow.textContent).toContain(LOG_PANEL_STRINGS.paramOverflowLabel(3));
  });

  it('does not render overflow indicator when 5 or fewer params', () => {
    render(
      <LogEntry
        entry={entry({ parameters: buildParams(5) })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(screen.queryByTestId('param-chip-overflow')).toBeNull();
  });

  it('renders disabled badge and opacity class on disabled entries', () => {
    const { container } = render(
      <LogEntry
        entry={entry({ disabled: true })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(screen.getByTestId('badge-disabled')).toBeDefined();
    expect(container.querySelector('.log-panel__entry--disabled')).toBeTruthy();
  });

  it('disabled card remains clickable', () => {
    const onClick = vi.fn();
    render(
      <LogEntry
        entry={entry({ disabled: true })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
        onClick={onClick}
      />
    );
    screen.getByTestId('log-entry-a1').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('omits duration when execution_duration is empty', () => {
    const { container } = render(
      <LogEntry
        entry={entry({ execution_duration: '' })}
        featureNames={{}}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(container.querySelector('.log-panel__entry-duration')).toBeNull();
  });
});
