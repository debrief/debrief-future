/**
 * Unit tests for SceneOverflowMenu (Feature 230 US2).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SceneOverflowMenu,
  type SceneOverflowMenuItem,
} from '../SceneOverflowMenu';

const ITEMS: readonly SceneOverflowMenuItem[] = [
  { id: 'edit-description', label: 'Edit description' },
  { id: 'update-to-current', label: 'Update to current' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'copy-to-other', label: 'Copy to other storyboard' },
  { id: 'delete', label: 'Delete' },
  { id: 'refresh-thumbnail', label: 'Refresh thumbnail' },
];

const FAKE_RECT = {
  x: 100,
  y: 100,
  width: 200,
  height: 30,
  top: 100,
  right: 300,
  bottom: 130,
  left: 100,
  toJSON: (): object => ({}),
} as DOMRect;

describe('SceneOverflowMenu — rendering', () => {
  it('renders role=menu with six role=menuitem children', () => {
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel="Actions for scene Alpha"
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-label', 'Actions for scene Alpha');
    expect(screen.getAllByRole('menuitem')).toHaveLength(6);
  });

  it('carries data-scene-id for selection', () => {
    render(
      <SceneOverflowMenu
        sceneId="scene-xyz"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('scene-overflow-menu')).toHaveAttribute(
      'data-scene-id',
      'scene-xyz',
    );
  });

  it('focuses the first menu item on mount', async () => {
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const first = screen.getByTestId('scene-overflow-menuitem-edit-description');
    expect(document.activeElement).toBe(first);
  });
});

describe('SceneOverflowMenu — activation', () => {
  it('clicking an item fires onAction + onClose', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={onAction}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('scene-overflow-menuitem-delete'));
    expect(onAction).toHaveBeenCalledWith('delete', 'scene-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('Enter on focused item also activates', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={onAction}
        onClose={onClose}
      />,
    );
    const item = screen.getByTestId('scene-overflow-menuitem-delete');
    item.focus();
    // Browser fires a click event for Enter on <button> — simulate the
    // same outcome by firing click directly.
    fireEvent.click(item);
    expect(onAction).toHaveBeenCalledWith('delete', 'scene-1');
  });
});

describe('SceneOverflowMenu — keyboard navigation', () => {
  it('ArrowDown moves focus to the next item', () => {
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const first = screen.getByTestId(
      'scene-overflow-menuitem-edit-description',
    );
    const second = screen.getByTestId(
      'scene-overflow-menuitem-update-to-current',
    );
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
  });

  it('ArrowUp wraps to the last item from the first', () => {
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const first = screen.getByTestId(
      'scene-overflow-menuitem-edit-description',
    );
    const last = screen.getByTestId(
      'scene-overflow-menuitem-refresh-thumbnail',
    );
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(last);
  });

  it('Escape fires onClose', () => {
    const onClose = vi.fn();
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Home/End jump to first/last', () => {
    render(
      <SceneOverflowMenu
        sceneId="scene-1"
        anchorRect={FAKE_RECT}
        items={ITEMS}
        ariaLabel=""
        onAction={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const first = screen.getByTestId(
      'scene-overflow-menuitem-edit-description',
    );
    const last = screen.getByTestId(
      'scene-overflow-menuitem-refresh-thumbnail',
    );
    first.focus();
    fireEvent.keyDown(first, { key: 'End' });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Home' });
    expect(document.activeElement).toBe(first);
  });
});
