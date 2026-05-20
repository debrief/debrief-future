/**
 * Local dev fixture so `pnpm dev` can boot the SPA without needing a real
 * export. Returns a synthetic single-Storyboard briefing payload with a
 * handful of instant Scenes scattered across the North Atlantic.
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

function makeScene(suffix: string, index: number, lat: number, lon: number): SceneFeature {
  const timestamp = new Date(Date.UTC(2025, 0, 15, 12, index * 15, 0)).toISOString();
  const padding = 1.5;
  return {
    type: 'Feature',
    id: `01HKVZ0DEVSCENE${suffix.padStart(11, '0')}`,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lon - padding, lat - padding],
          [lon + padding, lat - padding],
          [lon + padding, lat + padding],
          [lon - padding, lat + padding],
          [lon - padding, lat - padding],
        ],
      ],
    },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: `01HKVZ0DEVSCENE${suffix.padStart(11, '0')}`,
      storyboard_id: STORYBOARD_ID,
      title: `Scene ${index + 1}`,
      description: `Dev fixture Scene ${index + 1}.`,
      timestamp,
      creation_order: index,
      viewport: {
        center: [lon, lat],
        zoom: 6,
        bearing: 0,
      },
      transition_duration_ms: 1500,
      visible_feature_ids: [],
      displayMode: 'minimal',
    },
  } as unknown as SceneFeature;
}

export function buildDevFixture(): LoadedInlineData {
  const storyboard: StoryboardFeature = {
    type: 'Feature',
    id: STORYBOARD_ID,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-15, 45],
          [5, 45],
          [5, 60],
          [-15, 60],
          [-15, 45],
        ],
      ],
    },
    properties: {
      kind: 'STORYBOARD',
      id: STORYBOARD_ID,
      name: 'Dev fixture Storyboard',
      description: 'Synthetic Storyboard used by the briefing renderer dev server.',
      schema_version: 2,
    },
  } as unknown as StoryboardFeature;

  const scenes: SceneFeature[] = [
    makeScene('1', 0, 50.5, -5.0),
    makeScene('2', 1, 52.0, -2.0),
    makeScene('3', 2, 55.0, 0.0),
    makeScene('4', 3, 57.0, 3.0),
  ];

  const features: BriefingFeatureCollection = {
    type: 'FeatureCollection',
    features: [storyboard, ...scenes],
  } as unknown as BriefingFeatureCollection;

  const item: BriefingItemJson = {
    type: 'Feature',
    stac_version: '1.1.0',
    id: 'dev-fixture-plot',
    properties: {
      title: 'Dev fixture plot',
      datetime: scenes[0]?.properties.timestamp ?? null,
      start_datetime: scenes[0]?.properties.timestamp ?? undefined,
      end_datetime: scenes[scenes.length - 1]?.properties.timestamp ?? undefined,
    },
    assets: {},
    links: [{ rel: 'self', href: './item.json' }],
  };

  const config: BriefingConfig = {
    tileLayerAttribution: '© OpenStreetMap contributors (dev fixture)',
    schemaVersion: '2',
    exportedAt: new Date().toISOString(),
    sourcePlotTitle: 'Dev fixture plot',
    storyboardName: 'Dev fixture Storyboard',
    maxBundledZoom: 8,
  };

  return { features, item, config, storyboard, scenes };
}
