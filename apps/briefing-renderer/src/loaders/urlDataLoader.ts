/**
 * URL-data loader for the briefing renderer SPA (#273, live preview).
 *
 * This is the renderer's *second*, additive boot path. It activates only
 * when the launch URL carries a `?features=<encoded-url>` query parameter
 * (see `App.tsx`). The air-gapped inline-boot path
 * (`inlineDataLoader.loadInlineData`) is left completely untouched — when
 * no `features` URL is supplied the renderer never reaches this module and
 * issues zero network requests for storyboard data (FR-010/011, contract
 * preview-boot G3).
 *
 * Unlike the inline path, this path is inherently asynchronous (it
 * `fetch`es a remote/blob URL), so it cannot seed the store synchronously
 * before first paint — it runs through the normal
 * `loading → ready | empty | error` lifecycle instead.
 *
 * It reuses the *existing* boundary validators from `inlineDataLoader`
 * (`validateFeatureCollection`, `validateItem`, `validateConfig`) so the
 * two boot paths enforce identical invariants without divergent
 * normalisation (contract preview-boot G7).
 *
 * The renderer needs `item` and `config` in addition to `features`. For a
 * one-URL preview the loader **synthesises** them: a minimal STAC-like
 * `item` (playback flies to viewports; it does not need scene-thumbnail
 * assets) and a `config` whose `tileLayerUrl` points at an online basemap
 * (the inline/zip path leaves that unset and keeps its bundled tiles).
 */

import {
  InlineDataLoadError,
  validateConfig,
  validateFeatureCollection,
  validateItem,
  type LoadedInlineData,
} from './inlineDataLoader';
import type {
  BriefingConfig,
  BriefingFeatureCollection,
  BriefingItemJson,
} from '../types';

/** Online basemap used for the live preview (FR-006: offline degrades to
 *  the `errorTileUrl` placeholder; basemap availability follows the normal
 *  map view per spec A-4). */
export const PREVIEW_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const PREVIEW_TILE_ATTRIBUTION = '© OpenStreetMap contributors';
/** High enough that online zoom-in is not clamped by `maxBundledZoom`. */
const PREVIEW_MAX_ZOOM = 19;

export interface UrlLoaderDeps {
  /** Bytes/text fetcher. Injected for tests; production uses global `fetch`. */
  fetchText(url: string): Promise<string>;
}

export const defaultUrlLoaderDeps: UrlLoaderDeps = {
  async fetchText(url: string): Promise<string> {
    let response: Response;
    try {
      response = await fetch(url);
    } catch (e) {
      throw new InlineDataLoadError(
        `Could not fetch briefing data from ${url}: ${(e as Error).message}`,
        'features',
      );
    }
    if (!response.ok) {
      throw new InlineDataLoadError(
        `Briefing data request failed (HTTP ${response.status}) for ${url}`,
        'features',
      );
    }
    return response.text();
  },
};

function synthesiseItem(features: BriefingFeatureCollection): BriefingItemJson {
  const rawId = (features as unknown as { id?: unknown }).id;
  const id = typeof rawId === 'string' && rawId.length > 0 ? rawId : 'preview';
  return {
    type: 'Feature',
    stac_version: '1.1.0',
    id,
    properties: {},
    assets: {},
    links: [],
  };
}

function synthesiseConfig(storyboardName: string, schemaVersion: string): BriefingConfig {
  return {
    tileLayerAttribution: PREVIEW_TILE_ATTRIBUTION,
    schemaVersion,
    exportedAt: new Date().toISOString(),
    sourcePlotTitle: storyboardName,
    storyboardName,
    maxBundledZoom: PREVIEW_MAX_ZOOM,
    tileLayerUrl: PREVIEW_TILE_URL,
  };
}

/**
 * Fetch the `features` URL, validate it with the existing boundary
 * validators, synthesise the minimal `item` + `config`, and return the
 * same `LoadedInlineData` shape the inline path produces. Throws
 * `InlineDataLoadError` on any failure (unreachable URL, bad JSON, invalid
 * payload) so the caller can surface the renderer's human-readable error
 * state (FR-008, contract preview-boot G5).
 */
export async function fetchAndValidateFeaturesUrl(
  url: string,
  deps: UrlLoaderDeps = defaultUrlLoaderDeps,
): Promise<LoadedInlineData> {
  let raw: string;
  try {
    raw = await deps.fetchText(url);
  } catch (e) {
    if (e instanceof InlineDataLoadError) throw e;
    throw new InlineDataLoadError(
      `Could not fetch briefing data from ${url}: ${(e as Error).message}`,
      'features',
    );
  }

  let features: BriefingFeatureCollection;
  try {
    features = JSON.parse(raw) as BriefingFeatureCollection;
  } catch (e) {
    throw new InlineDataLoadError(
      `Briefing data at ${url} is not valid JSON: ${(e as Error).message}`,
      'features',
    );
  }

  // Reuse the existing validators (contract preview-boot G7).
  const { storyboard, scenes } = validateFeatureCollection(features);

  const schemaVersion = String(
    (storyboard.properties as { schema_version?: unknown }).schema_version ?? 2,
  );
  const storyboardName =
    (storyboard.properties as { name?: unknown }).name != null
      ? String((storyboard.properties as { name: unknown }).name)
      : 'Preview';

  const item = synthesiseItem(features);
  const config = synthesiseConfig(storyboardName, schemaVersion);

  validateItem(item);
  validateConfig(config);

  return { features, item, config, storyboard, scenes };
}
