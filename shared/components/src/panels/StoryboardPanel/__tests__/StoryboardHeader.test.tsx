/**
 * Unit tests for StoryboardHeader (Feature 217, T401).
 *
 * Covers:
 *   - Dropdown renders populated from `storyboards[]`
 *   - `activeStoryboardId` marks the matching option as selected
 *   - Overflow menu button opens on click
 *   - Menu items Create / Rename render (Delete moved to the panel header)
 *   - Rename item is hidden when `activeStoryboardId` is null
 *   - Accessibility attributes (aria-expanded, role="menu") present
 *   - Empty `storyboards` → component renders nothing (design-fix 3)
 *   - Dropdown change fires `onActiveStoryboardChange(storyboardId)`
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryboardHeader } from '../StoryboardHeader';
import type { StoryboardOptionViewModel } from '../types';

function opt(
  storyboardId: string,
  name = storyboardId.toUpperCase(),
  sceneCount = 1,
  lastModifiedIso = '2026-04-20T14:00:00.000Z',
): StoryboardOptionViewModel {
  return { storyboardId, name, sceneCount, lastModifiedIso };
}

const THREE: readonly StoryboardOptionViewModel[] = [
  opt('sb-a', 'Alpha'),
  opt('sb-b', 'Bravo'),
  opt('sb-c', 'Charlie'),
];

describe('StoryboardHeader', () => {
  it('renders nothing when storyboards is empty (design-fix 3)', () => {
    const { container } = render(
      <StoryboardHeader
        storyboards={[]}
        activeStoryboardId={null}
        onActiveStoryboardChange={() => undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a <select> populated from storyboards[]', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-b"
        onActiveStoryboardChange={() => undefined}
      />,
    );
    const select = screen.getByTestId('storyboard-header-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const options = Array.from(select.options);
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.value)).toEqual(['sb-a', 'sb-b', 'sb-c']);
    expect(options.map((o) => o.textContent)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('marks activeStoryboardId as the selected option', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-b"
        onActiveStoryboardChange={() => undefined}
      />,
    );
    const select = screen.getByTestId('storyboard-header-select') as HTMLSelectElement;
    expect(select.value).toBe('sb-b');
  });

  it('dropdown change fires onActiveStoryboardChange(storyboardId)', () => {
    const onActiveStoryboardChange = vi.fn();
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={onActiveStoryboardChange}
      />,
    );
    const select = screen.getByTestId('storyboard-header-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'sb-c' } });
    expect(onActiveStoryboardChange).toHaveBeenCalledWith('sb-c');
  });

  it('overflow menu button has aria-expanded=false when closed', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
        onCreateStoryboard={() => undefined}
      />,
    );
    const button = screen.getByTestId('storyboard-header-overflow');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('overflow menu opens on click and renders Create/Rename items', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
        onCreateStoryboard={() => undefined}
        onRenameStoryboard={() => undefined}
      />,
    );
    const button = screen.getByTestId('storyboard-header-overflow');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    const menu = screen.getByTestId('storyboard-header-menu');
    expect(menu.getAttribute('role')).toBe('menu');
    expect(screen.getByTestId('storyboard-header-menu-create')).toBeTruthy();
    expect(screen.getByTestId('storyboard-header-menu-rename')).toBeTruthy();
    // Delete is no longer in this menu — the panel header owns it.
    expect(screen.queryByTestId('storyboard-header-menu-delete')).toBeNull();
  });

  it('Rename item is hidden when activeStoryboardId is null', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId={null}
        onActiveStoryboardChange={() => undefined}
        onCreateStoryboard={() => undefined}
        onRenameStoryboard={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('storyboard-header-overflow'));
    expect(screen.getByTestId('storyboard-header-menu-create')).toBeTruthy();
    expect(screen.queryByTestId('storyboard-header-menu-rename')).toBeNull();
  });

  it('menu item is hidden when its corresponding callback is undefined', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
        onCreateStoryboard={() => undefined}
        // No onRenameStoryboard provided
      />,
    );
    fireEvent.click(screen.getByTestId('storyboard-header-overflow'));
    expect(screen.getByTestId('storyboard-header-menu-create')).toBeTruthy();
    expect(screen.queryByTestId('storyboard-header-menu-rename')).toBeNull();
  });

  it('clicking Create item fires onCreateStoryboard and closes the menu', () => {
    const onCreateStoryboard = vi.fn();
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
        onCreateStoryboard={onCreateStoryboard}
      />,
    );
    fireEvent.click(screen.getByTestId('storyboard-header-overflow'));
    fireEvent.click(screen.getByTestId('storyboard-header-menu-create'));
    expect(onCreateStoryboard).toHaveBeenCalledTimes(1);
    // Menu closes
    expect(screen.queryByTestId('storyboard-header-menu')).toBeNull();
  });

  it('clicking Rename item fires onRenameStoryboard and closes the menu', () => {
    const onRenameStoryboard = vi.fn();
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
        onRenameStoryboard={onRenameStoryboard}
      />,
    );
    fireEvent.click(screen.getByTestId('storyboard-header-overflow'));
    fireEvent.click(screen.getByTestId('storyboard-header-menu-rename'));
    expect(onRenameStoryboard).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('storyboard-header-menu')).toBeNull();
  });

  it('renders no overflow button when no management callbacks are provided', () => {
    render(
      <StoryboardHeader
        storyboards={THREE}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
        // No create / rename — overflow button should not render
      />,
    );
    expect(screen.queryByTestId('storyboard-header-overflow')).toBeNull();
  });
});
