/**
 * zipAssembler — pure helper that builds the briefing zip in memory via
 * JSZip and returns the resulting `Uint8Array`. Never touches disk.
 *
 * Layout per data-model § 1:
 *
 *   /index.html                      (injected per-export)
 *   /assets/**                       (from the static bundle)
 *   /features.geojson                (pretty-printed, for inspection)
 *   /item.json                       (pretty-printed, for inspection)
 *   /scene-thumbnails/scene-{ULID}.png + -sm.png
 *   /tiles/{z}/{x}/{y}.png + placeholder.png
 *   /README.txt                      (recipient-facing usage doc)
 */

import JSZip from 'jszip';
import type { TileCoord } from './computeTileCoverage';

export interface ZipAssemblerInput {
  /** The injected index.html (output of `injectInlineData`). */
  indexHtml: string;
  /**
   * Static SPA bundle as a path → bytes map. Typically read once from
   * `apps/vscode/resources/briefing-renderer-static/` by the orchestrator.
   * Should include every file under that root except `index.html` (we
   * use the injected version above). May include `tiles/placeholder.png`.
   */
  staticBundle: ReadonlyMap<string, Uint8Array>;
  /** Pretty-printed JSON for the convenience copy. */
  featuresGeojson: string;
  /** Pretty-printed JSON for the convenience copy. */
  itemJson: string;
  /**
   * Successfully-fetched basemap tiles, keyed by `${z}/${x}/${y}` (no
   * `tiles/` prefix). Missing tiles are simply absent — the SPA's
   * `errorTileUrl` placeholder handles them.
   */
  tiles: ReadonlyMap<string, Uint8Array>;
  /**
   * Scene-thumbnail bytes, keyed by the in-zip path
   * (e.g. `scene-thumbnails/scene-{ULID}.png`). Missing entries are
   * skipped (FR-031).
   */
  sceneThumbnails: ReadonlyMap<string, Uint8Array>;
  /** Optional recipient-facing usage doc; included as `README.txt` at zip root. */
  readme?: string;
}

export interface ZipAssemblerOutput {
  bytes: Uint8Array;
  tileCount: number;
  thumbnailCount: number;
}

export async function assembleZip(input: ZipAssemblerInput): Promise<ZipAssemblerOutput> {
  const zip = new JSZip();

  zip.file('index.html', input.indexHtml);
  zip.file('features.geojson', input.featuresGeojson);
  zip.file('item.json', input.itemJson);

  if (input.readme && input.readme.length > 0) {
    zip.file('README.txt', input.readme);
  }

  // Copy every file from the static bundle except an index.html (which
  // would shadow the injected version).
  for (const [path, bytes] of input.staticBundle) {
    if (path === 'index.html' || path === '/index.html') {continue;}
    // Strip any leading slash so JSZip emits relative paths only (FR-013).
    const cleaned = path.replace(/^\/+/, '');
    zip.file(cleaned, bytes);
  }

  let tileCount = 0;
  for (const [key, bytes] of input.tiles) {
    // key is `${z}/${x}/${y}`; in-zip path is `tiles/${key}.png`.
    zip.file(`tiles/${key}.png`, bytes);
    tileCount++;
  }

  let thumbnailCount = 0;
  for (const [path, bytes] of input.sceneThumbnails) {
    const cleaned = path.replace(/^\/+/, '');
    zip.file(cleaned, bytes);
    thumbnailCount++;
  }

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { bytes, tileCount, thumbnailCount };
}

/** Helper exposed for tests + the orchestrator. */
export function tileKeyOf(coord: TileCoord): string {
  return `${coord.z}/${coord.x}/${coord.y}`;
}
