/**
 * Integrated Storybook story — wires StoryboardPanel + MapView + flyToTarget
 * together so the full playback flow can be driven (and captured) without a
 * VS Code host. Reuses the same presentational primitives #217 ships.
 *
 * This story powers the three "end-to-end" artefacts that remain outside
 * the #216-style per-component captures: the forward-through-storyboard
 * interaction GIF, the hard-block surface screenshot, and the
 * dropdown-switch rectangle-refresh screenshot. Driven via Playwright
 * against the shared Storybook harness — no VS Code webview required.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { FeatureCollection } from 'geojson';
import type { SceneFeature } from '@debrief/schemas';
import { MapView } from '../../MapView';
import type { FlyToTarget } from '../../MapView';
import { StoryboardPanel } from './StoryboardPanel';
import { HardBlockModal } from './HardBlockModal';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  MissingDataReason,
} from './types';

// ── Fixture data ───────────────────────────────────────────────────────

interface FixtureScene {
  readonly id: string;
  readonly storyboardId: string;
  readonly title: string;
  readonly timestampIso: string;
  readonly center: readonly [number, number]; // [lon, lat]
  readonly zoom: number;
  readonly cornersLonLat: readonly (readonly [number, number])[];
  /** Set to true to make this scene trigger a hard-block on step-onto. */
  readonly blocked?: boolean;
}

function makeScene(
  id: string,
  storyboardId: string,
  title: string,
  timestampIso: string,
  center: [number, number],
  zoom: number,
  sizeDeg: number,
  blocked?: boolean,
): FixtureScene {
  const [lon, lat] = center;
  const half = sizeDeg / 2;
  const cornersLonLat: [number, number][] = [
    [lon - half, lat - half],
    [lon + half, lat - half],
    [lon + half, lat + half],
    [lon - half, lat + half],
    [lon - half, lat - half],
  ];
  return {
    id,
    storyboardId,
    title,
    timestampIso,
    center,
    zoom,
    cornersLonLat,
    blocked,
  };
}

// Two Storyboards of three Scenes each, positioned across the North Sea
const FIXTURE_SCENES: readonly FixtureScene[] = [
  // Commander's view
  makeScene('cv-1', 'sb-commander', 'Exercise start — channel entry',
    '2026-04-20T14:00:00.000Z', [-4.5, 50.5], 9, 1.5),
  makeScene('cv-2', 'sb-commander', 'Contact with surface group',
    '2026-04-20T14:20:00.000Z', [-3.5, 51.2], 9, 1.5),
  makeScene('cv-3', 'sb-commander', 'Missing feature — bearing lock',
    '2026-04-20T14:40:00.000Z', [-2.8, 51.8], 9, 1.5, true),
  // ASW evidence
  makeScene('asw-1', 'sb-asw', 'Northern watch',
    '2026-04-20T13:30:00.000Z', [-1.5, 53.0], 8, 2.0),
  makeScene('asw-2', 'sb-asw', 'Middle drift',
    '2026-04-20T14:00:00.000Z', [0.5, 53.5], 8, 2.0),
  makeScene('asw-3', 'sb-asw', 'Southern sweep',
    '2026-04-20T14:30:00.000Z', [1.5, 53.0], 8, 2.0),
];

const STORYBOARDS: readonly StoryboardOptionViewModel[] = [
  {
    storyboardId: 'sb-commander',
    name: "Commander's view",
    sceneCount: 3,
    lastModifiedIso: '2026-04-20T15:00:00.000Z',
  },
  {
    storyboardId: 'sb-asw',
    name: 'ASW evidence',
    sceneCount: 3,
    lastModifiedIso: '2026-04-20T14:30:00.000Z',
  },
];

const FLYTO_DURATION_MS = 600;

// ── Integrated harness component ───────────────────────────────────────

interface HardBlockState {
  readonly sceneTitle: string;
  readonly reason: MissingDataReason;
  readonly pendingIndex: number;
}

function StoryboardPlaybackHarness(): React.ReactElement {
  const [activeStoryboardId, setActiveStoryboardId] =
    useState<string>('sb-commander');
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [transitionInFlight, setTransitionInFlight] = useState<boolean>(false);
  const [hardBlock, setHardBlock] = useState<HardBlockState | null>(null);
  const tokenRef = useRef<number>(0);

  // Derive the active Storyboard's scene list, ordered by timestamp.
  const activeScenes = useMemo(
    () =>
      FIXTURE_SCENES.filter((s) => s.storyboardId === activeStoryboardId)
        .slice()
        .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso)),
    [activeStoryboardId],
  );

  // Build the Scene features for SceneRectangleLayer.
  const sceneFeatures = useMemo<readonly SceneFeature[]>(
    () =>
      activeScenes.map((s) => ({
        type: 'Feature',
        id: s.id,
        geometry: {
          type: 'Polygon',
          coordinates: [s.cornersLonLat.map((p) => [...p])],
        },
        properties: {
          id: s.id,
          kind: 'STORYBOARD_SCENE',
          storyboard_id: s.storyboardId,
          viewport: { center: [...s.center], zoom: s.zoom, bearing: 0 },
          timestamp: s.timestampIso,
          title: s.title,
          schema_version: 1,
        },
      })) as unknown as readonly SceneFeature[],
    [activeScenes],
  );

  // Empty base GeoJSON so MapView renders cleanly.
  const emptyFc: FeatureCollection = useMemo(
    () => ({ type: 'FeatureCollection', features: [] }),
    [],
  );

  const currentScene = activeScenes[currentSceneIndex] ?? null;
  const currentSceneId = currentScene?.id ?? null;

  const scenes: readonly SceneRowViewModel[] = useMemo(
    () =>
      activeScenes.map((s) => ({
        sceneId: s.id,
        title: s.title,
        timestampIso: s.timestampIso,
        dtgLabel: s.timestampIso.slice(11, 16) + 'Z',
        thumbnailHref:
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="#2b5bb0"/><text x="40" y="34" text-anchor="middle" fill="white" font-family="monospace" font-size="10">${s.id}</text></svg>`,
          ),
        state: { kind: 'ok' } as const,
      })),
    [activeScenes],
  );

  const transport: TransportViewModel = useMemo(
    () => ({
      canGoBackward: currentSceneIndex > 0 && activeScenes.length > 0,
      canGoForward:
        currentSceneIndex < activeScenes.length - 1 && activeScenes.length > 0,
      sceneNumber: activeScenes.length === 0 ? 0 : currentSceneIndex + 1,
      sceneTotal: activeScenes.length,
      transitionInFlight,
    }),
    [currentSceneIndex, activeScenes.length, transitionInFlight],
  );

  // Step to a target index — runs hard-block check first, then animates.
  const stepTo = useCallback(
    (targetIndex: number): void => {
      if (transitionInFlight) return;
      if (targetIndex < 0 || targetIndex >= activeScenes.length) return;
      const target = activeScenes[targetIndex];
      if (!target) return;
      if (target.blocked === true) {
        setHardBlock({
          sceneTitle: target.title,
          reason: {
            kind: 'missing-features',
            missingFeatureIds: ['track-nimitz', 'annotation-bearing-lock'],
          },
          pendingIndex: targetIndex,
        });
        return;
      }
      const nextToken = ++tokenRef.current;
      setFlyToTarget({
        token: nextToken,
        center: [target.center[1], target.center[0]], // [lat, lon]
        zoom: target.zoom,
        durationMs: FLYTO_DURATION_MS,
      });
      setTransitionInFlight(true);
      setCurrentSceneIndex(targetIndex);
    },
    [activeScenes, transitionInFlight],
  );

  const onFlyToComplete = useCallback((token: number) => {
    if (token === tokenRef.current) {
      setTransitionInFlight(false);
    }
  }, []);

  const onTransportForward = useCallback(() => {
    stepTo(currentSceneIndex + 1);
  }, [currentSceneIndex, stepTo]);

  const onTransportBackward = useCallback(() => {
    stepTo(currentSceneIndex - 1);
  }, [currentSceneIndex, stepTo]);

  const onSceneRowClick = useCallback(
    (sceneId: string) => {
      const idx = activeScenes.findIndex((s) => s.id === sceneId);
      if (idx >= 0) stepTo(idx);
    },
    [activeScenes, stepTo],
  );

  const onActiveStoryboardChange = useCallback((sbId: string) => {
    setActiveStoryboardId(sbId);
    setCurrentSceneIndex(0);
    setFlyToTarget(null);
    setTransitionInFlight(false);
    setHardBlock(null);
  }, []);

  const onHardBlockJumpPast = useCallback(() => {
    if (hardBlock === null) return;
    // Walk past the blocked scene in the forward direction. For the demo we
    // step one further forward; real service logic skips all consecutive
    // blocked scenes.
    const skipIndex = hardBlock.pendingIndex + 1;
    setHardBlock(null);
    if (skipIndex < activeScenes.length) {
      stepTo(skipIndex);
    }
  }, [hardBlock, activeScenes.length, stepTo]);

  const onHardBlockOpen = useCallback(() => {
    setHardBlock(null);
  }, []);

  const onHardBlockDismiss = useCallback(() => {
    setHardBlock(null);
  }, []);

  return (
    <div
      data-testid="storyboard-playback-harness"
      style={{
        display: 'flex',
        width: '100%',
        height: 480,
        border: '1px solid #ccc',
      }}
    >
      {/* Left — panel */}
      <div
        style={{
          width: 380,
          borderRight: '1px solid #ccc',
          overflow: 'auto',
        }}
      >
        <StoryboardPanel
          scenes={scenes}
          activeStoryboardName={
            STORYBOARDS.find((sb) => sb.storyboardId === activeStoryboardId)
              ?.name ?? null
          }
          captureInFlight={false}
          onCaptureClick={() => undefined}
          onSceneRowClick={onSceneRowClick}
          storyboards={STORYBOARDS}
          activeStoryboardId={activeStoryboardId}
          currentSceneId={currentSceneId}
          transport={transport}
          onActiveStoryboardChange={onActiveStoryboardChange}
          onCreateStoryboard={() => undefined}
          onRenameStoryboard={() => undefined}
          onDeleteStoryboard={() => undefined}
          onTransportForward={onTransportForward}
          onTransportBackward={onTransportBackward}
        />
      </div>

      {/* Right — map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapView
          features={emptyFc}
          selectedIds={new Set()}
          initialCenter={[51.3, -1.5]}
          initialZoom={7}
          flyToTarget={flyToTarget}
          onFlyToComplete={onFlyToComplete}
          sceneRectangles={{
            scenes: sceneFeatures,
            activeStoryboardId,
            currentSceneId,
            onSceneRectangleClick: onSceneRowClick,
          }}
        />
        {hardBlock !== null && (
          <div
            data-testid="hard-block-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <HardBlockModal
              sceneTitle={hardBlock.sceneTitle}
              reason={hardBlock.reason}
              jumpPastLabel="Jump past this scene"
              openForEditingLabel="Open for editing"
              onJumpPast={onHardBlockJumpPast}
              onOpenForEditing={onHardBlockOpen}
              onDismiss={onHardBlockDismiss}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Storybook meta ─────────────────────────────────────────────────────

const meta: Meta<typeof StoryboardPlaybackHarness> = {
  title: 'Panels/StoryboardPlayback',
  component: StoryboardPlaybackHarness,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof StoryboardPlaybackHarness>;

export const IntegratedPlayback: Story = {};
