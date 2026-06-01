/**
 * Local dev fixture so `pnpm dev` can boot the SPA without needing a real
 * export. Produces a synthetic single-Storyboard briefing payload with a
 * realistic narrative: two vessels (Track-Alpha and Track-Bravo) moving
 * through the English Channel and North Sea over a ~4-hour exercise.
 *
 * Used by `main.tsx` when the three inlined `<script>` slots are empty
 * (the dev-server case). Never loaded in production builds — the export
 * command always fills the slots.
 */

import type { LoadedInlineData } from '../loaders/inlineDataLoader';
import type {
  BriefingConfig,
  BriefingFeatureCollection,
  BriefingItemJson,
  SceneFeature,
  StoryboardFeature,
} from '../types';

const STORYBOARD_ID = '01HKVZ0DEVFIX0000000000000';
const TRACK_ALPHA_ID = '01HKVZ0DEVTRACKALPHA00000';
const TRACK_BRAVO_ID = '01HKVZ0DEVTRACKBRAVO00000';
const REF_DOVER_ID = '01HKVZ0DEVREFDOVER0000000';
const REF_BREST_ID = '01HKVZ0DEVREFBREST0000000';

// ─── Track helpers ───────────────────────────────────────────────────

/**
 * A short list of [lon, lat, isoTimestamp] tuples that describe each
 * vessel's path over the ~4-hour exercise. Coordinates picked to put
 * both tracks inside the bundled OSM tile coverage (Western Europe,
 * z=4–7) so the dev fixture renders meaningfully without network access.
 */
const T0 = Date.UTC(2025, 0, 15, 12, 0, 0);
const T_END = Date.UTC(2025, 0, 15, 16, 0, 0);

const ALPHA_PATH: Array<[number, number]> = [
  // Lon, Lat. Heading roughly NE from Brittany through the Channel.
  [-5.0, 48.0],
  [-3.5, 49.0],
  [-2.0, 49.7],
  [-0.5, 50.4],
  [1.0, 50.9],
  [2.5, 51.2],
  [4.0, 51.5],
  [5.5, 52.0],
];

const BRAVO_PATH: Array<[number, number]> = [
  // Heading SW from the North Sea down past Cornwall.
  [4.5, 53.5],
  [3.0, 53.0],
  [1.5, 52.0],
  [0.0, 51.0],
  [-1.5, 50.0],
  [-3.0, 49.3],
  [-4.5, 48.7],
  [-6.0, 48.0],
];

function buildTrackTimes(count: number): string[] {
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = T0 + ((T_END - T0) * i) / (count - 1);
    times.push(new Date(t).toISOString());
  }
  return times;
}

function makeTrack(
  id: string,
  name: string,
  path: Array<[number, number]>,
  colour: string,
) {
  const times = buildTrackTimes(path.length);
  return {
    type: 'Feature' as const,
    id,
    geometry: {
      type: 'LineString',
      coordinates: path,
    },
    properties: {
      kind: 'TRACK',
      id,
      name,
      colour,
      timestamps: times,
      provenance: [
        {
          activity_id: `prov-${id}`,
          timestamp: times[0],
          was_generated_by: { tool: 'dev-fixture', version: '0.1' },
          used: [],
          generated: [id],
          execution_duration: 'PT4H',
        },
      ],
    },
  };
}

function makeReferencePoint(id: string, name: string, lon: number, lat: number, colour: string) {
  return {
    type: 'Feature' as const,
    id,
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
      kind: 'POINT',
      id,
      name,
      colour,
    },
  };
}

// ─── Scene helpers ───────────────────────────────────────────────────

interface SceneDef {
  index: number;
  title: string;
  description: string;
  centerLon: number;
  centerLat: number;
  zoom: number;
  visibleIds: string[];
  /**
   * Captured per-Scene track display mode (#258 / #280). `'trail'` makes
   * time-stamped tracks grow up to the playback time; `'full'` shows the
   * whole track. Left undefined to model a legacy/pre-#258 Scene (the
   * renderer treats absent as Full).
   */
  displayMode?: 'full' | 'trail';
  /**
   * If set, the Scene becomes a time-range Scene (#263). The slider
   * binds to this range during the Scene; the viewport interpolates
   * from `(centerLon, centerLat, zoom)` → `endViewport` in lock-step
   * with the slider over `transitionDurationMs` wall-clock.
   */
  timeRange?: {
    startIso: string;
    endIso: string;
    endLon: number;
    endLat: number;
    endZoom: number;
    durationMs: number;
  };
}

function makeScene(def: SceneDef): SceneFeature {
  const suffix = String(def.index + 1).padStart(11, '0');
  const timestamp = new Date(T0 + def.index * 30 * 60 * 1000).toISOString();
  const padding = 360 / Math.pow(2, def.zoom + 1);
  const baseProperties = {
    kind: 'STORYBOARD_SCENE',
    id: `01HKVZ0DEVSCENE${suffix}`,
    storyboard_id: STORYBOARD_ID,
    title: def.title,
    description: def.description,
    timestamp,
    creation_order: def.index,
    viewport: {
      center: [def.centerLon, def.centerLat],
      zoom: def.zoom,
      bearing: 0,
    },
    transition_duration_ms: def.timeRange?.durationMs ?? 1500,
    visible_feature_ids: def.visibleIds,
    // #258 / #280: emit the canonical snake_case `display_mode` slot only
    // when the Scene captured one — leaving it absent models a legacy Scene.
    ...(def.displayMode !== undefined ? { display_mode: def.displayMode } : {}),
  };
  const timeRangeProperties = def.timeRange
    ? {
        time_range: {
          start: def.timeRange.startIso,
          end: def.timeRange.endIso,
        },
        viewport_end: {
          center: [def.timeRange.endLon, def.timeRange.endLat],
          zoom: def.timeRange.endZoom,
          bearing: 0,
        },
      }
    : {};
  return {
    type: 'Feature',
    id: `01HKVZ0DEVSCENE${suffix}`,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [def.centerLon - padding, def.centerLat - padding],
          [def.centerLon + padding, def.centerLat - padding],
          [def.centerLon + padding, def.centerLat + padding],
          [def.centerLon - padding, def.centerLat + padding],
          [def.centerLon - padding, def.centerLat - padding],
        ],
      ],
    },
    properties: { ...baseProperties, ...timeRangeProperties },
  } as unknown as SceneFeature;
}

// ─── Fixture entry point ─────────────────────────────────────────────

export function buildDevFixture(): LoadedInlineData {
  const storyboard: StoryboardFeature = {
    type: 'Feature',
    id: STORYBOARD_ID,
    geometry: {
      type: 'Polygon',
      coordinates: [[[-15, 45], [10, 45], [10, 60], [-15, 60], [-15, 45]]],
    },
    properties: {
      kind: 'STORYBOARD',
      id: STORYBOARD_ID,
      name: 'Channel Crossing — Demo Briefing',
      description:
        'Demonstration Storyboard tracking two vessels (Track-Alpha and Track-Bravo) through the English Channel and North Sea over a four-hour window.',
      schema_version: 2,
    },
  } as unknown as StoryboardFeature;

  const trackAlpha = makeTrack(TRACK_ALPHA_ID, 'Track-Alpha', ALPHA_PATH, '#1f77b4');
  const trackBravo = makeTrack(TRACK_BRAVO_ID, 'Track-Bravo', BRAVO_PATH, '#d62728');
  const refDover = makeReferencePoint(REF_DOVER_ID, 'Dover', 1.31, 51.13, '#2ca02c');
  const refBrest = makeReferencePoint(REF_BREST_ID, 'Brest', -4.49, 48.39, '#2ca02c');

  const scenes: SceneFeature[] = [
    makeScene({
      index: 0,
      title: 'Exercise overview',
      description:
        'Both tracks visible at the start of the exercise. Track-Alpha (blue) sails out of Brest; Track-Bravo (red) departs the North Sea heading south-west.',
      centerLon: 0,
      centerLat: 51,
      zoom: 5,
      visibleIds: [TRACK_ALPHA_ID, TRACK_BRAVO_ID, REF_DOVER_ID, REF_BREST_ID],
      // Captured in Full mode — the overview shows each vessel's whole route.
      displayMode: 'full',
    }),
    makeScene({
      index: 1,
      title: 'Track-Alpha approaches the Channel',
      description:
        'Zoom on Track-Alpha as it rounds Land\'s End and heads east through the Western Approaches.',
      centerLon: -3,
      centerLat: 50,
      zoom: 6,
      visibleIds: [TRACK_ALPHA_ID, REF_BREST_ID],
    }),
    makeScene({
      index: 2,
      title: 'Convergence — Dover Strait',
      description:
        'Both tracks visible converging near Dover. Track-Alpha continues NE; Track-Bravo crosses ahead heading SW.',
      centerLon: 1.5,
      centerLat: 51,
      zoom: 6,
      visibleIds: [TRACK_ALPHA_ID, TRACK_BRAVO_ID, REF_DOVER_ID],
    }),
    makeScene({
      index: 3,
      title: 'Trail scrub — the snail-trail grows (#280)',
      description:
        'Trail-mode time-range Scene (#258 / #280). The slider binds to the whole exercise window; as it advances each track grows from its start up to the playback time — a snail-trail trailing the moving dot — while the viewport interpolates Dover Strait → North Sea in lock-step. Drag the slider to watch the trails grow and shrink.',
      centerLon: 1.5,
      centerLat: 51.2,
      zoom: 6,
      visibleIds: [TRACK_ALPHA_ID, TRACK_BRAVO_ID, REF_DOVER_ID, REF_BREST_ID],
      // Captured in Trail mode (#280) — the headline demo for this feature.
      displayMode: 'trail',
      // Bind the slider to the full exercise window so the trail grows from
      // near-zero at the start to the complete track at the end.
      timeRange: {
        startIso: new Date(T0).toISOString(),
        endIso: new Date(T_END).toISOString(),
        endLon: 3,
        endLat: 52.5,
        endZoom: 6,
        durationMs: 2500,
      },
    }),
  ];

  const dataFeatures = [trackAlpha, trackBravo, refDover, refBrest];

  const features: BriefingFeatureCollection = {
    type: 'FeatureCollection',
    features: [storyboard, ...scenes, ...dataFeatures],
  } as unknown as BriefingFeatureCollection;

  const item: BriefingItemJson = {
    type: 'Feature',
    stac_version: '1.1.0',
    id: 'dev-fixture-plot',
    properties: {
      title: 'Channel Crossing — Demo Briefing',
      datetime: scenes[0]?.properties.timestamp ?? null,
      start_datetime: scenes[0]?.properties.timestamp ?? undefined,
      end_datetime: scenes[scenes.length - 1]?.properties.timestamp ?? undefined,
    },
    assets: {},
    links: [{ rel: 'self', href: './item.json' }],
  };

  const config: BriefingConfig = {
    tileLayerAttribution: '© OpenStreetMap contributors',
    schemaVersion: '2',
    exportedAt: new Date().toISOString(),
    sourcePlotTitle: 'Channel Crossing — Demo Briefing',
    storyboardName: 'Channel Crossing — Demo Briefing',
    maxBundledZoom: 7,
  };

  return { features, item, config, storyboard, scenes };
}
