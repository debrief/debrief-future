/**
 * Unit tests for the presentational StoryboardPanel (Feature 216, T2C2).
 *
 * Covers the 8-case matrix in `contracts/storyboard-panel-view.md §7`.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { StoryboardPanel } from '../StoryboardPanel';
import type { SceneRowViewModel } from '../types';

function row(overrides: Partial<SceneRowViewModel> & { sceneId: string }): SceneRowViewModel {
  return {
    sceneId: overrides.sceneId,
    title: overrides.title ?? `Scene ${overrides.sceneId}`,
    timestampIso: overrides.timestampIso ?? '2026-04-20T14:35:00.000Z',
    dtgLabel: overrides.dtgLabel ?? '201435Z APR 26',
    thumbnailHref: overrides.thumbnailHref ?? 'vscode-resource://thumb.png',
    state: overrides.state ?? { kind: 'ok' },
  };
}

describe('StoryboardPanel', () => {
  it('renders empty-state copy when activeStoryboardName is null', () => {
    render(
      <StoryboardPanel
        scenes={[]}
        activeStoryboardName={null}
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    const empty = screen.getByTestId('storyboard-empty-state');
    expect(empty.textContent).toMatch(/No Storyboards yet/);
    expect(screen.queryByTestId('scene-list')).toBeNull();
  });

  it('renders empty-Storyboard copy when scenes is empty but name is set', () => {
    render(
      <StoryboardPanel
        scenes={[]}
        activeStoryboardName="Exercise Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    expect(screen.getByTestId('storyboard-empty-storyboard').textContent).toMatch(
      /No Scenes yet/,
    );
    expect(screen.getByTestId('storyboard-name').textContent).toBe('Exercise Alpha');
    expect(screen.queryByTestId('scene-list')).toBeNull();
  });

  it('renders one row per scene in the supplied order', () => {
    render(
      <StoryboardPanel
        scenes={[
          row({ sceneId: 'a', dtgLabel: 'A-DTG' }),
          row({ sceneId: 'b', dtgLabel: 'B-DTG' }),
          row({ sceneId: 'c', dtgLabel: 'C-DTG' }),
        ]}
        activeStoryboardName="Exercise Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    const rows = screen.getAllByTestId('scene-row');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.getAttribute('data-scene-id')).toBe('a');
    expect(rows[1]!.getAttribute('data-scene-id')).toBe('b');
    expect(rows[2]!.getAttribute('data-scene-id')).toBe('c');
  });

  it('renders a pending row when captureInFlight is true, prepended to existing scenes', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Exercise Alpha"
        captureInFlight={true}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    const rows = screen.getAllByTestId('scene-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.getAttribute('data-state')).toBe('pending');
    expect(rows[1]!.getAttribute('data-scene-id')).toBe('a');
  });

  it('clicking the capture button invokes onCaptureClick', () => {
    const onCaptureClick = vi.fn();
    render(
      <StoryboardPanel
        scenes={[]}
        activeStoryboardName={null}
        captureInFlight={false}
        onCaptureClick={onCaptureClick}
        onSceneRowClick={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('capture-button'));
    expect(onCaptureClick).toHaveBeenCalledTimes(1);
  });

  it('clicking a scene row invokes onSceneRowClick with the sceneId', () => {
    const onSceneRowClick = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'abc123' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={onSceneRowClick}
      />,
    );
    fireEvent.click(screen.getByTestId('scene-row'));
    expect(onSceneRowClick).toHaveBeenCalledWith('abc123');
  });

  it('each row renders thumbnail, DTG label, and timestamp secondary line', () => {
    render(
      <StoryboardPanel
        scenes={[
          row({
            sceneId: 'a',
            dtgLabel: '201435Z APR 26',
            title: 'My custom title',
            timestampIso: '2026-04-20T14:35:00.000Z',
            thumbnailHref: 'vscode-resource://s.png',
          }),
        ]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    const sceneRow = screen.getByTestId('scene-row');
    expect(within(sceneRow).getByTestId('scene-row-dtg').textContent).toBe(
      '201435Z APR 26',
    );
    expect(within(sceneRow).getByTestId('scene-row-title').textContent).toBe(
      'My custom title',
    );
    expect(within(sceneRow).getByTestId('scene-row-timestamp').textContent).toBe(
      '2026-04-20T14:35:00.000Z',
    );
    const img = sceneRow.querySelector('img');
    expect(img?.getAttribute('src')).toBe('vscode-resource://s.png');
    expect(img?.getAttribute('width')).toBe('200');
    expect(img?.getAttribute('height')).toBe('150');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('scene row has accessible aria-label and role=listitem', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a', dtgLabel: 'X', title: 'Y' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    const sceneRow = screen.getByTestId('scene-row');
    expect(sceneRow.getAttribute('role')).toBe('listitem');
    expect(sceneRow.getAttribute('aria-label')).toBe('X — Y');
    expect(sceneRow.getAttribute('data-testid')).toBe('scene-row');
  });
});
