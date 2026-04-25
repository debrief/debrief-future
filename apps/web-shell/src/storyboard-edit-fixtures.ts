/**
 * Deterministic fixtures for the Storyboard edit harness (Feature 230).
 *
 * Three or more Scenes in the primary Storyboard; a second Storyboard
 * for the copy-to-other flow. Everything is static — the harness's mock
 * extension port uses these as the initial state source.
 */

import type {
  SceneEditViewModel,
  SceneRowViewModel,
  StoryboardEditViewModel,
  StoryboardOptionViewModel,
} from '@debrief/components';

export interface StoryboardEditFixture {
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly activeStoryboardId: string;
  readonly activeStoryboardName: string;
  readonly scenes: readonly SceneRowViewModel[];
  readonly sceneEditViewModels: Readonly<
    Record<string, SceneEditViewModel>
  >;
  readonly storyboardEditViewModel: StoryboardEditViewModel;
}

const THUMB_SVG = (label: string): string =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${label}</text></svg>`,
  );

function makeScene(
  sceneId: string,
  title: string,
  iso: string,
): SceneRowViewModel {
  const d = new Date(iso);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  const dtgLabel = `${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes(),
  )}Z APR 26`;
  return {
    sceneId,
    title,
    timestampIso: iso,
    dtgLabel,
    thumbnailHref: THUMB_SVG(sceneId),
    state: { kind: 'ok' },
  };
}

function makeEditVm(
  sceneId: string,
  title: string,
  iso: string,
  description: string | null,
): SceneEditViewModel {
  return {
    sceneId,
    title,
    description,
    timestamp: iso,
    titleIsEditing: false,
    editFormOpen: false,
    pendingDelete: false,
    stale: false,
    unresolvedFeatureIds: [],
    missingData: { kind: 'ok' },
  };
}

export const DEFAULT_STORYBOARD_EDIT_FIXTURE: StoryboardEditFixture = {
  storyboards: [
    {
      storyboardId: 'sb-primary',
      name: 'Primary Debrief',
      sceneCount: 3,
      lastModifiedIso: '2026-04-20T15:00:00.000Z',
    },
    {
      storyboardId: 'sb-secondary',
      name: 'Alternate Debrief',
      sceneCount: 1,
      lastModifiedIso: '2026-04-20T14:30:00.000Z',
    },
  ],
  activeStoryboardId: 'sb-primary',
  activeStoryboardName: 'Primary Debrief',
  scenes: [
    makeScene('sceneA', 'Exercise start — North channel', '2026-04-20T14:00:00.000Z'),
    makeScene('sceneB', 'Contact with surface group', '2026-04-20T14:15:00.000Z'),
    makeScene('sceneC', 'Bearing-only track lock', '2026-04-20T14:35:00.000Z'),
  ],
  sceneEditViewModels: {
    sceneA: makeEditVm(
      'sceneA',
      'Exercise start — North channel',
      '2026-04-20T14:00:00.000Z',
      'Fleet departs port bearing 045°.',
    ),
    sceneB: makeEditVm(
      'sceneB',
      'Contact with surface group',
      '2026-04-20T14:15:00.000Z',
      null,
    ),
    sceneC: makeEditVm(
      'sceneC',
      'Bearing-only track lock',
      '2026-04-20T14:35:00.000Z',
      'Passive sonar bearings 200–215°.',
    ),
  },
  storyboardEditViewModel: {
    storyboardId: 'sb-primary',
    name: 'Primary Debrief',
    description: 'Exercise Alpha — first pass.',
    nameIsEditing: false,
    descriptionExpanded: false,
    sceneCount: 3,
  },
};
