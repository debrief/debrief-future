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
