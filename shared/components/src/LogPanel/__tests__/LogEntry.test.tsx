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

  it('uses resolveToolCategory icon for all 5 categories (feature 207 manifest path)', () => {
    const names: Array<[string, 'import' | 'style' | 'calc' | 'filter' | 'snapshot']> = [
      ['import-rep', 'import'],
      ['change-color', 'style'],
      ['bearing-between-tracks', 'calc'],
      ['time-filter', 'filter'],
      ['export-png', 'snapshot'],
    ];
    // Feature 207: manifest-fed resolution replaces the static shim.
    // Supply a `toolCategories` map that assigns each test tool its expected
    // category — this is exactly what the extension host does via the
    // `tools:manifest` webview message in production.
    const toolCategories = Object.fromEntries(names);
    for (const [toolName, category] of names) {
      const { unmount } = render(
        <LogEntry
          entry={entry({ toolName })}
          featureNames={featureNames}
          viewMode="timeline"
          isSelected={false}
          toolCategories={toolCategories}
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

describe('LogEntry — kind-driven snapshot gate (Feature 208, schema-rooted)', () => {
  // Each of these cases exercises the kind discriminator directly. The gate
  // `isSnapshot = entry.kind === 'snapshot'` MUST read only entry.kind — not
  // entry.toolName — per FR-005 / SC-005. Every assertion below is invariant
  // against toolName to lock in decoupling.

  it("renders manual-checkpoint-placeholder when kind === 'snapshot', regardless of toolName", () => {
    // toolName is the non-snapshot 'bearing-between-tracks', but kind says snapshot.
    // Pre-migration, this would have rendered as a tool row (wrong).
    const { container } = render(
      <LogEntry
        entry={entry({ toolName: 'bearing-between-tracks', kind: 'snapshot' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(
      container.querySelector('[data-testid="manual-checkpoint-placeholder"]')
    ).toBeTruthy();
  });

  it("renders tool row when kind === 'tool', regardless of toolName (latent-bug fix for export-*)", () => {
    // toolName is 'export-png' — in pre-migration code, its ToolCategory was
    // 'snapshot' so the manual-checkpoint placeholder leaked onto export rows.
    // Post-migration, kind drives the gate; since kind === 'tool', the row is a
    // regular tool row with visible chips / duration.
    const { container } = render(
      <LogEntry
        entry={entry({ toolName: 'export-png', kind: 'tool' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(
      container.querySelector('[data-testid="manual-checkpoint-placeholder"]')
    ).toBeNull();
    expect(container.querySelector('.log-panel__entry-chips')).toBeTruthy();
  });

  it("falls back to tool row when kind is absent — even when toolName would have been snapshot pre-migration", () => {
    // T014 evidence: pre-migration, export-png with no kind rendered the
    // manual-checkpoint-placeholder (the latent bug). Post-migration, absent
    // kind → gate is false → tool row. Storybook fixtures that don't set kind
    // now behave correctly by default.
    const { container } = render(
      <LogEntry
        entry={entry({ toolName: 'export-png' /* no kind */ })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(
      container.querySelector('[data-testid="manual-checkpoint-placeholder"]')
    ).toBeNull();
  });

  it("treats kind === 'tune' as a tool row (no dedicated rendering in feature 208)", () => {
    // FR-007: unrecognised-for-rendering kinds land on the tool-row branch.
    // 'tune' is reserved in the contract but emits no placeholder.
    const { container } = render(
      <LogEntry
        entry={entry({ kind: 'tune' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(
      container.querySelector('[data-testid="manual-checkpoint-placeholder"]')
    ).toBeNull();
  });

  it('hides the duration element when kind === "snapshot" and renders it when kind === "tool"', () => {
    const snapshot = render(
      <LogEntry
        entry={entry({ kind: 'snapshot', execution_duration: 'PT0.25S' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(
      snapshot.container.querySelector('.log-panel__entry-duration')
    ).toBeNull();
    snapshot.unmount();

    const toolRow = render(
      <LogEntry
        entry={entry({ kind: 'tool', execution_duration: 'PT0.25S' })}
        featureNames={featureNames}
        viewMode="timeline"
        isSelected={false}
      />
    );
    expect(
      toolRow.container.querySelector('.log-panel__entry-duration')
    ).toBeTruthy();
  });
});
