/**
 * Unit tests for the shared story-only mock handlers helper
 * (Feature 234, US1 — T008, T1A; replaces the deleted PortContext test
 * post-ADR-027).
 *
 * Pure-function over the reducer; no DOM-bound assertions, no Storybook,
 * no Playwright. Five cases per quickstart §1.2:
 *   (a) seed → state matches the fixture
 *   (b) onSceneTitleRenameCommit → state shows new title
 *   (c) onSceneDeleteRequested → row removed AND pendingUndoToast populated
 *   (d) knobs.induceCopyFailure → onSceneCopyToOtherClicked dispatches failure branch
 *   (e) knobs.induceRefreshFailure → onSceneRefreshThumbnailClicked retains stale flag
 */

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useStoryOnlyMockHandlers,
  type MockHandlersFixture,
  type MockOutboundRecorder,
} from '../storyOnlyMockHandlers';
import type {
  SceneEditViewModel,
  SceneRowViewModel,
  StoryboardEditViewModel,
} from '../../types';

// ── Fixture builders ────────────────────────────────────────────────────

function makeScene(
  sceneId: string,
  title: string,
  iso = '2026-04-26T14:00:00.000Z',
): SceneRowViewModel {
  return {
    sceneId,
    title,
    timestampIso: iso,
    dtgLabel: '261400Z APR 26',
    thumbnailHref: 'data:image/png;base64,AAAA',
    state: { kind: 'ok' },
  };
}

function makeEditVm(sceneId: string, title: string): SceneEditViewModel {
  return {
    sceneId,
    title,
    description: null,
    timestamp: '2026-04-26T14:00:00.000Z',
    titleIsEditing: false,
    editFormOpen: false,
    pendingDelete: false,
    stale: false,
    unresolvedFeatureIds: [],
    missingData: { kind: 'ok' },
  };
}

const STORYBOARD_VM: StoryboardEditViewModel = {
  storyboardId: 'sb-1',
  name: 'Alpha',
  description: null,
  nameIsEditing: false,
  descriptionExpanded: false,
  sceneCount: 3,
};

function makeFixture(): MockHandlersFixture {
  return {
    storyboards: [
      {
        storyboardId: 'sb-1',
        name: 'Alpha',
        sceneCount: 3,
        lastModifiedIso: '2026-04-26T14:00:00.000Z',
      },
      {
        storyboardId: 'sb-2',
        name: 'Bravo',
        sceneCount: 0,
        lastModifiedIso: '2026-04-26T13:00:00.000Z',
      },
    ],
    activeStoryboardId: 'sb-1',
    activeStoryboardName: 'Alpha',
    scenes: [
      makeScene('s1', 'Scene one', '2026-04-26T14:00:00.000Z'),
      makeScene('s2', 'Scene two', '2026-04-26T14:05:00.000Z'),
      makeScene('s3', 'Scene three', '2026-04-26T14:10:00.000Z'),
    ],
    sceneEditViewModels: {
      s1: makeEditVm('s1', 'Scene one'),
      s2: makeEditVm('s2', 'Scene two'),
      s3: makeEditVm('s3', 'Scene three'),
    },
    storyboardEditViewModel: STORYBOARD_VM,
  };
}

function recorder(): {
  events: Array<{ type: string; payload: Record<string, unknown> }>;
  record: MockOutboundRecorder;
} {
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  return {
    events,
    record: (type, payload) => events.push({ type, payload }),
  };
}

const FAKE_RECT = {
  x: 0,
  y: 0,
  width: 100,
  height: 20,
  top: 0,
  right: 100,
  bottom: 20,
  left: 0,
  toJSON: (): object => ({}),
} as DOMRect;

// ── Tests ───────────────────────────────────────────────────────────────

describe('useStoryOnlyMockHandlers — seed → state (T008 case a)', () => {
  it('mounts the fixture into reducer state', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() => useStoryOnlyMockHandlers(fixture));

    // useEffect runs synchronously during the initial render under
    // @testing-library/react's act-wrapped renderHook, so state already
    // reflects the snapshot-message dispatch.
    expect(result.current.state.sceneRows.map((s) => s.sceneId)).toEqual([
      's1',
      's2',
      's3',
    ]);
    expect(result.current.state.activeStoryboardId).toBe('sb-1');
    expect(result.current.state.activeStoryboardName).toBe('Alpha');
    expect(result.current.state.storyboardEditViewModel).toEqual(STORYBOARD_VM);
    expect(result.current.sceneEditViewModels.s1.title).toBe('Scene one');
  });

  it('seeds stale flags + pending-delete from optional initial overlay', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() =>
      useStoryOnlyMockHandlers(fixture, {
        initial: {
          staleSceneIds: ['s2'],
          pendingDeleteSceneIds: ['s3'],
          missingDataBySceneId: { s1: ['track-alpha'] },
        },
      }),
    );

    // Stale flag flowed through scene-stale-flags-updated.
    const s2Flag = result.current.state.staleFlags.get('s2');
    expect(s2Flag?.stale).toBe(true);
    // Pending-delete + missing-data made it onto the per-row VM.
    expect(result.current.sceneEditViewModels.s3.pendingDelete).toBe(true);
    expect(result.current.sceneEditViewModels.s1.missingData).toEqual({
      kind: 'missing-features',
      ids: ['track-alpha'],
    });
  });
});

describe('useStoryOnlyMockHandlers — handler → reducer dispatch (cases b, c)', () => {
  it('(b) onSceneTitleRenameCommit updates the row title', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() => useStoryOnlyMockHandlers(fixture));

    act(() => {
      result.current.handlers.onSceneTitleRenameCommit('s1', 'Renamed');
    });

    const row = result.current.state.sceneRows.find((r) => r.sceneId === 's1');
    expect(row?.title).toBe('Renamed');
    expect(result.current.sceneEditViewModels.s1.title).toBe('Renamed');
    expect(result.current.state.editFormOpenFor).toBeNull();
  });

  it('(c) onSceneDeleteRequested removes the row AND raises the undo toast', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() => useStoryOnlyMockHandlers(fixture));

    act(() => {
      result.current.handlers.onSceneDeleteRequested('s2');
    });

    expect(
      result.current.state.sceneRows.map((s) => s.sceneId),
    ).toEqual(['s1', 's3']);
    expect(result.current.state.pendingUndoToast).not.toBeNull();
    expect(result.current.state.pendingUndoToast?.sceneId).toBe('s2');
    expect(result.current.state.pendingUndoToast?.canUndo).toBe(true);
  });

  it('(c.2) onSceneUndoDeleteClicked restores the row + clears the toast', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() => useStoryOnlyMockHandlers(fixture));

    act(() => {
      result.current.handlers.onSceneDeleteRequested('s2');
    });
    act(() => {
      result.current.handlers.onSceneUndoDeleteClicked('s2');
    });

    expect(
      result.current.state.sceneRows.map((s) => s.sceneId),
    ).toEqual(['s1', 's2', 's3']);
    expect(result.current.state.pendingUndoToast).toBeNull();
  });
});

describe('useStoryOnlyMockHandlers — knobs (cases d, e)', () => {
  it('(d) induceCopyFailure routes the matching sceneId to the failure branch', () => {
    const fixture = makeFixture();
    const rec = recorder();
    const { result } = renderHook(() =>
      useStoryOnlyMockHandlers(fixture, {
        knobs: { induceCopyFailure: 's2' },
        recordOutbound: rec.record,
      }),
    );

    act(() => {
      result.current.handlers.onSceneCopyToOtherClicked('s2');
    });
    act(() => {
      result.current.handlers.onSceneCopyToOtherClicked('s1');
    });

    const types = rec.events.map((e) => e.type);
    expect(types).toContain('scene-copy-to-other-failed');
    expect(types).toContain('scene-copy-to-other-clicked');
    // s2 → failure, s1 → success.
    const s2 = rec.events.find((e) => e.payload.sceneId === 's2');
    expect(s2?.type).toBe('scene-copy-to-other-failed');
    const s1 = rec.events.find((e) => e.payload.sceneId === 's1');
    expect(s1?.type).toBe('scene-copy-to-other-clicked');
  });

  it('(e) induceRefreshFailure retains the stale flag on the matching sceneId', () => {
    const fixture = makeFixture();
    const rec = recorder();
    const { result } = renderHook(() =>
      useStoryOnlyMockHandlers(fixture, {
        initial: { staleSceneIds: ['s1', 's2'] },
        knobs: { induceRefreshFailure: 's1' },
        recordOutbound: rec.record,
      }),
    );

    expect(result.current.state.staleFlags.has('s1')).toBe(true);
    expect(result.current.state.staleFlags.has('s2')).toBe(true);

    // s1 → failure: stale flag retained.
    act(() => {
      result.current.handlers.onSceneRefreshThumbnailClicked('s1');
    });
    expect(result.current.state.staleFlags.has('s1')).toBe(true);
    expect(rec.events.some((e) => e.type === 'scene-refresh-failed')).toBe(true);

    // s2 → success: stale flag cleared.
    act(() => {
      result.current.handlers.onSceneRefreshThumbnailClicked('s2');
    });
    expect(result.current.state.staleFlags.has('s2')).toBe(false);
    expect(
      rec.events.some((e) => e.type === 'scene-refresh-thumbnail-clicked'),
    ).toBe(true);
  });

  it('(e.2) onStoryboardRefreshAllStaleClicked partial-failure retains only the failure scene', () => {
    const fixture = makeFixture();
    const rec = recorder();
    const { result } = renderHook(() =>
      useStoryOnlyMockHandlers(fixture, {
        initial: { staleSceneIds: ['s1', 's2', 's3'] },
        knobs: { induceRefreshFailure: 's2' },
        recordOutbound: rec.record,
      }),
    );

    expect(result.current.state.staleFlags.size).toBe(3);

    act(() => {
      result.current.handlers.onStoryboardRefreshAllStaleClicked('sb-1');
    });

    expect(Array.from(result.current.state.staleFlags.keys())).toEqual(['s2']);
    expect(
      rec.events.some(
        (e) => e.type === 'storyboard-refresh-all-stale-partial-failure',
      ),
    ).toBe(true);
  });
});

describe('useStoryOnlyMockHandlers — overflow menu wiring (regression)', () => {
  it('opens + closes the overflow menu via the shared dispatchers', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() => useStoryOnlyMockHandlers(fixture));

    act(() => {
      result.current.handlers.onSceneOverflowMenuOpen('s1', FAKE_RECT);
    });
    expect(result.current.state.overflowMenuOpenFor).toBe('s1');
    expect(result.current.state.overflowMenuAnchorRect).toBe(FAKE_RECT);

    act(() => {
      result.current.handlers.onSceneOverflowMenuClose();
    });
    expect(result.current.state.overflowMenuOpenFor).toBeNull();
  });

  it('expand-row-toggle flips editFormOpenFor', () => {
    const fixture = makeFixture();
    const { result } = renderHook(() => useStoryOnlyMockHandlers(fixture));

    act(() => {
      result.current.handlers.onSceneRowExpandToggle('s2');
    });
    expect(result.current.state.editFormOpenFor).toBe('s2');

    act(() => {
      result.current.handlers.onSceneEditFormCancel('s2');
    });
    expect(result.current.state.editFormOpenFor).toBeNull();
  });
});
