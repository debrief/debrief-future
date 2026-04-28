/**
 * Unit tests for the presentational StoryboardPanel (Feature 216, T2C2).
 *
 * Covers the 8-case matrix in `contracts/storyboard-panel-view.md §7`.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { StoryboardPanel } from '../StoryboardPanel';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
} from '../types';

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

  it('scene row has accessible aria-label (post #234 US3 a11y fix: role=listitem dropped)', () => {
    // 234 US3 fix (FR-022): role="list" + role="listitem" dropped because
    // SceneList interleaves rows with StaleBadge + SceneEditForm overlays
    // (axe-core aria-required-children — critical). Accessible name remains
    // via aria-label; the row is reachable + labelable for screen readers.
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
    expect(sceneRow.getAttribute('aria-label')).toBe('X — Y');
    expect(sceneRow.getAttribute('data-testid')).toBe('scene-row');
    // role=listitem intentionally absent — see FR-022 comment in SceneList.tsx
    expect(sceneRow.getAttribute('role')).toBeNull();
  });

  // ── #217 TransportRow + currentSceneId integration ─────────────────

  function transport(overrides: Partial<TransportViewModel> = {}): TransportViewModel {
    return {
      canGoBackward: overrides.canGoBackward ?? true,
      canGoForward: overrides.canGoForward ?? true,
      sceneNumber: overrides.sceneNumber ?? 1,
      sceneTotal: overrides.sceneTotal ?? 3,
      transitionInFlight: overrides.transitionInFlight ?? false,
    };
  }

  it('does NOT render TransportRow when transport prop is undefined', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    expect(screen.queryByTestId('transport-row')).toBeNull();
  });

  it('renders TransportRow when transport prop is provided', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        transport={transport({ sceneNumber: 1, sceneTotal: 1 })}
      />,
    );
    expect(screen.getByTestId('transport-row')).toBeTruthy();
  });

  it('marks the current-scene row with data-active="true" via currentSceneId', () => {
    render(
      <StoryboardPanel
        scenes={[
          row({ sceneId: 'a' }),
          row({ sceneId: 'b' }),
          row({ sceneId: 'c' }),
        ]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        currentSceneId="b"
        transport={transport({ sceneNumber: 2, sceneTotal: 3 })}
      />,
    );
    const rows = screen.getAllByTestId('scene-row');
    expect(rows[0]!.getAttribute('data-active')).not.toBe('true');
    expect(rows[1]!.getAttribute('data-active')).toBe('true');
    expect(rows[2]!.getAttribute('data-active')).not.toBe('true');
  });

  it('no row has data-active="true" when currentSceneId is not supplied', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' }), row({ sceneId: 'b' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    const rows = screen.getAllByTestId('scene-row');
    rows.forEach((r) => expect(r.getAttribute('data-active')).not.toBe('true'));
  });

  it('TransportRow Forward click fires onTransportForward', () => {
    const onTransportForward = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' }), row({ sceneId: 'b' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        currentSceneId="a"
        transport={transport({ sceneNumber: 1, sceneTotal: 2 })}
        onTransportForward={onTransportForward}
      />,
    );
    fireEvent.click(screen.getByTestId('transport-forward'));
    expect(onTransportForward).toHaveBeenCalledTimes(1);
  });

  it('TransportRow Backward click fires onTransportBackward', () => {
    const onTransportBackward = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' }), row({ sceneId: 'b' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        currentSceneId="b"
        transport={transport({ sceneNumber: 2, sceneTotal: 2 })}
        onTransportBackward={onTransportBackward}
      />,
    );
    fireEvent.click(screen.getByTestId('transport-backward'));
    expect(onTransportBackward).toHaveBeenCalledTimes(1);
  });

  // ── #217 StoryboardHeader integration (Phase 4.2 / T410) ──────────

  function sbOption(
    storyboardId: string,
    name = storyboardId.toUpperCase(),
    sceneCount = 1,
  ): StoryboardOptionViewModel {
    return {
      storyboardId,
      name,
      sceneCount,
      lastModifiedIso: '2026-04-20T14:00:00.000Z',
    };
  }

  it('does NOT render StoryboardHeader when storyboards prop is undefined', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
      />,
    );
    expect(screen.queryByTestId('storyboard-header')).toBeNull();
  });

  it('does NOT render StoryboardHeader when storyboards prop is empty', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        storyboards={[]}
      />,
    );
    expect(screen.queryByTestId('storyboard-header')).toBeNull();
  });

  it('renders StoryboardHeader above the Scene list when storyboards non-empty', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        storyboards={[sbOption('sb-a', 'Alpha'), sbOption('sb-b', 'Bravo')]}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('storyboard-header')).toBeTruthy();
  });

  it('header dropdown change fires onActiveStoryboardChange with storyboardId', () => {
    const onActiveStoryboardChange = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        storyboards={[sbOption('sb-a', 'Alpha'), sbOption('sb-b', 'Bravo')]}
        activeStoryboardId="sb-a"
        onActiveStoryboardChange={onActiveStoryboardChange}
      />,
    );
    const select = screen.getByTestId('storyboard-header-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'sb-b' } });
    expect(onActiveStoryboardChange).toHaveBeenCalledWith('sb-b');
  });

  // ─── #218 edit-suite wiring ────────────────────────────────────────

  it('renders SceneEditForm inline when sceneEditViewModels[sceneId].editFormOpen is true', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        sceneEditViewModels={{
          a: {
            sceneId: 'a',
            title: 'Opening',
            description: null,
            timestamp: '2026-04-20T10:00:00Z',
            titleIsEditing: false,
            editFormOpen: true,
            pendingDelete: false,
            stale: false,
            unresolvedFeatureIds: [],
            missingData: { kind: 'ok' },
          },
        }}
      />,
    );
    expect(screen.getByTestId('scene-edit-form')).toBeTruthy();
  });

  it('does NOT render SceneEditForm when editFormOpen is false', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        sceneEditViewModels={{
          a: {
            sceneId: 'a',
            title: 'Opening',
            description: null,
            timestamp: '2026-04-20T10:00:00Z',
            titleIsEditing: false,
            editFormOpen: false,
            pendingDelete: false,
            stale: false,
            unresolvedFeatureIds: [],
            missingData: { kind: 'ok' },
          },
        }}
      />,
    );
    expect(screen.queryByTestId('scene-edit-form')).toBeNull();
  });

  it('hides rows flagged pendingDelete (undo window active)', () => {
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' }), row({ sceneId: 'b' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        sceneEditViewModels={{
          a: {
            sceneId: 'a',
            title: 'Opening',
            description: null,
            timestamp: '2026-04-20T10:00:00Z',
            titleIsEditing: false,
            editFormOpen: false,
            pendingDelete: true,
            stale: false,
            unresolvedFeatureIds: [],
            missingData: { kind: 'ok' },
          },
        }}
      />,
    );
    const rows = screen.queryAllByTestId('scene-row');
    expect(rows.map((r) => r.getAttribute('data-scene-id'))).toEqual(['b']);
  });

  it('renders UndoToast when pendingUndoToast is set; Undo click fires onSceneUndoDeleteClicked', () => {
    const onSceneUndoDeleteClicked = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        pendingUndoToast={{
          sceneId: 'a',
          sceneTitle: 'Opening',
          deletedAt: '2026-04-24T12:00:00Z',
          canUndo: true,
        }}
        onSceneUndoDeleteClicked={onSceneUndoDeleteClicked}
      />,
    );
    fireEvent.click(screen.getByTestId('undo-toast-undo-button'));
    expect(onSceneUndoDeleteClicked).toHaveBeenCalledWith('a');
  });

  it('SceneEditForm row-action delete click surfaces via onSceneDeleteRequested', () => {
    const onSceneDeleteRequested = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        sceneEditViewModels={{
          a: {
            sceneId: 'a',
            title: 'Opening',
            description: null,
            timestamp: '2026-04-20T10:00:00Z',
            titleIsEditing: false,
            editFormOpen: true,
            pendingDelete: false,
            stale: false,
            unresolvedFeatureIds: [],
            missingData: { kind: 'ok' },
          },
        }}
        onSceneDeleteRequested={onSceneDeleteRequested}
      />,
    );
    fireEvent.click(screen.getByTestId('scene-edit-form-action-delete'));
    expect(onSceneDeleteRequested).toHaveBeenCalledWith('a');
  });

  // ── Feature 230 — in-panel affordances ─────────────────────────────

  it('chevron clicks surface onSceneRowExpandToggle (FR-001)', () => {
    const onSceneRowExpandToggle = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' }), row({ sceneId: 'b' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        onSceneRowExpandToggle={onSceneRowExpandToggle}
      />,
    );
    const chevrons = screen.getAllByTestId('scene-row-chevron');
    fireEvent.click(chevrons[1]!);
    expect(onSceneRowExpandToggle).toHaveBeenCalledWith('b');
  });

  it('renders the overflow menu when overflowMenuOpenFor is set (FR-003)', () => {
    const anchor = {
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      top: 0,
      right: 200,
      bottom: 30,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect;
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        overflowMenuOpenFor="a"
        overflowMenuAnchorRect={anchor}
        onSceneOverflowMenuClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('scene-overflow-menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(6);
  });

  it('overflow menu Delete click fires onSceneDeleteRequested (FR-005)', () => {
    const anchor = {
      x: 0,
      y: 0,
      width: 200,
      height: 30,
      top: 0,
      right: 200,
      bottom: 30,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const onSceneDeleteRequested = vi.fn();
    const onSceneOverflowMenuClose = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' })]}
        activeStoryboardName="Alpha"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        overflowMenuOpenFor="a"
        overflowMenuAnchorRect={anchor}
        onSceneOverflowMenuClose={onSceneOverflowMenuClose}
        onSceneDeleteRequested={onSceneDeleteRequested}
      />,
    );
    fireEvent.click(screen.getByTestId('scene-overflow-menuitem-delete'));
    expect(onSceneDeleteRequested).toHaveBeenCalledWith('a');
    expect(onSceneOverflowMenuClose).toHaveBeenCalled();
  });

  it('renders Refresh all stale (N) button with stale count (FR-012)', () => {
    const onStoryboardRefreshAllStaleClicked = vi.fn();
    render(
      <StoryboardPanel
        scenes={[row({ sceneId: 'a' }), row({ sceneId: 'b' })]}
        activeStoryboardName="Alpha"
        activeStoryboardId="sb-1"
        captureInFlight={false}
        onCaptureClick={() => undefined}
        onSceneRowClick={() => undefined}
        sceneEditViewModels={{
          a: {
            sceneId: 'a',
            title: 'A',
            description: null,
            timestamp: '2026-04-20T10:00:00Z',
            titleIsEditing: false,
            editFormOpen: false,
            pendingDelete: false,
            stale: true,
            unresolvedFeatureIds: ['f1'],
            missingData: { kind: 'ok' },
          },
          b: {
            sceneId: 'b',
            title: 'B',
            description: null,
            timestamp: '2026-04-20T10:05:00Z',
            titleIsEditing: false,
            editFormOpen: false,
            pendingDelete: false,
            stale: false,
            unresolvedFeatureIds: [],
            missingData: { kind: 'ok' },
          },
        }}
        onStoryboardRefreshAllStaleClicked={
          onStoryboardRefreshAllStaleClicked
        }
      />,
    );
    const button = screen.getByTestId('refresh-all-stale');
    expect(button.textContent).toContain('Refresh all stale (1)');
    fireEvent.click(button);
    expect(onStoryboardRefreshAllStaleClicked).toHaveBeenCalledWith('sb-1');
  });
});
