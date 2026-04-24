/**
 * Component tests for LogActionBar — 4-tab ARIA tablist + keyboard nav.
 *
 * Feature: 176-log-panel-ux (T013)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogActionBar } from '../LogActionBar';
import type { ViewMode } from '../types';

const MODES: ViewMode[] = ['timeline', 'by-feature', 'compact', 'detailed'];

describe('LogActionBar — 4-tab tablist', () => {
  it('renders role=tablist with exactly 4 role=tab children', () => {
    render(
      <LogActionBar selectedEntryId={null} viewMode="timeline" />
    );
    const tablist = screen.getByTestId('log-view-mode-toggle');
    expect(tablist.getAttribute('role')).toBe('tablist');
    const tabs = tablist.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(4);
  });

  it('has exactly one aria-selected=true at a time', () => {
    render(
      <LogActionBar selectedEntryId={null} viewMode="compact" />
    );
    const selected = Array.from(
      screen.getByTestId('log-view-mode-toggle').querySelectorAll('[aria-selected="true"]')
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]!.getAttribute('data-testid')).toBe('log-view-mode-compact');
  });

  it('active tab has tabIndex=0, others have tabIndex=-1', () => {
    render(
      <LogActionBar selectedEntryId={null} viewMode="by-feature" />
    );
    for (const mode of MODES) {
      const btn = screen.getByTestId(`log-view-mode-${mode}`);
      expect(btn.getAttribute('tabindex')).toBe(mode === 'by-feature' ? '0' : '-1');
    }
  });

  it('ArrowRight cycles selection forward and wraps', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LogActionBar selectedEntryId={null} viewMode="timeline" onViewModeChange={onChange} />
    );
    fireEvent.keyDown(screen.getByTestId('log-view-mode-timeline'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('by-feature');

    rerender(
      <LogActionBar selectedEntryId={null} viewMode="detailed" onViewModeChange={onChange} />
    );
    fireEvent.keyDown(screen.getByTestId('log-view-mode-detailed'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('timeline');
  });

  it('ArrowLeft cycles selection backward and wraps', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LogActionBar selectedEntryId={null} viewMode="by-feature" onViewModeChange={onChange} />
    );
    fireEvent.keyDown(screen.getByTestId('log-view-mode-by-feature'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('timeline');

    rerender(
      <LogActionBar selectedEntryId={null} viewMode="timeline" onViewModeChange={onChange} />
    );
    fireEvent.keyDown(screen.getByTestId('log-view-mode-timeline'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('detailed');
  });

  it('Home jumps to first tab, End jumps to last tab', () => {
    const onChange = vi.fn();
    render(
      <LogActionBar selectedEntryId={null} viewMode="compact" onViewModeChange={onChange} />
    );
    fireEvent.keyDown(screen.getByTestId('log-view-mode-compact'), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('detailed');

    fireEvent.keyDown(screen.getByTestId('log-view-mode-compact'), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('timeline');
  });

  it('click on a tab triggers onViewModeChange', () => {
    const onChange = vi.fn();
    render(
      <LogActionBar selectedEntryId={null} viewMode="timeline" onViewModeChange={onChange} />
    );
    fireEvent.click(screen.getByTestId('log-view-mode-detailed'));
    expect(onChange).toHaveBeenCalledWith('detailed');
  });
});
