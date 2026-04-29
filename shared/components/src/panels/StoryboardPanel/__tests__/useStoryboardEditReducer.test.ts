/**
 * Unit tests for the Storyboard edit reducer (Feature 230).
 *
 * Covers every action from data-model.md §Action Union plus the state
 * invariants (T1..T4 transitions + reducer-purity + idempotency).
 */

import { describe, expect, it } from 'vitest';
import {
  composeCollisionBannerViewModel,
  composeNamingRowViewModel,
  composeSceneEditViewModels,
  createInitialStoryboardEditState,
  storyboardEditReducer,
  type CollisionBannerReducerState,
  type NamingRowReducerState,
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

// ── #235 — first-capture naming row ────────────────────────────────

const NAMING_ROW_DEFAULT: NamingRowReducerState = {
  visible: true,
  pendingName: 'Plot Foo — storyboard',
  defaultName: 'Plot Foo — storyboard',
  knownNames: [],
};

const COLLISION_BANNER_DEFAULT: CollisionBannerReducerState = {
  visible: true,
  conflictingSceneId: 'S2',
  conflictingSceneTitle: 'Scene S2',
  originalTimestamp: '2026-04-20T14:00:00.000Z',
  proposedTimestamp: '2026-04-20T14:00:00.000Z',
  offsetCount: 0,
  offsetWouldExceedTimeRange: false,
  cause: 'capture',
};

describe('#235 namingRow reducer slice', () => {
  it('lands the slice on a snapshot push', () => {
    const base = seeded();
    const out = storyboardEditReducer(base, {
      type: 'snapshot-message',
      payload: {
        storyboards: [],
        scenes: base.sceneRows,
        activeStoryboardId: null,
        activeStoryboardName: null,
        currentSceneId: null,
        transport: TRANSPORT,
        namingRow: NAMING_ROW_DEFAULT,
      },
    });
    expect(out.namingRow).toEqual(NAMING_ROW_DEFAULT);
  });

  it('preserves panel-local pendingName when host re-pushes the same row', () => {
    const base: StoryboardEditReducerState = seeded({
      namingRow: { ...NAMING_ROW_DEFAULT, pendingName: 'My typed name' },
    });
    const out = storyboardEditReducer(base, {
      type: 'scenes-message',
      payload: {
        scenes: base.sceneRows,
        activeStoryboardName: null,
        activeStoryboardId: null,
        // host re-pushes (e.g. knownNames updated) — must not clobber pendingName
        namingRow: { ...NAMING_ROW_DEFAULT, knownNames: ['Existing Storyboard'] },
      },
    });
    expect(out.namingRow?.pendingName).toBe('My typed name');
    expect(out.namingRow?.knownNames).toEqual(['Existing Storyboard']);
  });

  it('clears the slice when host pushes null', () => {
    const base = seeded({ namingRow: NAMING_ROW_DEFAULT });
    const out = storyboardEditReducer(base, {
      type: 'snapshot-message',
      payload: {
        storyboards: [],
        scenes: base.sceneRows,
        activeStoryboardId: null,
        activeStoryboardName: null,
        currentSceneId: null,
        transport: TRANSPORT,
        namingRow: null,
      },
    });
    expect(out.namingRow).toBeNull();
  });

  it('updates pendingName on naming-row-text-changed', () => {
    const base = seeded({ namingRow: NAMING_ROW_DEFAULT });
    const out = storyboardEditReducer(base, {
      type: 'naming-row-text-changed',
      text: 'New name',
    });
    expect(out.namingRow?.pendingName).toBe('New name');
  });

  it('drops naming-row-text-changed when slice is null (stale-defence)', () => {
    const base = seeded();
    const out = storyboardEditReducer(base, {
      type: 'naming-row-text-changed',
      text: 'leaked',
    });
    expect(out).toBe(base);
    expect(out.namingRow).toBeNull();
  });

  it('drops naming-row-text-changed when slice is hidden (stale-defence)', () => {
    const base = seeded({
      namingRow: { ...NAMING_ROW_DEFAULT, visible: false },
    });
    const out = storyboardEditReducer(base, {
      type: 'naming-row-text-changed',
      text: 'leaked',
    });
    expect(out).toBe(base);
  });

  it('clears slice optimistically on confirm/cancel', () => {
    const base = seeded({ namingRow: NAMING_ROW_DEFAULT });
    expect(
      storyboardEditReducer(base, { type: 'naming-row-confirm-requested' })
        .namingRow,
    ).toBeNull();
    expect(
      storyboardEditReducer(base, { type: 'naming-row-cancel-requested' })
        .namingRow,
    ).toBeNull();
  });

  it('drops confirm/cancel when slice is null (stale-defence)', () => {
    const base = seeded();
    expect(
      storyboardEditReducer(base, { type: 'naming-row-confirm-requested' }),
    ).toBe(base);
    expect(
      storyboardEditReducer(base, { type: 'naming-row-cancel-requested' }),
    ).toBe(base);
  });

  it('projects view-model with collision-with case-insensitive match', () => {
    const state = seeded({
      namingRow: {
        visible: true,
        pendingName: 'briefing alpha',
        defaultName: 'Plot — storyboard',
        knownNames: ['Briefing Alpha', 'Other'],
      },
    });
    const vm = composeNamingRowViewModel(state);
    expect(vm.visible).toBe(true);
    expect(vm.collisionWith).toBe('Briefing Alpha');
    expect(vm.canConfirm).toBe(false);
  });

  it('projects canConfirm:true for a unique non-empty name', () => {
    const state = seeded({
      namingRow: {
        visible: true,
        pendingName: 'Fresh name',
        defaultName: '',
        knownNames: ['Other'],
      },
    });
    const vm = composeNamingRowViewModel(state);
    expect(vm.canConfirm).toBe(true);
    expect(vm.collisionWith).toBeNull();
  });

  it('projects canConfirm:false for empty/whitespace-only pendingName', () => {
    const state = seeded({
      namingRow: { ...NAMING_ROW_DEFAULT, pendingName: '   ' },
    });
    const vm = composeNamingRowViewModel(state);
    expect(vm.canConfirm).toBe(false);
    expect(vm.collisionWith).toBeNull();
  });

  it('projects visible:false when slice is null', () => {
    const vm = composeNamingRowViewModel(seeded());
    expect(vm.visible).toBe(false);
    expect(vm.canConfirm).toBe(false);
  });
});

describe('#235 collisionBanner reducer slice', () => {
  it('lands the slice on a snapshot push', () => {
    const base = seeded();
    const out = storyboardEditReducer(base, {
      type: 'snapshot-message',
      payload: {
        storyboards: [],
        scenes: base.sceneRows,
        activeStoryboardId: null,
        activeStoryboardName: null,
        currentSceneId: null,
        transport: TRANSPORT,
        collisionBanner: COLLISION_BANNER_DEFAULT,
      },
    });
    expect(out.collisionBanner).toEqual(COLLISION_BANNER_DEFAULT);
  });

  it('clears slice on Replace with matching conflictingSceneId', () => {
    const base = seeded({ collisionBanner: COLLISION_BANNER_DEFAULT });
    const out = storyboardEditReducer(base, {
      type: 'collision-replace-requested',
      conflictingSceneId: 'S2',
    });
    expect(out.collisionBanner).toBeNull();
  });

  it('drops Replace with mismatched conflictingSceneId (stale-defence)', () => {
    const base = seeded({ collisionBanner: COLLISION_BANNER_DEFAULT });
    const out = storyboardEditReducer(base, {
      type: 'collision-replace-requested',
      conflictingSceneId: 'WRONG',
    });
    expect(out).toBe(base);
  });

  it('clears slice on Cancel', () => {
    const base = seeded({ collisionBanner: COLLISION_BANNER_DEFAULT });
    const out = storyboardEditReducer(base, {
      type: 'collision-cancel-requested',
    });
    expect(out.collisionBanner).toBeNull();
  });

  it('drops Replace/Offset/Cancel when slice is null (stale-defence)', () => {
    const base = seeded();
    expect(
      storyboardEditReducer(base, {
        type: 'collision-replace-requested',
        conflictingSceneId: 'X',
      }),
    ).toBe(base);
    expect(
      storyboardEditReducer(base, { type: 'collision-offset-requested' }),
    ).toBe(base);
    expect(
      storyboardEditReducer(base, { type: 'collision-cancel-requested' }),
    ).toBe(base);
  });

  it('drops Offset when offsetWouldExceedTimeRange is true', () => {
    const base = seeded({
      collisionBanner: {
        ...COLLISION_BANNER_DEFAULT,
        offsetWouldExceedTimeRange: true,
      },
    });
    const out = storyboardEditReducer(base, {
      type: 'collision-offset-requested',
    });
    expect(out).toBe(base);
  });

  it('drops Offset when offsetCount is at cap (60)', () => {
    const base = seeded({
      collisionBanner: { ...COLLISION_BANNER_DEFAULT, offsetCount: 60 },
    });
    const out = storyboardEditReducer(base, {
      type: 'collision-offset-requested',
    });
    expect(out).toBe(base);
  });

  it('Offset with no preconditions returns same state — host re-pushes after the check', () => {
    const base = seeded({ collisionBanner: COLLISION_BANNER_DEFAULT });
    const out = storyboardEditReducer(base, {
      type: 'collision-offset-requested',
    });
    // No local mutation — host advances offsetCount and re-pushes
    expect(out).toBe(base);
  });

  it('projects banner view-model with offsetCapReached when count >= 60', () => {
    const state = seeded({
      collisionBanner: { ...COLLISION_BANNER_DEFAULT, offsetCount: 60 },
    });
    const vm = composeCollisionBannerViewModel(state);
    expect(vm.offsetCapReached).toBe(true);
  });

  it('projects offsetWouldExceedTimeRange through to the view-model', () => {
    const state = seeded({
      collisionBanner: {
        ...COLLISION_BANNER_DEFAULT,
        offsetWouldExceedTimeRange: true,
      },
    });
    const vm = composeCollisionBannerViewModel(state);
    expect(vm.offsetWouldExceedTimeRange).toBe(true);
  });

  it('projects DTG label from proposedTimestamp', () => {
    const state = seeded({
      collisionBanner: {
        ...COLLISION_BANNER_DEFAULT,
        proposedTimestamp: '2026-04-20T14:00:00.000Z',
      },
    });
    const vm = composeCollisionBannerViewModel(state);
    expect(vm.proposedTimestampDtg).toMatch(/201400Z APR 26/);
  });

  it('projects visible:false when slice is null', () => {
    const vm = composeCollisionBannerViewModel(seeded());
    expect(vm.visible).toBe(false);
    expect(vm.offsetCount).toBe(0);
  });
});
