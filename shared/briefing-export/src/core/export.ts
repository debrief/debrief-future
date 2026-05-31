/**
 * exportBriefingZip — pure orchestrator for the briefing-zip export.
 *
 * Implements the 11-step contract in `contracts/export-command.md`. The
 * VS Code command handler injects the real I/O dependencies; tests
 * inject stubs.
 *
 * The orchestrator is **side-effect free except via its injected
 * deps** — every external touch (filesystem read, network fetch, save
 * dialog, error notification, file write) goes through `ExportDeps`.
 * That keeps the integration test (T035) tractable without spinning
 * up a real VS Code host.
 */

import type {
  SceneFeature,
  StoryboardFeature,
  StoryboardPlot,
} from '@debrief/components/storyboard';
import { scopeStoryboard } from './scopeStoryboard';
import { buildItemJson, type StacItemMinimal } from './buildItemJson';
import { computeTileCoverage, type TileCoord } from './computeTileCoverage';
import { injectInlineData } from './injectInlineData';
import { assembleZip } from './zipAssembler';
import { fetchTiles } from './fetchTiles';

export interface BriefingConfigForExport {
  tileLayerAttribution: string;
  schemaVersion: string;
  exportedAt: string;
  sourcePlotTitle: string;
  storyboardName: string;
  maxBundledZoom: number;
}

export interface ExportBriefingZipInput {
  /** ULID of the chosen StoryboardFeature. */
  storyboardId: string;
  /** Source plot's FeatureCollection (already loaded). */
  plot: StoryboardPlot;
  /** Source plot's STAC item.json (already loaded). */
  item: StacItemMinimal;
  /** Optional override for the bundled-tile URL template. */
  tileUrlTemplate?: string;
  /** Optional zip-root README contents (recipient-facing usage doc). */
  readme?: string;
  /** Test-only: override the inter-tile delay (defaults to fetchTiles' 100 ms). */
  delayBetweenTilesMs?: number;
  /** Test-only: per-tile retry count (defaults to fetchTiles' 3). */
  tileRetries?: number;
  /** Test-only: per-retry backoff in ms (defaults to fetchTiles' 100). */
  tileBackoffMs?: number;
}

export interface ExportDeps {
  /** Read the static SPA bundle (index.html + assets/ + placeholder tile). */
  readStaticBundle(): Promise<ReadonlyMap<string, Uint8Array>>;
  /**
   * Read a Scene thumbnail asset by relative href (the value from
   * `item.assets[key].href`). Returns null when the file is missing.
   */
  readThumbnail(href: string): Promise<Uint8Array | null>;
  /** HTTPS fetch one tile by URL. */
  fetchTile(url: string): Promise<Uint8Array>;
  /** Optional progress reporter for the (long) tile-fetch step. */
  onTileProgress?: (fetched: number, total: number) => void;
  /** Logger for tile-fetch failures (FR-028: logged-not-thrown). */
  logWarning?: (msg: string) => void;
}

export interface ExportBriefingZipOutput {
  bytes: Uint8Array;
  tileCount: number;
  thumbnailCount: number;
  tileFetchErrors: number;
  /** The resolved StoryboardFeature for the chosen id. */
  storyboard: StoryboardFeature;
  /** Ordered Scenes in scope (BR-5 order). */
  scenes: readonly SceneFeature[];
  /** Tile coordinates the SPA expects to find inside the zip. */
  expectedTiles: readonly TileCoord[];
  /** Max zoom level present in the bundled tile cache. */
  maxBundledZoom: number;
}

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '© OpenStreetMap contributors (basemap tiles bundled for offline briefing)';

export async function exportBriefingZip(
  input: ExportBriefingZipInput,
  deps: ExportDeps,
): Promise<ExportBriefingZipOutput> {
  // Step 1-3: scope the plot.
  const scoped = scopeStoryboard(input.plot, input.storyboardId);

  // Step 4: scoped item.json.
  const briefingItem = buildItemJson(input.item, scoped.scenes);

  // Step 5: prompt for destination — handled by the VS Code command,
  // not the orchestrator. The orchestrator never writes to disk; it
  // returns bytes and lets the command handler call `writeFile`.

  // Step 6: compute tile coverage + fetch tiles.
  const coverage = computeTileCoverage({ scenes: scoped.scenes });
  const fetchResult =
    coverage.tiles.length > 0
      ? await fetchTiles({
          tiles: coverage.tiles,
          tileUrlTemplate: input.tileUrlTemplate ?? DEFAULT_TILE_URL,
          fetcher: (url) => deps.fetchTile(url),
          onProgress: deps.onTileProgress,
          ...(input.delayBetweenTilesMs !== undefined
            ? { delayBetweenMs: input.delayBetweenTilesMs }
            : {}),
          ...(input.tileRetries !== undefined ? { retries: input.tileRetries } : {}),
          ...(input.tileBackoffMs !== undefined ? { backoffMs: input.tileBackoffMs } : {}),
        })
      : { fetched: new Map<string, Uint8Array>(), errors: [] };

  for (const err of fetchResult.errors) {
    deps.logWarning?.(
      `Tile fetch failed for z=${err.tile.z} x=${err.tile.x} y=${err.tile.y}: ${err.error.message}`,
    );
  }

  // Step 7: read the static SPA bundle.
  const staticBundle = await deps.readStaticBundle();
  const indexTemplate = staticBundle.get('index.html');
  if (!indexTemplate) {
    throw new Error(
      'Briefing renderer static bundle is missing index.html — re-run `pnpm --filter @debrief/briefing-renderer build` and the resource-sync step',
    );
  }
  const indexTemplateText = new TextDecoder('utf-8').decode(indexTemplate);

  // Build the in-zip config payload.
  const config: BriefingConfigForExport = {
    tileLayerAttribution: DEFAULT_ATTRIBUTION,
    schemaVersion: String(scoped.storyboard.properties.schema_version ?? 2),
    exportedAt: new Date().toISOString(),
    sourcePlotTitle: ((input.item.properties as { title?: string }).title ?? input.item.id),
    storyboardName: (scoped.storyboard.properties.name) ?? 'Briefing',
    maxBundledZoom: coverage.maxZoom,
  };

  // Step 8: inject inline data into index.html.
  const injection = injectInlineData(indexTemplateText, {
    features: scoped.fc,
    item: briefingItem,
    config,
  });
  if (!injection.allSlotsFilled) {
    throw new Error(
      `index.html template is missing required <script> slot(s): ${injection.missingSlots.join(', ')}`,
    );
  }

  // Read Scene thumbnails — each Scene has a paired asset (large +
  // small) in `briefingItem.assets`. Missing files are skipped (FR-031).
  const thumbnails = new Map<string, Uint8Array>();
  for (const scene of scoped.scenes) {
    for (const key of Object.keys(briefingItem.assets)) {
      if (!key.includes(scene.properties.id)) {continue;}
      const asset = briefingItem.assets[key];
      if (!asset) {continue;}
      const bytes = await deps.readThumbnail(asset.href);
      if (bytes) {
        // Strip any leading './' so the zip-internal path is stable.
        const zipPath = asset.href.replace(/^\.\/+/, '');
        thumbnails.set(zipPath, bytes);
      }
    }
  }

  // Step 9: assemble the zip.
  const assembled = await assembleZip({
    indexHtml: injection.html,
    staticBundle,
    featuresGeojson: JSON.stringify(scoped.fc, null, 2),
    itemJson: JSON.stringify(briefingItem, null, 2),
    tiles: fetchResult.fetched,
    sceneThumbnails: thumbnails,
    readme: input.readme,
  });

  return {
    bytes: assembled.bytes,
    tileCount: assembled.tileCount,
    thumbnailCount: assembled.thumbnailCount,
    tileFetchErrors: fetchResult.errors.length,
    storyboard: scoped.storyboard,
    scenes: scoped.scenes,
    expectedTiles: coverage.tiles,
    maxBundledZoom: coverage.maxZoom,
  };
}
