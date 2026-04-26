/**
 * Unit tests for the SceneRow chevron + double-click + right-click
 * affordances landed in Feature 230 (US1 + US2).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneRow } from '../SceneRow';
import type { SceneRowViewModel } from '../types';

function makeScene(
  overrides: Partial<SceneRowViewModel> = {},
): SceneRowViewModel {
  return {
    sceneId: 'scene-1',
    title: 'Opening',
    timestampIso: '2026-04-24T12:00:00Z',
    dtgLabel: '241200Z APR 26',
    thumbnailHref: 'data:image/svg+xml;utf8,test',
    state: { kind: 'ok' },
    ...overrides,
  };
}

describe('SceneRow — #217 baseline click behaviour', () => {
  it('single-click fires onClick with sceneId', () => {
    const onClick = vi.fn();
    render(<SceneRow scene={makeScene()} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('scene-row'));
    expect(onClick).toHaveBeenCalledWith('scene-1');
  });

  it('Enter key activates the row', () => {
    const onClick = vi.fn();
    render(<SceneRow scene={makeScene()} onClick={onClick} />);
    fireEvent.keyDown(screen.getByTestId('scene-row'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith('scene-1');
  });
});

describe('SceneRow — #230 chevron disclosure (FR-001)', () => {
  it('renders the chevron when onExpandToggle is provided', () => {
    const onExpandToggle = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onExpandToggle={onExpandToggle}
      />,
    );
    expect(screen.getByTestId('scene-row-chevron')).toBeInTheDocument();
  });

  it('does NOT render the chevron without the handler (#217 fallback)', () => {
    render(<SceneRow scene={makeScene()} onClick={vi.fn()} />);
    expect(screen.queryByTestId('scene-row-chevron')).toBeNull();
  });

  it('chevron click fires onExpandToggle but NOT onClick', () => {
    const onClick = vi.fn();
    const onExpandToggle = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={onClick}
        onExpandToggle={onExpandToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('scene-row-chevron'));
    expect(onExpandToggle).toHaveBeenCalledWith('scene-1');
    // The chevron stops propagation so the row's onClick must not fire.
    expect(onClick).not.toHaveBeenCalled();
  });

  it('aria-expanded reflects editFormOpen', () => {
    const { rerender } = render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onExpandToggle={vi.fn()}
        editFormOpen={false}
      />,
    );
    expect(screen.getByTestId('scene-row-chevron')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    rerender(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onExpandToggle={vi.fn()}
        editFormOpen={true}
      />,
    );
    expect(screen.getByTestId('scene-row-chevron')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

describe('SceneRow — #230 double-click disclosure (FR-002)', () => {
  it('double-click on row body fires onExpandToggle', () => {
    const onExpandToggle = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onExpandToggle={onExpandToggle}
      />,
    );
    fireEvent.doubleClick(screen.getByTestId('scene-row'));
    expect(onExpandToggle).toHaveBeenCalledWith('scene-1');
  });
});

describe('SceneRow — #230 overflow menu trigger (FR-003)', () => {
  it('renders the overflow trigger when onOverflowMenuOpen is provided', () => {
    const onOverflowMenuOpen = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onOverflowMenuOpen={onOverflowMenuOpen}
      />,
    );
    expect(screen.getByTestId('scene-overflow-trigger')).toBeInTheDocument();
  });

  it('right-click on row fires onOverflowMenuOpen with anchor rect', () => {
    const onOverflowMenuOpen = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onOverflowMenuOpen={onOverflowMenuOpen}
      />,
    );
    fireEvent.contextMenu(screen.getByTestId('scene-row'));
    expect(onOverflowMenuOpen).toHaveBeenCalledTimes(1);
    expect(onOverflowMenuOpen.mock.calls[0][0]).toBe('scene-1');
    expect(onOverflowMenuOpen.mock.calls[0][1]).toBeDefined();
  });

  it('Shift+F10 opens the overflow menu', () => {
    const onOverflowMenuOpen = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onOverflowMenuOpen={onOverflowMenuOpen}
      />,
    );
    fireEvent.keyDown(screen.getByTestId('scene-row'), {
      key: 'F10',
      shiftKey: true,
    });
    expect(onOverflowMenuOpen).toHaveBeenCalledTimes(1);
    expect(onOverflowMenuOpen.mock.calls[0][0]).toBe('scene-1');
  });

  it('ContextMenu key opens the overflow menu', () => {
    const onOverflowMenuOpen = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={vi.fn()}
        onOverflowMenuOpen={onOverflowMenuOpen}
      />,
    );
    fireEvent.keyDown(screen.getByTestId('scene-row'), {
      key: 'ContextMenu',
    });
    expect(onOverflowMenuOpen).toHaveBeenCalledTimes(1);
  });

  it('overflow trigger click fires onOverflowMenuOpen without onClick', () => {
    const onClick = vi.fn();
    const onOverflowMenuOpen = vi.fn();
    render(
      <SceneRow
        scene={makeScene()}
        onClick={onClick}
        onOverflowMenuOpen={onOverflowMenuOpen}
      />,
    );
    fireEvent.click(screen.getByTestId('scene-overflow-trigger'));
    expect(onOverflowMenuOpen).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SceneRow — pending state (#216 invariant)', () => {
  it('does NOT render the chevron or overflow trigger when pending', () => {
    const pending = makeScene({ state: { kind: 'pending' } });
    render(
      <SceneRow
        scene={pending}
        onClick={vi.fn()}
        onExpandToggle={vi.fn()}
        onOverflowMenuOpen={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('scene-row-chevron')).toBeNull();
    expect(screen.queryByTestId('scene-overflow-trigger')).toBeNull();
  });
});
