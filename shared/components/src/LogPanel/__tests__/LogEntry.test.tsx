/**
 * Component tests for LogEntry — rich card anatomy, aria, category icons.
 *
 * Feature: 176-log-panel-ux (T009)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogEntry } from '../LogEntry';
import { LOG_PANEL_STRINGS } from '../strings';
import type { TimelineEntry } from '../types';

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

const featureNames = { 'trk-1': 'HMS Alpha', 'trk-2': 'HMS Bravo' };

describe('LogEntry — card anatomy', () => {
  it('renders header, meta, and params rows', () => {
    const { container } = render(
      <LogEntry
        entry={entry()}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(container.querySelector('.log-panel__entry-header')).toBeTruthy();
    expect(container.querySelector('.log-panel__entry-meta')).toBeTruthy();
    expect(container.querySelector('.log-panel__entry-chips')).toBeTruthy();
  });

  it('renders stepIndex when provided', () => {
    const { container } = render(
      <LogEntry
        entry={entry()}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
        stepIndex={7}
      />
    );
    const step = container.querySelector('.log-panel__entry-step');
    expect(step?.textContent).toBe('7');
  });

  it('sets aria-selected and aria-label with step number', () => {
    render(
      <LogEntry
        entry={entry()}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={true}
        stepIndex={3}
      />
    );
    const card = screen.getByTestId('log-entry-a1');
    expect(card.getAttribute('aria-selected')).toBe('true');
    expect(card.getAttribute('aria-label')).toBe(
      LOG_PANEL_STRINGS.cardAriaLabel(3, 'bearing-between-tracks')
    );
  });

  it('toggles aria-selected with isSelected prop', () => {
    const { rerender } = render(
      <LogEntry
        entry={entry()}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(screen.getByTestId('log-entry-a1').getAttribute('aria-selected')).toBe('false');
    rerender(
      <LogEntry
        entry={entry()}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={true}
      />
    );
    expect(screen.getByTestId('log-entry-a1').getAttribute('aria-selected')).toBe('true');
  });

  it('shows rationale icon only when rationale is a non-empty string', () => {
    const { rerender, container } = render(
      <LogEntry
        entry={entry({ rationale: 'Because reasons' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(container.querySelector('[data-testid="rationale-icon"]')).toBeTruthy();

    rerender(
      <LogEntry
        entry={entry({ rationale: '' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(container.querySelector('[data-testid="rationale-icon"]')).toBeNull();
  });

  it('renders all track badges for multi-track entries', () => {
    render(
      <LogEntry
        entry={entry({ usedFeatureIds: ['trk-1', 'trk-2'] })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    const badges = screen.getAllByTestId('track-badge');
    expect(badges).toHaveLength(2);
  });

  it('uses resolveToolCategory icon for all 5 categories', () => {
    const names: Array<[string, string]> = [
      ['import-rep', 'import'],
      ['change-color', 'style'],
      ['bearing-between-tracks', 'calc'],
      ['time-filter', 'filter'],
      ['export-png', 'snapshot'],
    ];
    for (const [toolName, category] of names) {
      const { unmount } = render(
        <LogEntry
          entry={entry({ toolName })}
          featureNames={featureNames}
          viewMode="timeline"
          isSelected={false}
        />
      );
      expect(screen.getByTestId(`tool-category-icon-${category}`)).toBeTruthy();
      unmount();
    }
  });

  it('invokes onClick with entry when card is clicked', () => {
    const onClick = vi.fn();
    render(
      <LogEntry
        entry={entry()}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
        onClick={onClick}
      />
    );
    screen.getByTestId('log-entry-a1').click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ activity_id: 'a1' }));
  });
});
