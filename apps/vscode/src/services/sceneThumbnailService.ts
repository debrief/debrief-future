/**
 * Per-Scene thumbnail writer for Feature 216 (Storyboarding — Capture).
 *
 * **Asset-key contract** documented at:
 *   - `shared/schemas/src/linkml/storyboard.yaml` :: `SceneThumbnailAssetEntry`
 *     (LinkML class — single source of truth for the per-key value shape)
 *   - `shared/schemas/contracts/scene-thumbnail-asset.schema.json`
 *     (JSON Schema overlay — patternProperties wrapper + ULID key format)
 *
 * Pairing and orphan invariants (`scene-thumbnail-pair-rule-001`,
 * `scene-thumbnail-orphan-rule-001`) are enforced by
 * `services/stac/src/debrief_stac/scene_thumbnail_audit.py`. See spec 243
 * for the contract formalisation history.
 *
 * Sits on the synchronous critical path between #174's
 * `MapPanel.requestThumbnailCapture()` (base64 PNG pair) and #215's
 * `createScene(…)` (CRUD boundary). Writes two PNGs into
 * `{stacItemPath}/scene-thumbnails/` and merges two STAC asset entries into
 * the plot's `item.json.assets`.
 *
 * Atomicity order (contract §3):
 *   1. Ensure `scene-thumbnails/` exists (idempotent).
 *   2. Write large PNG via tmp + fsync + rename.
 *   3. Write small PNG via tmp + fsync + rename.
 *   4. Rewrite `item.json` via tmp + fsync + rename.
 *
 * On any failure the partial `.tmp` is unlinked best-effort, and any
 * already-renamed PNGs are orphaned (harmless — the Scene is never created
 * when this service throws, and orphan PNGs have no `item.json` asset entry
 * pointing at them).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { StacAsset, StacItem } from '@debrief/schemas';
import { SceneThumbnailError } from './sceneThumbnailError';

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export interface WriteSceneThumbnailResult {
  /** STAC asset key written into `SceneProperties.thumbnail_asset_ref`. */
  readonly assetKey: string;
  /** Absolute path of the 800×600 large PNG. */
  readonly largePath: string;
  /** Absolute path of the 200×150 small PNG. */
  readonly smallPath: string;
}

/**
 * Override point for tests — swap the fs module with an in-memory
 * implementation (e.g. `memfs`).
 */
export interface SceneThumbnailServiceDeps {
  readonly fs: FsLike;
}

export type FsLike = Pick<
  typeof fs.promises,
  'mkdir' | 'writeFile' | 'readFile' | 'rename' | 'unlink' | 'stat' | 'open'
>;

const DEFAULT_DEPS: SceneThumbnailServiceDeps = { fs: fs.promises };

// Local alias for the asset map shape — derived from the schema's
// StacItem.assets via Pick to keep this file's intent self-documenting.
// Schema-rooted per #223; previously a hand-typed interface.
type StacItemAssets = Record<string, StacAsset>;

function assetKeyFor(sceneId: string): string {
  return `scene-thumbnail-${sceneId}`;
}

function assetKeyForSmall(sceneId: string): string {
  return `scene-thumbnail-${sceneId}-sm`;
}

async function writeAtomic(
  deps: SceneThumbnailServiceDeps,
  targetPath: string,
  data: Buffer | string,
): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;
  try {
    await deps.fs.writeFile(tmpPath, data);
    try {
      const handle = await deps.fs.open(tmpPath, 'r+');
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch {
      // fsync is best-effort; some in-memory fs implementations don't support it.
    }
    await deps.fs.rename(tmpPath, targetPath);
  } catch (err) {
    // Best-effort cleanup; swallow cleanup errors.
    try {
      await deps.fs.unlink(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

async function readItemJson(
  deps: SceneThumbnailServiceDeps,
  itemJsonPath: string,
): Promise<StacItem> {
  let raw: string;
  try {
    raw = await deps.fs.readFile(itemJsonPath, 'utf8');
  } catch (cause) {
    throw new SceneThumbnailError(
      'item-json-unreadable',
      `Could not read ${itemJsonPath}`,
      cause,
    );
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('item.json root is not a JSON object');
    }
    return parsed as StacItem;
  } catch (cause) {
    throw new SceneThumbnailError(
      'item-json-malformed',
      `Could not parse ${itemJsonPath}`,
      cause,
    );
  }
}

async function validateStacItemPath(
  deps: SceneThumbnailServiceDeps,
  stacItemPath: string,
): Promise<string> {
  let itemStat;
  try {
    itemStat = await deps.fs.stat(stacItemPath);
  } catch (cause) {
    throw new SceneThumbnailError(
      'stac-item-not-found',
      `STAC item directory not found: ${stacItemPath}`,
      cause,
    );
  }
  if (!itemStat.isDirectory()) {
    throw new SceneThumbnailError(
      'stac-item-not-found',
      `STAC item path is not a directory: ${stacItemPath}`,
    );
  }
  const itemJsonPath = path.join(stacItemPath, 'item.json');
  try {
    await deps.fs.stat(itemJsonPath);
  } catch (cause) {
    throw new SceneThumbnailError(
      'stac-item-not-found',
      `STAC item.json not found: ${itemJsonPath}`,
      cause,
    );
  }
  return itemJsonPath;
}

function validateSceneId(sceneId: string): void {
  if (!ULID_PATTERN.test(sceneId)) {
    throw new SceneThumbnailError(
      'invalid-scene-id',
      `Scene ID is not a valid ULID: ${sceneId}`,
    );
  }
}

function decodeBase64Png(base64: string): Buffer {
  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new SceneThumbnailError(
      'empty-png',
      'Base64 PNG payload is empty or not a string',
    );
  }
  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0) {
    throw new SceneThumbnailError(
      'empty-png',
      'Base64 PNG decoded to zero bytes',
    );
  }
  return buf;
}

/**
 * Writes the two per-Scene PNGs and merges the asset entries into item.json.
 *
 * On any failure the `item.json` asset map is left unchanged. See contract §3.
 */
export async function writeSceneThumbnail(
  stacItemPath: string,
  sceneId: string,
  largePngBase64: string,
  smallPngBase64: string,
  deps: SceneThumbnailServiceDeps = DEFAULT_DEPS,
): Promise<WriteSceneThumbnailResult> {
  validateSceneId(sceneId);
  const largeBuf = decodeBase64Png(largePngBase64);
  const smallBuf = decodeBase64Png(smallPngBase64);

  const itemJsonPath = await validateStacItemPath(deps, stacItemPath);
  const item = await readItemJson(deps, itemJsonPath);

  const dir = path.join(stacItemPath, 'scene-thumbnails');
  try {
    await deps.fs.mkdir(dir, { recursive: true });
  } catch (cause) {
    throw new SceneThumbnailError(
      'write-failed',
      `Could not create ${dir}`,
      cause,
    );
  }

  const largePath = path.join(dir, `scene-${sceneId}.png`);
  const smallPath = path.join(dir, `scene-${sceneId}-sm.png`);

  try {
    await writeAtomic(deps, largePath, largeBuf);
  } catch (cause) {
    throw new SceneThumbnailError(
      'write-failed',
      `Could not write ${largePath}`,
      cause,
    );
  }

  try {
    await writeAtomic(deps, smallPath, smallBuf);
  } catch (cause) {
    throw new SceneThumbnailError(
      'write-failed',
      `Could not write ${smallPath}`,
      cause,
    );
  }

  const nextAssets: StacItemAssets = {
    ...(item.assets ?? {}),
    [assetKeyFor(sceneId)]: {
      href: `./scene-thumbnails/scene-${sceneId}.png`,
      type: 'image/png',
      title: 'Scene thumbnail',
      roles: ['thumbnail'],
    },
    [assetKeyForSmall(sceneId)]: {
      href: `./scene-thumbnails/scene-${sceneId}-sm.png`,
      type: 'image/png',
      title: 'Scene thumbnail (small)',
      roles: ['thumbnail'],
    },
  };
  const nextItem: StacItem = { ...item, assets: nextAssets };
  const serialised = `${JSON.stringify(nextItem, null, 2)}\n`;

  try {
    await writeAtomic(deps, itemJsonPath, serialised);
  } catch (cause) {
    throw new SceneThumbnailError(
      'rename-failed',
      `Could not commit updated ${itemJsonPath}`,
      cause,
    );
  }

  return {
    assetKey: assetKeyFor(sceneId),
    largePath,
    smallPath,
  };
}

/**
 * Removes both per-Scene PNGs and both asset entries from item.json.
 * Provided for #218's delete-with-undo flow — not called by #216's command.
 */
export async function deleteSceneThumbnail(
  stacItemPath: string,
  sceneId: string,
  deps: SceneThumbnailServiceDeps = DEFAULT_DEPS,
): Promise<void> {
  validateSceneId(sceneId);
  const itemJsonPath = await validateStacItemPath(deps, stacItemPath);
  const item = await readItemJson(deps, itemJsonPath);

  const largeKey = assetKeyFor(sceneId);
  const smallKey = assetKeyForSmall(sceneId);
  const assets = item.assets ?? {};
  if (assets[largeKey] === undefined && assets[smallKey] === undefined) {
    throw new SceneThumbnailError(
      'unknown-scene',
      `No asset entries for scene ${sceneId}`,
    );
  }

  const dir = path.join(stacItemPath, 'scene-thumbnails');
  const largePath = path.join(dir, `scene-${sceneId}.png`);
  const smallPath = path.join(dir, `scene-${sceneId}-sm.png`);

  for (const target of [largePath, smallPath]) {
    try {
      await deps.fs.unlink(target);
    } catch {
      // best-effort: the file may already be gone
    }
  }

  const nextAssets: StacItemAssets = { ...assets };
  delete nextAssets[largeKey];
  delete nextAssets[smallKey];
  const nextItem: StacItem = { ...item, assets: nextAssets };
  const serialised = `${JSON.stringify(nextItem, null, 2)}\n`;

  try {
    await writeAtomic(deps, itemJsonPath, serialised);
  } catch (cause) {
    throw new SceneThumbnailError(
      'rename-failed',
      `Could not commit updated ${itemJsonPath}`,
      cause,
    );
  }
}

/**
 * Minimal structural view of the plot FeatureCollection that `gcOrphanAssets`
 * needs. Using a loose shape keeps the thumbnail service decoupled from
 * `@debrief/components`'s `Plot` type while still being type-safe for the
 * fields we actually read.
 */
export interface GcOrphanAssetsPlot {
  readonly features: ReadonlyArray<{
    readonly properties?: {
      readonly thumbnail_asset_ref?: string;
      readonly kind?: string;
    } | null;
  }>;
}

/**
 * Garbage-collect orphan scene-thumbnail asset entries from `item.json`
 * and unlink their on-disk PNGs. An asset is "orphan" when it's keyed
 * under `scene-thumbnail-{id}` (or the `-sm` small variant) and no Scene
 * Feature in `plot` carries a `thumbnail_asset_ref` matching that key.
 *
 * Returns the list of reclaimed asset hrefs so callers can log telemetry.
 * Best-effort: a failure to unlink a PNG file does not abort the pass —
 * the `item.json` rewrite is the authoritative "asset removed" signal.
 *
 * Feature: 218-storyboarding-edit (FR-EDIT-024). Invoked on plot close
 * by `StoryboardEditService.onPlotClosed`.
 */
export async function gcOrphanAssets(
  stacItemPath: string,
  plot: GcOrphanAssetsPlot,
  deps: SceneThumbnailServiceDeps = DEFAULT_DEPS,
): Promise<{ reclaimed: readonly string[] }> {
  const itemJsonPath = await validateStacItemPath(deps, stacItemPath);
  const item = await readItemJson(deps, itemJsonPath);
  const assets = item.assets ?? {};

  // Collect live thumbnail asset keys from Scene features. Each Scene's
  // `thumbnail_asset_ref` is the LARGE asset key; the small variant is
  // `${ref}-sm` by convention (see assetKeyForSmall).
  const liveKeys = new Set<string>();
  for (const f of plot.features) {
    const ref = f.properties?.thumbnail_asset_ref;
    if (typeof ref === 'string' && ref.length > 0) {
      liveKeys.add(ref);
      liveKeys.add(`${ref}-sm`);
    }
  }

  const reclaimed: string[] = [];
  const nextAssets: StacItemAssets = {};
  for (const [key, value] of Object.entries(assets)) {
    if (key.startsWith('scene-thumbnail-') && !liveKeys.has(key)) {
      reclaimed.push(value.href);
      const diskPath = path.isAbsolute(value.href)
        ? value.href
        : path.join(stacItemPath, value.href);
      try {
        await deps.fs.unlink(diskPath);
      } catch {
        // best-effort: the file may already be gone
      }
      continue;
    }
    nextAssets[key] = value;
  }

  if (reclaimed.length === 0) {
    return { reclaimed: [] };
  }

  const nextItem: StacItem = { ...item, assets: nextAssets };
  const serialised = `${JSON.stringify(nextItem, null, 2)}\n`;
  try {
    await writeAtomic(deps, itemJsonPath, serialised);
  } catch (cause) {
    throw new SceneThumbnailError(
      'rename-failed',
      `Could not commit updated ${itemJsonPath}`,
      cause,
    );
  }

  return { reclaimed };
}
