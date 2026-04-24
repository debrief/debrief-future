/**
 * Unit tests for the Storyboard edit reducer (Feature 230).
 *
 * Covers every action from data-model.md §Action Union plus the state
 * invariants (T1..T4 transitions + reducer-purity + idempotency).
 */

import { describe, expect, it } from 'vitest';
import {
  composeSceneEditViewModels,
  createInitialStoryboardEditState,
  storyboardEditReducer,
  type StaleFlagEntry,
  type StoryboardEditReducerState,
  type UndoToastDescriptor,
} from '../useStoryboardEditReducer';
import type {
  SceneRowViewModel,
  TransportViewModel,
} from '../types';

function makeScene(
  id: string,
  iso = '2026-04-20T14:00:00.000Z',
): SceneRowViewModel {
  return {
    sceneId: id,
    title: `Scene ${id}`,
    timestampIso: iso,
    dtgLabel: '201400Z APR 26',
    thumbnailHref: 'data:image/png;base64,AAAA',
    state: { kind: 'ok' },
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

const TRANSPORT: TransportViewModel = {
  canGoBackward: false,
  canGoForward: true,
  sceneNumber: 1,
  sceneTotal: 3,
  transitionInFlight: false,
};

function seeded(
  overrides?: Partial<StoryboardEditReducerState>,
): StoryboardEditReducerState {
  return createInitialStoryboardEditState({
    sceneRows: [makeScene('S1'), makeScene('S2'), makeScene('S3')],
    activeStoryboardId: 'sb-1',
    activeStoryboardName: 'Alpha',
    ...overrides,
  });
}

describe('storyboardEditReducer — scenes-message', () => {
  it('applies scene rows and active storyboard metadata', () => {
    const s = createInitialStoryboardEditState();
    const next = storyboardEditReducer(s, {
      type: 'scenes-message',
      payload: {
        scenes: [makeScene('S1'), makeScene('S2')],
        activeStoryboardName: 'Alpha',
        activeStoryboardId: 'sb-1',
      },
    });
    expect(next.sceneRows.map((r) => r.sceneId)).toEqual(['S1', 'S2']);
    expect(next.activeStoryboardId).toBe('sb-1');
    expect(next.activeStoryboardName).toBe('Alpha');
  });

  it('closes an open edit form when the target row disappears', () => {
    const s = seeded({ editFormOpenFor: 'S2' });
    const next = storyboardEditReducer(s, {
      type: 'scenes-message',
      payload: {
        scenes: [makeScene('S1'), makeScene('S3')], // S2 dropped
        activeStoryboardName: 'Alpha',
        activeStoryboardId: 'sb-1',
      },
    });
    expect(next.editFormOpenFor).toBeNull();
  });

  it('preserves an open edit form when its row is still present', () => {
    const s = seeded({ editFormOpenFor: 'S2' });
    const next = storyboardEditReducer(s, {
      type: 'scenes-message',
      payload: {
        scenes: [makeScene('S1'), makeScene('S2'), makeScene('S3')],
        activeStoryboardName: 'Alpha',
        activeStoryboardId: 'sb-1',
      },
    });
    expect(next.editFormOpenFor).toBe('S2');
  });
});

describe('storyboardEditReducer — snapshot-message', () => {
  it('applies the full snapshot payload and preserves edit form', () => {
    const s = seeded({ editFormOpenFor: 'S1' });
    const next = storyboardEditReducer(s, {
      type: 'snapshot-message',
      payload: {
        storyboards: [],
        scenes: [makeScene('S1'), makeScene('S2')],
        activeStoryboardId: 'sb-1',
        activeStoryboardName: 'Alpha',
        currentSceneId: 'S1',
        transport: TRANSPORT,
      },
    });
    expect(next.transport).toBe(TRANSPORT);
    expect(next.currentSceneId).toBe('S1');
    expect(next.editFormOpenFor).toBe('S1');
  });
});

describe('storyboardEditReducer — expand-row-toggle (T1)', () => {
  it('opens the form for the given row', () => {
    const next = storyboardEditReducer(seeded(), {
      type: 'expand-row-toggle',
      sceneId: 'S1',
    });
    expect(next.editFormOpenFor).toBe('S1');
  });

  it('toggles the form closed when called twice on the same row', () => {
    const s1 = storyboardEditReducer(seeded(), {
      type: 'expand-row-toggle',
      sceneId: 'S1',
    });
    const s2 = storyboardEditReducer(s1, {
      type: 'expand-row-toggle',
      sceneId: 'S1',
    });
    expect(s2.editFormOpenFor).toBeNull();
  });

  it('closes the previous form when a different row expands (FR-004)', () => {
    const s1 = storyboardEditReducer(seeded(), {
      type: 'expand-row-toggle',
      sceneId: 'S1',
    });
    const s2 = storyboardEditReducer(s1, {
      type: 'expand-row-toggle',
      sceneId: 'S2',
    });
    expect(s2.editFormOpenFor).toBe('S2');
  });

  it('silently drops unknown sceneId', () => {
    const s1 = seeded();
    const next = storyboardEditReducer(s1, {
      type: 'expand-row-toggle',
      sceneId: 'missing',
    });
    expect(next).toBe(s1);
  });
});

describe('storyboardEditReducer — scene-edit-form-close', () => {
  it('closes the open form', () => {
    const next = storyboardEditReducer(seeded({ editFormOpenFor: 'S1' }), {
      type: 'scene-edit-form-close',
    });
    expect(next.editFormOpenFor).toBeNull();
  });

  it('returns the same reference when already closed (idempotent)', () => {
    const s = seeded();
    const next = storyboardEditReducer(s, { type: 'scene-edit-form-close' });
    expect(next).toBe(s);
  });
});

describe('storyboardEditReducer — scene-edit-form-open (inbound I1)', () => {
  it('opens the named row from the extension', () => {
    const next = storyboardEditReducer(seeded(), {
      type: 'scene-edit-form-open',
      sceneId: 'S3',
    });
    expect(next.editFormOpenFor).toBe('S3');
  });

  it('ignores unknown sceneId', () => {
    const s = seeded();
    const next = storyboardEditReducer(s, {
      type: 'scene-edit-form-open',
      sceneId: 'unknown',
    });
    expect(next).toBe(s);
  });
});

describe('storyboardEditReducer — scene-stale-flags-updated (T3)', () => {
  it('replaces the staleFlags map entirely (not merge)', () => {
    const s1 = storyboardEditReducer(seeded(), {
      type: 'scene-stale-flags-updated',
      flags: [
        { sceneId: 'S1', stale: true, unresolvedFeatureIds: ['f1'] },
        { sceneId: 'S2', stale: true, unresolvedFeatureIds: ['f2'] },
      ],
    });
    expect(s1.staleFlags.size).toBe(2);
    const s2 = storyboardEditReducer(s1, {
      type: 'scene-stale-flags-updated',
      flags: [{ sceneId: 'S3', stale: true, unresolvedFeatureIds: ['f3'] }],
    });
    expect(s2.staleFlags.size).toBe(1);
    expect(s2.staleFlags.get('S1')).toBeUndefined();
    expect(s2.staleFlags.get('S3')?.unresolvedFeatureIds).toEqual(['f3']);
  });

  it('clears the map on empty flags array', () => {
    const s1 = storyboardEditReducer(seeded(), {
      type: 'scene-stale-flags-updated',
      flags: [{ sceneId: 'S1', stale: true, unresolvedFeatureIds: ['f1'] }],
    });
    const s2 = storyboardEditReducer(s1, {
      type: 'scene-stale-flags-updated',
      flags: [],
    });
    expect(s2.staleFlags.size).toBe(0);
  });
});

describe('storyboardEditReducer — scene-undo-toast-shown (T2)', () => {
  it('stores the descriptor', () => {
    const toast: UndoToastDescriptor = {
      sceneId: 'S2',
      sceneTitle: 'Scene 2',
      deletedAt: '2026-04-20T14:30:00.000Z',
      canUndo: true,
    };
    const next = storyboardEditReducer(seeded(), {
      type: 'scene-undo-toast-shown',
      toast,
    });
    expect(next.pendingUndoToast).toEqual(toast);
  });

  it('clears the descriptor when passed null', () => {
    const toast: UndoToastDescriptor = {
      sceneId: 'S2',
      sceneTitle: 'Scene 2',
      deletedAt: '2026-04-20T14:30:00.000Z',
      canUndo: true,
    };
    const s1 = seeded({ pendingUndoToast: toast });
    const s2 = storyboardEditReducer(s1, {
      type: 'scene-undo-toast-shown',
      toast: null,
    });
    expect(s2.pendingUndoToast).toBeNull();
  });
});

describe('storyboardEditReducer — scene-undo-toast-dismissed (local)', () => {
  it('clears pendingUndoToast without asking the extension', () => {
    const toast: UndoToastDescriptor = {
      sceneId: 'S2',
      sceneTitle: 'Scene 2',
      deletedAt: '2026-04-20T14:30:00.000Z',
      canUndo: true,
    };
    const s = seeded({ pendingUndoToast: toast });
    const next = storyboardEditReducer(s, {
      type: 'scene-undo-toast-dismissed',
    });
    expect(next.pendingUndoToast).toBeNull();
  });
});

describe('storyboardEditReducer — overflow menu (T4)', () => {
  it('opens the menu with an anchor rect', () => {
    const next = storyboardEditReducer(seeded(), {
      type: 'overflow-menu-open',
      sceneId: 'S2',
      anchorRect: FAKE_RECT,
    });
    expect(next.overflowMenuOpenFor).toBe('S2');
    expect(next.overflowMenuAnchorRect).toBe(FAKE_RECT);
  });

  it('enforces the invariant (open → rect non-null)', () => {
    const next = storyboardEditReducer(seeded(), {
      type: 'overflow-menu-open',
      sceneId: 'S2',
      anchorRect: FAKE_RECT,
    });
    if (next.overflowMenuOpenFor !== null) {
      expect(next.overflowMenuAnchorRect).not.toBeNull();
    }
  });

  it('close-menu clears both fields', () => {
    const s1 = storyboardEditReducer(seeded(), {
      type: 'overflow-menu-open',
      sceneId: 'S1',
      anchorRect: FAKE_RECT,
    });
    const s2 = storyboardEditReducer(s1, { type: 'overflow-menu-close' });
    expect(s2.overflowMenuOpenFor).toBeNull();
    expect(s2.overflowMenuAnchorRect).toBeNull();
  });

  it('drops unknown sceneId for overflow-menu-open', () => {
    const s = seeded();
    const next = storyboardEditReducer(s, {
      type: 'overflow-menu-open',
      sceneId: 'unknown',
      anchorRect: FAKE_RECT,
    });
    expect(next).toBe(s);
  });
});

describe('storyboardEditReducer — theme and capture', () => {
  it('updates theme', () => {
    const next = storyboardEditReducer(seeded(), {
      type: 'theme-changed',
      theme: 'light',
    });
    expect(next.theme).toBe('light');
  });

  it('updates captureInFlight', () => {
    const next = storyboardEditReducer(seeded(), {
      type: 'capture-in-flight',
      inFlight: true,
    });
    expect(next.captureInFlight).toBe(true);
  });
});

describe('composeSceneEditViewModels', () => {
  it('overlays editFormOpen from reducer state on baseline VM', () => {
    const base = seeded({
      editFormOpenFor: 'S2',
      sceneEditViewModelsFromExtension: {
        S2: {
          sceneId: 'S2',
          title: 'Scene S2',
          description: 'hello',
          timestamp: '2026-04-20T14:00:00.000Z',
          titleIsEditing: false,
          editFormOpen: false,
          pendingDelete: false,
          stale: false,
          unresolvedFeatureIds: [],
          missingData: { kind: 'ok' },
        },
      },
    });
    const out = composeSceneEditViewModels(base);
    expect(out['S2'].editFormOpen).toBe(true);
    expect(out['S2'].description).toBe('hello');
  });

  it('overlays staleFlags from dedicated inbound message', () => {
    const flags: StaleFlagEntry[] = [
      { sceneId: 'S1', stale: true, unresolvedFeatureIds: ['f1', 'f2'] },
    ];
    const base = seeded({ staleFlags: new Map(flags.map((f) => [f.sceneId, f])) });
    const out = composeSceneEditViewModels(base);
    expect(out['S1'].stale).toBe(true);
    expect(out['S1'].unresolvedFeatureIds).toEqual(['f1', 'f2']);
    expect(out['S2'].stale).toBe(false);
  });

  it('synthesises a minimal VM when no baseline present', () => {
    const out = composeSceneEditViewModels(seeded());
    expect(Object.keys(out).length).toBe(3);
    expect(out['S1'].pendingDelete).toBe(false);
    expect(out['S1'].missingData.kind).toBe('ok');
  });
});
