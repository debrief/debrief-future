/**
 * Storybook stories for the Storyboard panel (Feature 216).
 *
 * Four stories mirror the Panel States table in
 * `contracts/storyboard-panel-view.md §6`.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StoryboardPanel } from './StoryboardPanel';
import type { SceneRowViewModel } from './types';

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
