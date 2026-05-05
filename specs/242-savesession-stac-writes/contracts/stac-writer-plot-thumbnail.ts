/**
 * Contract: writePlotThumbnailPair extension to StacWriter
 *
 * Spec: 242-savesession-stac-writes
 * Target file: shared/stac-writer/src/interface.ts
 *
 * This contract defines the new method to be added to the StacWriter interface.
 * Existing context (StoreContext, StacWriter) is imported from the live interface.
 */

import type { StoreContext, StacWriter } from '../../../shared/stac-writer/src/interface';

// ─── New input/result types ────────────────────────────────────────────────

/**
 * Input to writePlotThumbnailPair.
 *
 * Distinct from WriteSceneThumbnailPairInput (which carries a sceneId and
 * writes scene-specific asset keys). Plot thumbnails are written to the root
 * of the STAC item's asset map under the fixed keys "thumbnail" and "overview".
 */
export interface WritePlotThumbnailPairInput {
  readonly ctx: StoreContext;
  /** Relative path to item.json within the store root, e.g. "catalog/item.json". */
  readonly stacItemPath: string;
  /** Base64-encoded PNG, target dimensions 800×600 ("overview" asset). */
  readonly largePngBase64: string;
  /** Base64-encoded PNG, target dimensions 200×150 ("thumbnail" asset). */
  readonly smallPngBase64: string;
}

export interface WritePlotThumbnailPairResult {
  /** Absolute filesystem path where thumbnail.png was written (VS Code host). */
  readonly thumbnailPath: string;
  /** Absolute filesystem path where overview.png was written (VS Code host). */
  readonly overviewPath: string;
}

// ─── Extended interface ───────────────────────────────────────────────────

/**
 * StacWriter with writePlotThumbnailPair added.
 * The live interface.ts adds this method directly to StacWriter.
 */
export interface StacWriterWithPlotThumbnail extends StacWriter {
  writePlotThumbnailPair(
    input: WritePlotThumbnailPairInput,
  ): Promise<WritePlotThumbnailPairResult>;
}

// ─── Error cases ──────────────────────────────────────────────────────────

/**
 * Error kinds raised by writePlotThumbnailPair (existing StacWriterError taxonomy):
 *
 * 'empty-png'           — largePngBase64 or smallPngBase64 decodes to zero bytes
 * 'path-rejected'       — stacItemPath is absolute, contains '..', or has control chars
 * 'stac-item-not-found' — item.json does not exist at the resolved path
 * 'item-json-malformed' — item.json is not valid JSON or missing required fields
 * 'write-failed'        — underlying fs write error (EACCES, ENOSPC, etc.)
 * 'validation-failed'   — web-shell host: operation not supported
 */

// ─── Expected STAC asset shape (post-write) ───────────────────────────────

export interface PlotThumbnailAsset {
  readonly href: './thumbnail.png';
  readonly type: 'image/png';
  readonly roles: ['thumbnail'];
  readonly 'proj:shape': [150, 200]; // [height, width]
  readonly 'file:size': number;
  readonly 'file:checksum': string; // multihash SHA-256: "1220<hex>"
}

export interface PlotOverviewAsset {
  readonly href: './overview.png';
  readonly type: 'image/png';
  readonly roles: ['overview'];
  readonly 'proj:shape': [600, 800]; // [height, width]
  readonly 'file:size': number;
  readonly 'file:checksum': string; // multihash SHA-256: "1220<hex>"
}

/**
 * After a successful writePlotThumbnailPair call, item.json assets contain:
 *
 * {
 *   "thumbnail": PlotThumbnailAsset,
 *   "overview": PlotOverviewAsset,
 *   // legacy "thumbnail-sm" key removed if present
 * }
 */
