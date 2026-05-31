/**
 * Storybook stories for the Storyboard panel (Feature 216).
 *
 * Four stories mirror the Panel States table in
 * `contracts/storyboard-panel-view.md §6`.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StoryboardPanel } from './StoryboardPanel';
import { HardBlockModal } from './HardBlockModal';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  MissingDataReason,
} from './types';

function makeSceneRow(
  sceneId: string,
  iso: string,
  title: string,
): SceneRowViewModel {
  return {
    sceneId,
    title,
    timestampIso: iso,
    dtgLabel: formatDtgStub(iso),
    thumbnailHref:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${sceneId}</text></svg>`,
      ),
    state: { kind: 'ok' },
  };
}

function formatDtgStub(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  return `${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z ${months[d.getUTCMonth()]} ${pad(d.getUTCFullYear() % 100)}`;
}

const SCENES_THREE: SceneRowViewModel[] = [
  makeSceneRow('scene-1', '2026-04-20T14:00:00.000Z', 'Exercise start — North channel'),
  makeSceneRow('scene-2', '2026-04-20T14:15:00.000Z', 'Contact with surface group'),
  makeSceneRow('scene-3', '2026-04-20T14:35:00.000Z', 'Bearing-only track lock'),
];

const meta: Meta<typeof StoryboardPanel> = {
  title: 'Panels/StoryboardPanel',
  component: StoryboardPanel,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof StoryboardPanel>;

export const Empty: Story = {
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
  },
};

export const EmptyStoryboard: Story = {
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
  },
};

export const WithOneScene: Story = {
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
  },
};

export const WithThreeScenes: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
  },
};

export const Capturing: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
  },
};

// ─── #273 — live Preview control variants ─────────────────────────────

/**
 * Preview button enabled — sits beside Capture in the header. Provided
 * `onPreview` makes the button render; ≥1 scene makes it actionable.
 */
export const WithPreview: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onPreview: () => undefined,
  },
};

/**
 * Preview button disabled — the active storyboard has no scenes, so the
 * button renders but is disabled with an explanatory tooltip (FR-007).
 */
export const PreviewDisabledNoScenes: Story = {
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onPreview: () => undefined,
  },
};

// ─── Spec 260 — viewport-lock padlock variants ────────────────────────

/**
 * Padlock toggle unlocked — open-padlock glyph, `aria-pressed="false"`.
 * The control sits immediately to the left of Capture.
 */
export const ViewportUnlocked: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    viewportLocked: false,
    onViewportLockToggle: () => undefined,
    hasActivePlot: true,
  },
};

/**
 * Padlock toggle locked — closed-padlock glyph, `aria-pressed="true"`,
 * highlighted background. Demonstrates the visual relationship to Capture.
 */
export const ViewportLocked: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    viewportLocked: true,
    onViewportLockToggle: () => undefined,
    hasActivePlot: true,
  },
};

/**
 * Padlock toggle disabled — no plot loaded (spec 260 / FR-013).
 */
export const ViewportLockEmptyState: Story = {
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    viewportLocked: false,
    onViewportLockToggle: () => undefined,
    hasActivePlot: false,
  },
};

// ─── #217 stories ─────────────────────────────────────────────────────

const TRANSPORT_AT_1: TransportViewModel = {
  canGoBackward: false,
  canGoForward: true,
  sceneNumber: 1,
  sceneTotal: 3,
  transitionInFlight: false,
};

export const Transport: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    currentSceneId: 'scene-1',
    transport: TRANSPORT_AT_1,
    onTransportForward: () => undefined,
    onTransportBackward: () => undefined,
  },
};

const HARD_BLOCK_REASON: MissingDataReason = {
  kind: 'missing-features',
  missingFeatureIds: ['track-nimitz', 'annotation-bearing-lock'],
};

const MULTI_STORYBOARDS: readonly StoryboardOptionViewModel[] = [
  {
    storyboardId: 'sb-commander',
    name: "Commander's view",
    sceneCount: 5,
    lastModifiedIso: '2026-04-20T15:00:00.000Z',
  },
  {
    storyboardId: 'sb-asw',
    name: 'ASW evidence',
    sceneCount: 3,
    lastModifiedIso: '2026-04-20T14:30:00.000Z',
  },
  {
    storyboardId: 'sb-training',
    name: 'Training debrief',
    sceneCount: 2,
    lastModifiedIso: '2026-04-20T14:00:00.000Z',
  },
];

const FIVE_SCENES: SceneRowViewModel[] = [
  makeSceneRow('scene-1', '2026-04-20T14:00:00.000Z', 'Exercise start'),
  makeSceneRow('scene-2', '2026-04-20T14:10:00.000Z', 'First contact'),
  makeSceneRow('scene-3', '2026-04-20T14:20:00.000Z', 'Bearing fix'),
  makeSceneRow('scene-4', '2026-04-20T14:30:00.000Z', 'CPA estimate'),
  makeSceneRow('scene-5', '2026-04-20T14:45:00.000Z', 'Disengagement'),
];

const TRANSPORT_MULTI: TransportViewModel = {
  canGoBackward: true,
  canGoForward: true,
  sceneNumber: 2,
  sceneTotal: 5,
  transitionInFlight: false,
};

export const WithMultipleStoryboards: Story = {
  args: {
    scenes: FIVE_SCENES,
    activeStoryboardName: "Commander's view",
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    storyboards: MULTI_STORYBOARDS,
    activeStoryboardId: 'sb-commander',
    currentSceneId: 'scene-2',
    transport: TRANSPORT_MULTI,
    onActiveStoryboardChange: () => undefined,
    onCreateStoryboard: () => undefined,
    onRenameStoryboard: () => undefined,
    onDeleteStoryboard: () => undefined,
    onTransportForward: () => undefined,
    onTransportBackward: () => undefined,
  },
};

export const HardBlockModalStory: StoryObj<typeof HardBlockModal> = {
  name: 'HardBlockModal (missing features)',
  render: () => (
    <HardBlockModal
      sceneTitle="201435Z APR 26 — Surface contact"
      reason={HARD_BLOCK_REASON}
      jumpPastLabel="Jump past this scene"
      openForEditingLabel="Open for editing"
      onJumpPast={() => undefined}
      onOpenForEditing={() => undefined}
      onDismiss={() => undefined}
    />
  ),
};

// ─── #218 edit-suite stories (T064; upgraded to interactive in #234 T023..T026) ───

import {
  useStoryOnlyMockHandlers,
  composeSceneEditViewModels,
  type MockHandlersFixture,
  type MockHandlersInitial,
  type MockPortKnobs,
  type SceneEditViewModel,
  type StoryboardEditViewModel,
} from './index';

const EDIT_VM_BASE: SceneEditViewModel = {
  sceneId: 'scene-1',
  title: 'Exercise start — North channel',
  description: null,
  timestamp: '2026-04-20T14:00:00.000Z',
  titleIsEditing: false,
  editFormOpen: false,
  pendingDelete: false,
  stale: false,
  unresolvedFeatureIds: [],
  missingData: { kind: 'ok' },
};

const STORYBOARD_EDIT_VM: StoryboardEditViewModel = {
  storyboardId: 'sb-alpha',
  name: 'Exercise Alpha',
  description: 'Surface-group exercise — North channel',
  nameIsEditing: false,
  descriptionExpanded: false,
  sceneCount: SCENES_THREE.length,
};

/**
 * Build the helper-shaped fixture for the four edit-suite stories. All
 * stories share the same three scenes; per-row edit VM overrides are
 * passed by each story to set the starting condition (e.g. WithEditForm
 * pre-opens scene-1's edit form).
 */
function makeEditFixture(
  perRowOverrides: Partial<Record<string, Partial<SceneEditViewModel>>>,
): MockHandlersFixture {
  const sceneEditViewModels: Record<string, SceneEditViewModel> = {};
  for (const row of SCENES_THREE) {
    const baseForRow: SceneEditViewModel = {
      ...EDIT_VM_BASE,
      sceneId: row.sceneId,
      title: row.title,
      timestamp: row.timestampIso,
    };
    sceneEditViewModels[row.sceneId] = {
      ...baseForRow,
      ...perRowOverrides[row.sceneId],
    };
  }
  return {
    storyboards: [
      {
        storyboardId: 'sb-alpha',
        name: 'Exercise Alpha',
        sceneCount: SCENES_THREE.length,
        lastModifiedIso: '2026-04-20T14:35:00.000Z',
      },
      {
        storyboardId: 'sb-bravo',
        name: 'Exercise Bravo',
        sceneCount: 0,
        lastModifiedIso: '2026-04-20T13:00:00.000Z',
      },
    ],
    activeStoryboardId: 'sb-alpha',
    activeStoryboardName: 'Exercise Alpha',
    scenes: SCENES_THREE,
    sceneEditViewModels,
    storyboardEditViewModel: STORYBOARD_EDIT_VM,
  };
}

interface InteractiveStoryArgs {
  /** Storybook control: enable copy-to-other failure for a sceneId. */
  readonly induceCopyFailure?: string;
  /** Storybook control: enable refresh-thumbnail failure for a sceneId. */
  readonly induceRefreshFailure?: string;
}

interface InteractivePanelProps {
  readonly fixture: MockHandlersFixture;
  readonly initial?: MockHandlersInitial;
  readonly knobs?: MockPortKnobs;
}

/**
 * Renders the panel with the shared callback-adapter wired in. Each
 * edit-suite story uses this in its `render` function.
 */
function InteractiveStoryboardPanel({
  fixture,
  initial,
  knobs,
}: InteractivePanelProps): React.ReactElement {
  const { state, handlers } = useStoryOnlyMockHandlers(fixture, {
    initial,
    knobs,
  });
  const sceneEditViewModels = composeSceneEditViewModels(state);
  return (
    <StoryboardPanel
      scenes={state.sceneRows}
      activeStoryboardName={state.activeStoryboardName}
      captureInFlight={state.captureInFlight}
      storyboards={
        state.storyboards.length > 0 ? state.storyboards : undefined
      }
      activeStoryboardId={state.activeStoryboardId}
      currentSceneId={state.currentSceneId}
      transport={state.transport}
      sceneEditViewModels={sceneEditViewModels}
      storyboardEditViewModel={state.storyboardEditViewModel ?? undefined}
      pendingUndoToast={state.pendingUndoToast}
      overflowMenuOpenFor={state.overflowMenuOpenFor}
      overflowMenuAnchorRect={state.overflowMenuAnchorRect}
      {...handlers}
    />
  );
}

export const WithEditForm: StoryObj<InteractiveStoryArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          'Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027).',
      },
    },
  },
  render: () => (
    <InteractiveStoryboardPanel
      fixture={makeEditFixture({
        'scene-1': {
          description: '**Brief:** contact gained bearing 023°. Hold course.',
        },
      })}
    />
  ),
};

export const WithUndoToast: StoryObj<InteractiveStoryArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027).',
      },
    },
  },
  render: () => (
    <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
  ),
};

export const WithStaleBadge: StoryObj<InteractiveStoryArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).',
      },
    },
  },
  argTypes: {
    induceRefreshFailure: {
      control: 'select',
      options: [undefined, 'scene-1', 'scene-2', 'scene-3'],
      description:
        'Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays).',
    },
  },
  args: {
    induceRefreshFailure: undefined,
  },
  render: (args) => (
    <InteractiveStoryboardPanel
      fixture={makeEditFixture({})}
      initial={{ staleSceneIds: ['scene-2'] }}
      knobs={{ induceRefreshFailure: args.induceRefreshFailure }}
    />
  ),
};

export const WithMissingDataRemediation: StoryObj<InteractiveStoryArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          'Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action.',
      },
    },
  },
  render: () => (
    <InteractiveStoryboardPanel
      fixture={makeEditFixture({
        'scene-3': {
          editFormOpen: true,
          missingData: {
            kind: 'missing-features',
            ids: ['track-alpha', 'track-bravo', 'track-charlie'],
          },
        },
      })}
      initial={{
        missingDataBySceneId: {
          'scene-3': ['track-alpha', 'track-bravo', 'track-charlie'],
        },
      }}
    />
  ),
};

// ─────────────────────────────────────────────────────────────────────
// Feature 235 — first-capture naming row + duplicate-timestamp banner
// ─────────────────────────────────────────────────────────────────────

/**
 * The empty rail with the primary Capture Scene affordance — the entry
 * point that replaces the legacy `Press Ctrl/Cmd+Alt+C on the map…`
 * empty-state copy from #216.
 */
export const EmptyWithCaptureButton: Story = {
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
  },
};

/**
 * First-capture inline naming row. Pre-filled with the plot's default
 * name; analyst can edit, confirm, or cancel without ever leaving the
 * rail.
 */
export const FirstCaptureNamingRow: Story = {
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    namingRowViewModel: {
      visible: true,
      pendingName: 'Plot Alpha — storyboard',
      defaultName: 'Plot Alpha — storyboard',
      collisionWith: null,
      canConfirm: true,
    },
    onNamingRowTextChanged: () => undefined,
    onNamingRowConfirm: () => undefined,
    onNamingRowCancel: () => undefined,
  },
};

/**
 * First-capture naming row, but the analyst typed a name that already
 * exists on this plot. The inline collision warning fires; Confirm is
 * disabled until they pick a unique name.
 */
export const FirstCaptureNamingRowWithCollision: Story = {
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    namingRowViewModel: {
      visible: true,
      pendingName: 'Exercise Alpha',
      defaultName: 'Plot Alpha — storyboard',
      collisionWith: 'Exercise Alpha',
      canConfirm: false,
    },
    onNamingRowTextChanged: () => undefined,
    onNamingRowConfirm: () => undefined,
    onNamingRowCancel: () => undefined,
  },
};

/**
 * Duplicate-timestamp collision banner — Replace / Offset / Cancel.
 * Anchored in the rail above the existing Scene list. The map and time
 * controller in the host's central area remain operable.
 */
export const DuplicateTimestampBanner: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    collisionBannerViewModel: {
      visible: true,
      conflictingSceneId: 'scene-2',
      conflictingSceneTitle: 'Contact with surface group',
      proposedTimestamp: '2026-04-20T14:15:00.000Z',
      proposedTimestampDtg: '201415Z APR 26',
      offsetCount: 0,
      offsetCapReached: false,
      offsetWouldExceedTimeRange: false,
      offsetButtonHidden: false,
      cause: 'capture',
    },
    onCollisionReplace: () => undefined,
    onCollisionOffset: () => undefined,
    onCollisionCancel: () => undefined,
  },
};

/**
 * After 60 Offset presses, the banner replaces the Offset button with
 * an inline cap-reached message; only Replace and Cancel remain.
 */
export const DuplicateTimestampBannerOffsetCapped: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    collisionBannerViewModel: {
      visible: true,
      conflictingSceneId: 'scene-2',
      conflictingSceneTitle: 'Contact with surface group',
      proposedTimestamp: '2026-04-20T14:16:00.000Z',
      proposedTimestampDtg: '201416Z APR 26',
      offsetCount: 60,
      offsetCapReached: true,
      offsetWouldExceedTimeRange: false,
      offsetButtonHidden: true,
      cause: 'capture',
    },
    onCollisionReplace: () => undefined,
    onCollisionOffset: () => undefined,
    onCollisionCancel: () => undefined,
  },
};

/**
 * FR-CAP-017a — when the next Offset would push past the plot's time
 * range, the banner replaces the Offset button with the inline
 * time-range message.
 */
export const DuplicateTimestampBannerExceedsTimeRange: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    collisionBannerViewModel: {
      visible: true,
      conflictingSceneId: 'scene-3',
      conflictingSceneTitle: 'Bearing-only track lock',
      proposedTimestamp: '2026-04-20T14:35:00.000Z',
      proposedTimestampDtg: '201435Z APR 26',
      offsetCount: 4,
      offsetCapReached: false,
      offsetWouldExceedTimeRange: true,
      offsetButtonHidden: true,
      cause: 'capture',
    },
    onCollisionReplace: () => undefined,
    onCollisionOffset: () => undefined,
    onCollisionCancel: () => undefined,
  },
};

/**
 * Visualises a Scene row with the Update-to-current affordance — the
 * primary maintenance op that re-anchors a Scene to live state in-row.
 * Re-uses the #218 visual treatment; included here so the new stories
 * file references it for E2E.
 */
export const RowWithUpdateToCurrent: Story = {
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    sceneEditViewModels: {
      'scene-2': {
        sceneId: 'scene-2',
        title: 'Contact with surface group',
        description: null,
        timestamp: '2026-04-20T14:15:00.000Z',
        titleIsEditing: false,
        editFormOpen: true,
        pendingDelete: false,
        stale: false,
        unresolvedFeatureIds: [],
        missingData: { kind: 'ok' },
      },
    },
    onSceneUpdateToCurrentClicked: () => undefined,
  },
};
