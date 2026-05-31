/**
 * Local boundary-type aliases for the briefing renderer SPA (#264).
 *
 * Per Constitution Article IV.5, boundary types are *derived* — never
 * re-listed. The briefing FeatureCollection is structurally identical to
 * the `StoryboardPlot` (alias of `Plot`) used by `@debrief/components/storyboard`,
 * which is the canonical loose-typed FeatureCollection that lets a plot
 * carry Storyboard / Scene features alongside the strongly-typed
 * `DebriefFeature` set. See data-model.md § 7 for the exhaustiveness guards.
 *
 * `BriefingConfig` is the only net-new type in this feature — purely
 * chrome metadata, no source type to drift from.
 */

import type {
  StoryboardPlot,
  SceneFeature,
  StoryboardFeature,
} from '@debrief/components';
import type { DisplayMode as SessionDisplayMode } from '@debrief/session-state';

// Briefing FeatureCollection is structurally identical to a plot FC —
// alias so the type drifts in lock-step with the canonical source.
export type BriefingFeatureCollection = StoryboardPlot;

export type { StoryboardFeature, SceneFeature };

/**
 * Briefing item.json — a strict subset of the plot's STAC item.
 *
 * The Pydantic-generated `StacItem` type does not yet have a corresponding
 * TS export in `@debrief/schemas`. Until that lands (#223), we declare a
 * hand-typed minimal shape here and narrow at the boundary via
 * `inlineDataLoader`. If/when a generated `StacItem` lands, this becomes
 * `Pick<StacItem, 'type' | 'stac_version' | 'id' | 'properties' | 'assets' | 'links'>`.
 */
export interface BriefingItemJson {
  type: 'Feature';
  stac_version: string;
  id: string;
  properties: {
    title?: string;
    datetime?: string | null;
    start_datetime?: string;
    end_datetime?: string;
    [key: string]: unknown;
  };
  assets: Record<string, { href: string; type?: string; title?: string; roles?: string[] }>;
  links: Array<{ rel: string; href: string; type?: string; title?: string }>;
}

export interface BriefingConfig {
  tileLayerAttribution: string;
  schemaVersion: string; // matches source plot's storyboard schema_version
  exportedAt: string; // ISO-8601 timestamp of export
  sourcePlotTitle: string;
  storyboardName: string;
  /**
   * Maximum zoom level present in the bundled basemap tile cache. The SPA
   * passes this through to `<MapView maxZoom={…} />` so Leaflet clamps
   * zoom-in attempts at the level we actually have tiles for, instead of
   * showing missing-tile placeholders.
   */
  maxBundledZoom: number;
  /**
   * Optional basemap tile-URL template (`{z}/{x}/{y}`). Set only by the
   * live-preview URL-boot path (#273) to point at an online basemap; the
   * air-gapped inline/zip path leaves it unset so `BriefingMap` falls back
   * to the bundled local tiles (`./tiles/{z}/{x}/{y}.png`). Keeping it
   * optional means the offline path is byte-identical to before #273.
   */
  tileLayerUrl?: string;
}

/**
 * Briefing-renderer display mode — distinct from the session-state
 * `DisplayMode` (which models the temporal trail/full toggle). Renamed
 * here to `BriefingDisplayMode` so the two never collide.
 */
export type BriefingDisplayMode = 'present' | 'minimal';

// Re-exported only so consumers needing the canonical session-state type
// don't have to import from two places. We never use it directly inside
// the briefing renderer.
export type { SessionDisplayMode };

export type PlayState = 'playing' | 'paused' | 'idle';

export interface InlineData {
  features: BriefingFeatureCollection;
  item: BriefingItemJson;
  config: BriefingConfig;
}

export type HaltedReason =
  | { kind: 'adapter'; adapter: string; message: string }
  | { kind: 'tween'; message: string }
  | { kind: 'loader'; message: string };
