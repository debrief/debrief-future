/**
 * Node-fs adaptor for the host-agnostic StacWriter interface.
 *
 *   ┌────────────────────────────┐         ┌──────────────────────────────┐
 *   │ StacWriter (browser-safe)  │ <───── │ stacWriterFs (this file)      │
 *   │ @debrief/stac-writer       │ implements                              │
 *   └────────────────────────────┘         │ wraps:                        │
 *                                          │  - sceneThumbnailService      │
 *                                          │  - stacService.updateMetadata │
 *                                          │  - direct fs.* for the rest   │
 *                                          └──────────────────────────────┘
 *
 * Phase 2 simplification: the existing `writeSceneThumbnail` and
 * `updateItemMetadataSync` are 1700+ LOC of well-tested code. This adaptor
 * wraps them rather than re-extracting their bodies, so commit-2's
 * regression-gate test corpus is preserved by construction. A subsequent
 * refactor can hoist the bodies into this file once the writer interface
 * has bedded in across hosts. See specs/236 plan.md commit-2 notes.
 *
 * Atomicity contracts preserved (each delegates):
 *   - writeSceneThumbnailPair: 4-step (mkdir → large PNG → small PNG → item.json)
 *   - patchItem:                 11-step (mtime + provenance + archive + atomic)
 *   - writeItem / writeAsset:    new code paths, both temp+rename atomic
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  CapabilityReport,
  CommitPlotSaveInput,
  CommitPlotSaveResult,
  DeleteAssetInput,
  DeleteAssetResult,
  DeleteItemInput,
  DeleteItemResult,
  PatchItemInput,
  PatchItemResult,
  ReconcilePlotSaveInput,
  ReconcilePlotSaveResult,
  StacWriter,
  StoreContext,
  WriteAssetInput,
  WriteAssetResult,
  WriteItemInput,
  WriteItemResult,
  WritePlotThumbnailPairInput,
  WritePlotThumbnailPairResult,
  WriteSceneThumbnailPairInput,
  WriteSceneThumbnailPairResult,
} from '@debrief/stac-writer';
import { StacWriterError, pathGuard, validateSceneId } from '@debrief/stac-writer';
import {
  SAVE_JOURNAL_FILENAME,
  SAVE_JOURNAL_VERSION,
  type SaveJournal,
  type SaveJournalRename,
} from './saveJournal';

import {
  writeSceneThumbnail,
  deleteSceneThumbnail,
} from './sceneThumbnailService';
import { SceneThumbnailError } from './sceneThumbnailError';
import {
  StacService,
  StaleItemJsonError,
  ReadOnlyFilesystemError,
  type UpdateItemMetadataInput,
} from './stacService';
import { PROPERTIES_PANEL_TOOL_SENTINEL } from '@debrief/components/PropertiesPanel/provenanceTypes';

export interface StacWriterFsOptions {
  /**
   * Catalog root directory (e.g. `preview/workspace/samples/local-store/`).
   * All `itemPath` arguments are catalog-relative; this is the prefix joined
   * before any fs operation.
   */
  readonly storePath: string;
  /**
   * Existing `StacService` instance — re-used for `patchItem` so the
   * cache-invalidation hooks in `updateItemMetadata` continue to fire.
   */
  readonly stacService: StacService;
}

export function createStacWriterFs(opts: StacWriterFsOptions): StacWriter {
  const { storePath, stacService } = opts;
  const ctxKind: StoreContext['kind'] = 'fs';

  const writer: StacWriter = {
    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async capability(): Promise<CapabilityReport> {
      try {
        const stat = fs.statSync(storePath);
        if (!stat.isDirectory()) {
          return {
            available: false,
            persistent: false,
            reason: 'unavailable',
          };
        }
      } catch (cause) {
        if (isReadOnlyFsError(cause)) {
          return { available: false, persistent: false, reason: 'denied' };
        }
        return {
          available: false,
          persistent: false,
          reason: 'unavailable',
        };
      }
      // Best-effort writability check — try a temp file in the store root.
      try {
        const probe = path.join(
          storePath,
          `.stac-writer-probe.${process.pid}.${Date.now()}`,
        );
        fs.writeFileSync(probe, '');
        fs.unlinkSync(probe);
        return { available: true, persistent: true };
      } catch (cause) {
        if (isReadOnlyFsError(cause)) {
          return { available: false, persistent: false, reason: 'denied' };
        }
        return {
          available: false,
          persistent: false,
          reason: 'unavailable',
        };
      }
    },

    async writeSceneThumbnailPair(
      input: WriteSceneThumbnailPairInput,
    ): Promise<WriteSceneThumbnailPairResult> {
      pathGuard('writeSceneThumbnailPair.stacItemPath', input.stacItemPath);
      validateSceneId(input.sceneId);
      const fullPath = path.join(storePath, input.stacItemPath);
      try {
        const result = await writeSceneThumbnail(
          fullPath,
          input.sceneId,
          input.largePngBase64,
          input.smallPngBase64,
        );
        return {
          assetKey: result.assetKey,
          largePath: result.largePath,
          smallPath: result.smallPath,
        };
      } catch (cause) {
        throw mapThumbnailError(cause, input.stacItemPath);
      }
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async writePlotThumbnailPair(
      input: WritePlotThumbnailPairInput,
    ): Promise<WritePlotThumbnailPairResult> {
      pathGuard('writePlotThumbnailPair.stacItemPath', input.stacItemPath);

      const smallBuffer = Buffer.from(input.smallPngBase64, 'base64');
      const largeBuffer = Buffer.from(input.largePngBase64, 'base64');
      if (smallBuffer.byteLength === 0) {
        throw new StacWriterError(
          'empty-png',
          'writePlotThumbnailPair: smallPngBase64 decoded to zero bytes',
          { path: input.stacItemPath },
        );
      }
      if (largeBuffer.byteLength === 0) {
        throw new StacWriterError(
          'empty-png',
          'writePlotThumbnailPair: largePngBase64 decoded to zero bytes',
          { path: input.stacItemPath },
        );
      }

      const itemJsonPath = path.join(storePath, input.stacItemPath);
      const itemDir = path.dirname(itemJsonPath);
      if (!fs.existsSync(itemJsonPath)) {
        throw new StacWriterError(
          'stac-item-not-found',
          `writePlotThumbnailPair: item.json not found at ${itemJsonPath}`,
          { path: input.stacItemPath },
        );
      }

      const smallPath = path.join(itemDir, 'thumbnail.png');
      const largePath = path.join(itemDir, 'overview.png');
      atomicWriteSync(smallPath, smallBuffer);
      atomicWriteSync(largePath, largeBuffer);

      let item: Record<string, unknown>;
      try {
        const raw = fs.readFileSync(itemJsonPath, 'utf8');
        item = parseJsonObject(raw, 'writePlotThumbnailPair', input.stacItemPath);
      } catch (cause) {
        if (cause instanceof StacWriterError) {throw cause;}
        throw new StacWriterError(
          'item-json-malformed',
          `writePlotThumbnailPair: item.json unreadable at ${itemJsonPath}`,
          { path: input.stacItemPath, cause },
        );
      }

      const existingAssets = asPlainObject(item.assets) ?? {};
      const assets: Record<string, unknown> = { ...existingAssets };
      // Drop legacy spec-241 key — idempotent on fresh items.
      delete assets['thumbnail-sm'];
      assets['thumbnail'] = {
        href: './thumbnail.png',
        type: 'image/png',
        title: 'Plot thumbnail (200x150)',
        roles: ['thumbnail'],
        'proj:shape': [150, 200],
        'file:size': smallBuffer.byteLength,
        'file:checksum': multihashSha256(smallBuffer),
      };
      assets['overview'] = {
        href: './overview.png',
        type: 'image/png',
        title: 'Plot overview (800x600)',
        roles: ['overview'],
        'proj:shape': [600, 800],
        'file:size': largeBuffer.byteLength,
        'file:checksum': multihashSha256(largeBuffer),
      };
      item.assets = assets;

      const properties = asPlainObject(item.properties) ?? {};
      if (typeof properties['created'] !== 'string') {
        properties['created'] = isoNowUtc();
      }
      properties['updated'] = isoNowUtc();
      item.properties = properties;

      atomicWriteSync(itemJsonPath, `${JSON.stringify(item, null, 2)}\n`);

      return {
        thumbnailPath: path.relative(storePath, smallPath),
        overviewPath: path.relative(storePath, largePath),
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async commitPlotSave(
      input: CommitPlotSaveInput,
    ): Promise<CommitPlotSaveResult> {
      pathGuard('commitPlotSave.stacItemPath', input.stacItemPath);
      if (input.featureCollection.type !== 'FeatureCollection') {
        throw new StacWriterError(
          'validation-failed',
          'commitPlotSave: featureCollection.type must be "FeatureCollection"',
          { path: input.stacItemPath },
        );
      }

      const itemJsonPath = path.join(storePath, input.stacItemPath);
      const itemDir = path.dirname(itemJsonPath);

      // Decode + validate thumbnails up front — pre-commit, no writes yet.
      let smallBuffer: Buffer | null = null;
      let largeBuffer: Buffer | null = null;
      if (input.thumbnails !== undefined) {
        smallBuffer = Buffer.from(input.thumbnails.smallPngBase64, 'base64');
        largeBuffer = Buffer.from(input.thumbnails.largePngBase64, 'base64');
        if (smallBuffer.byteLength === 0) {
          throw new StacWriterError(
            'empty-png',
            'commitPlotSave: smallPngBase64 decoded to zero bytes',
            { path: input.stacItemPath },
          );
        }
        if (largeBuffer.byteLength === 0) {
          throw new StacWriterError(
            'empty-png',
            'commitPlotSave: largePngBase64 decoded to zero bytes',
            { path: input.stacItemPath },
          );
        }
        if (!fs.existsSync(itemJsonPath)) {
          throw new StacWriterError(
            'stac-item-not-found',
            `commitPlotSave: item.json not found at ${itemJsonPath} (required to commit thumbnails)`,
            { path: input.stacItemPath },
          );
        }
      }

      try {
        fs.mkdirSync(itemDir, { recursive: true });
      } catch (cause) {
        throw mapFsWriteError(cause, input.stacItemPath, 'commitPlotSave: mkdir');
      }

      // Assemble the artefacts that make up this save unit (final names +
      // bytes). features.geojson is always present; thumbnails imply two PNGs
      // plus an updated item.json (asset entries) committed in the same unit.
      const artefacts: Array<{ finalName: string; data: Uint8Array | string }> = [
        {
          finalName: 'features.geojson',
          data: `${JSON.stringify(input.featureCollection, null, 2)}\n`,
        },
      ];
      let thumbnailRel: string | null = null;
      let overviewRel: string | null = null;
      if (smallBuffer !== null && largeBuffer !== null) {
        const updatedItem = buildItemWithThumbnails(
          itemJsonPath,
          input.stacItemPath,
          smallBuffer,
          largeBuffer,
        );
        artefacts.push({ finalName: 'thumbnail.png', data: smallBuffer });
        artefacts.push({ finalName: 'overview.png', data: largeBuffer });
        // item.json LAST so it only ever references assets already in place.
        artefacts.push({
          finalName: 'item.json',
          data: `${JSON.stringify(updatedItem, null, 2)}\n`,
        });
        thumbnailRel = path.relative(storePath, path.join(itemDir, 'thumbnail.png'));
        overviewRel = path.relative(storePath, path.join(itemDir, 'overview.png'));
      }

      // ── Phase 1: STAGE ── write every artefact to a temp; nothing in place.
      const token = crypto.randomBytes(8).toString('hex');
      const renames: SaveJournalRename[] = [];
      const stagedTemps: string[] = [];
      try {
        for (const { finalName, data } of artefacts) {
          const tempName = `${finalName}.save-${token}.tmp`;
          fs.writeFileSync(path.join(itemDir, tempName), data);
          stagedTemps.push(path.join(itemDir, tempName));
          renames.push({ temp: tempName, final: finalName });
        }
      } catch (cause) {
        cleanupTemps(stagedTemps);
        throw mapFsWriteError(cause, input.stacItemPath, 'commitPlotSave: stage');
      }

      // ── Phase 2: COMMIT POINT ── atomically write the intent journal.
      const journalPath = path.join(itemDir, SAVE_JOURNAL_FILENAME);
      const journal: SaveJournal = {
        version: SAVE_JOURNAL_VERSION,
        stacItemPath: input.stacItemPath,
        createdAtMs: input.ctx.nowMs(),
        renames,
      };
      try {
        atomicWriteSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`);
      } catch (cause) {
        // Still pre-commit — discard the staged temps, originals untouched.
        cleanupTemps(stagedTemps);
        throw cause instanceof StacWriterError
          ? cause
          : mapFsWriteError(cause, input.stacItemPath, 'commitPlotSave: journal');
      }

      // ── Phase 3: APPLY ── rename each temp → final. Post-commit: a failure
      // here leaves the journal (+ remaining temps) so the next open rolls
      // forward; we do NOT roll back (the originals are already superseded).
      try {
        applyJournalRenames(itemDir, journal);
      } catch (cause) {
        throw mapFsWriteError(
          cause,
          input.stacItemPath,
          'commitPlotSave: apply (recoverable on next open)',
        );
      }

      // ── Phase 4: CLEAR ── drop the journal. Save complete.
      try {
        fs.unlinkSync(journalPath);
      } catch {
        // A stray journal over a fully-applied save is harmless — the next
        // reconcile re-applies (idempotent) and clears it.
      }

      return {
        featuresPath: path.relative(storePath, path.join(itemDir, 'features.geojson')),
        thumbnailPath: thumbnailRel,
        overviewPath: overviewRel,
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; reconcile implementation lands in #268 Phase 5.
    async reconcilePlotSave(
      input: ReconcilePlotSaveInput,
    ): Promise<ReconcilePlotSaveResult> {
      // Real roll-back / roll-forward logic lands in #268 Phase 5 (T020).
      void input;
      throw new StacWriterError(
        'write-failed',
        'reconcilePlotSave: not yet implemented',
      );
    },

    async patchItem(input: PatchItemInput): Promise<PatchItemResult> {
      pathGuard('patchItem.itemPath', input.itemPath);
      // `input.provenance.tool` is statically the PROPERTIES_PANEL_TOOL_SENTINEL
      // literal — enforced at compile time by the hybrid intersection in
      // `@debrief/components/PropertiesPanel/provenanceTypes` (spec 240).
      // No runtime check is needed; TS rejects any other value at the call
      // site and the schema's `^debrief\.propertiesPanel$` pattern guards
      // the runtime path on read.
      const upstream: UpdateItemMetadataInput = {
        storePath,
        itemPath: input.itemPath,
        patch: { ...input.patch },
        overrideFields: [...input.overrideFields],
        provenance: {
          tool: PROPERTIES_PANEL_TOOL_SENTINEL,
          fields: [...input.provenance.fields],
        },
        packageVersion: input.packageVersion,
      };
      try {
        const result = await stacService.updateItemMetadata(upstream);
        return {
          updatedProperties: result.updatedProperties,
          overrides: result.overrides,
          // eslint-disable-next-line no-restricted-syntax -- ADR-010: pre-existing camelCase carve-out for activityId; matches stacService's PatchItemResult contract.
          activityId: result.activityId,
        };
      } catch (cause) {
        throw mapStacServiceError(cause, input.itemPath);
      }
    },
    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async writeItem(input: WriteItemInput): Promise<WriteItemResult> {
      pathGuard('writeItem.itemPath', input.itemPath);
      const target = path.join(storePath, input.itemPath);
      const exists = fs.existsSync(target);
      if (input.mode === 'replace' && !exists) {
        throw new StacWriterError(
          'stac-item-not-found',
          `writeItem(replace): item.json not found at ${target}`,
          { path: input.itemPath },
        );
      }
      if (input.mode === 'create' && exists) {
        throw new StacWriterError(
          'validation-failed',
          `writeItem(create): item.json already exists at ${target}`,
          { path: input.itemPath },
        );
      }
      const dir = path.dirname(target);
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (cause) {
        if (isReadOnlyFsError(cause)) {
          throw new StacWriterError(
            'read-only-fs',
            `writeItem: catalog directory is read-only`,
            { path: input.itemPath, cause },
          );
        }
        throw new StacWriterError('write-failed', 'writeItem: mkdir failed', {
          path: input.itemPath,
          cause,
        });
      }
      const payload = `${JSON.stringify(input.item, null, 2)}\n`;
      atomicWriteSync(target, payload);
      return { writtenPath: input.itemPath };
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async writeAsset(input: WriteAssetInput): Promise<WriteAssetResult> {
      pathGuard('writeAsset.itemPath', input.itemPath);
      pathGuard('writeAsset.assetHref', input.assetHref);
      const itemFullPath = path.join(storePath, input.itemPath);
      if (!fs.existsSync(itemFullPath)) {
        throw new StacWriterError(
          'stac-item-not-found',
          `writeAsset: owning item not found at ${itemFullPath}`,
          { path: input.itemPath },
        );
      }
      const itemDir = path.dirname(itemFullPath);
      const assetTarget = path.join(itemDir, input.assetHref);
      const assetDir = path.dirname(assetTarget);
      try {
        fs.mkdirSync(assetDir, { recursive: true });
      } catch (cause) {
        if (isReadOnlyFsError(cause)) {
          throw new StacWriterError(
            'read-only-fs',
            `writeAsset: asset directory is read-only`,
            { path: input.itemPath, cause },
          );
        }
        throw new StacWriterError(
          'write-failed',
          `writeAsset: mkdir failed`,
          { path: input.itemPath, cause },
        );
      }
      // Step 1: write asset bytes atomically.
      atomicWriteSync(assetTarget, input.body);
      // Step 2: patch item.json to include the asset entry.
      let item: Record<string, unknown>;
      try {
        const raw = fs.readFileSync(itemFullPath, 'utf8');
        item = parseJsonObject(raw, 'writeAsset', input.itemPath);
      } catch (cause) {
        if (cause instanceof StacWriterError) {throw cause;}
        throw new StacWriterError(
          'item-json-malformed',
          `writeAsset: item.json unreadable at ${itemFullPath}`,
          { path: input.itemPath, cause },
        );
      }
      const existingAssets = asPlainObject(item.assets);
      const assets: Record<string, unknown> =
        existingAssets === null ? {} : { ...existingAssets };
      assets[input.assetEntry.key] = {
        href: input.assetHref,
        type: input.mediaType,
        ...(input.assetEntry.title ? { title: input.assetEntry.title } : {}),
        ...(input.assetEntry.roles ? { roles: input.assetEntry.roles } : {}),
        ...(input.assetEntry.extra ?? {}),
      };
      item.assets = assets;
      atomicWriteSync(itemFullPath, `${JSON.stringify(item, null, 2)}\n`);
      return {
        assetPath: path.relative(storePath, assetTarget),
        assetKey: input.assetEntry.key,
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async deleteItem(input: DeleteItemInput): Promise<DeleteItemResult> {
      pathGuard('deleteItem.itemPath', input.itemPath);
      const itemFullPath = path.join(storePath, input.itemPath);
      if (!fs.existsSync(itemFullPath)) {
        throw new StacWriterError(
          'stac-item-not-found',
          `deleteItem: ${itemFullPath} not found`,
          { path: input.itemPath },
        );
      }
      const dir = path.dirname(itemFullPath);
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (cause) {
        if (isReadOnlyFsError(cause)) {
          throw new StacWriterError(
            'read-only-fs',
            `deleteItem: filesystem is read-only`,
            { path: input.itemPath, cause },
          );
        }
        throw new StacWriterError(
          'write-failed',
          `deleteItem: rm failed`,
          { path: input.itemPath, cause },
        );
      }
      return { removedPath: input.itemPath };
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this adaptor wraps synchronous Node fs.
    async deleteAsset(input: DeleteAssetInput): Promise<DeleteAssetResult> {
      pathGuard('deleteAsset.itemPath', input.itemPath);
      // Scene-thumbnail deletes route through the existing dedicated path so
      // the asset-map cleanup matches commit-2 regression coverage.
      if (input.assetKey.startsWith('scene-thumbnail-')) {
        const sceneId = input.assetKey
          .replace(/^scene-thumbnail-/, '')
          .replace(/-sm$/, '');
        try {
          await deleteSceneThumbnail(
            path.join(storePath, input.itemPath),
            sceneId,
          );
          return {
            removedAssetPath: `scene-thumbnails/scene-${sceneId}.png`,
          };
        } catch (cause) {
          throw mapThumbnailError(cause, input.itemPath);
        }
      }
      // Generic asset delete: remove from item.json, unlink file.
      const itemFullPath = path.join(storePath, input.itemPath);
      if (!fs.existsSync(itemFullPath)) {
        throw new StacWriterError(
          'stac-item-not-found',
          `deleteAsset: owning item not found at ${itemFullPath}`,
          { path: input.itemPath },
        );
      }
      let item: Record<string, unknown>;
      try {
        const raw = fs.readFileSync(itemFullPath, 'utf8');
        item = parseJsonObject(raw, 'deleteAsset', input.itemPath);
      } catch (cause) {
        if (cause instanceof StacWriterError) {throw cause;}
        throw new StacWriterError(
          'item-json-malformed',
          `deleteAsset: item.json unreadable at ${itemFullPath}`,
          { path: input.itemPath, cause },
        );
      }
      const existingAssets = asPlainObject(item.assets) ?? {};
      const entry = asPlainObject(existingAssets[input.assetKey]);
      if (entry === null) {
        return { removedAssetPath: null };
      }
      const href = typeof entry.href === 'string' ? entry.href : null;
      const assets: Record<string, unknown> = { ...existingAssets };
      delete assets[input.assetKey];
      item.assets = assets;
      atomicWriteSync(itemFullPath, `${JSON.stringify(item, null, 2)}\n`);
      let removedAssetPath: string | null = null;
      if (href !== null) {
        const assetTarget = path.isAbsolute(href)
          ? href
          : path.join(path.dirname(itemFullPath), href);
        try {
          fs.unlinkSync(assetTarget);
          removedAssetPath = path.relative(storePath, assetTarget);
        } catch {
          // best-effort
        }
      }
      return { removedAssetPath };
    },
  };

  // Mark ctx kind so callers can introspect; not part of the interface.
  void ctxKind;
  return writer;
}

// ─── helpers ───────────────────────────────────────────────────────────────

/**
 * Narrow `unknown` to a plain JSON object (`{ [k: string]: unknown }`),
 * returning `null` for arrays / nulls / non-objects. Boundary helper used
 * by writeAsset / deleteAsset's item-json reads — lets the rest of the
 * code work against a typed surface without `as Record<...>` casts.
 */
function asPlainObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  // Narrow at the boundary: every JS object whose Object.prototype.toString
  // tag is '[object Object]' is structurally a `{ [k: string]: unknown }`.
  // The Object.fromEntries roundtrip avoids the `as Record<...>` cast that
  // ADR-011 / Article XV.7 forbids in business logic.
  return Object.fromEntries(
    Object.entries(value as { [k: string]: unknown }),
  );
}

/**
 * Parse `raw` as JSON and assert the result is a plain object. Throws
 * `StacWriterError('item-json-malformed', ...)` otherwise.
 */
function parseJsonObject(
  raw: string,
  ctx: string,
  itemPath: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new StacWriterError(
      'item-json-malformed',
      `${ctx}: item.json is not valid JSON`,
      { path: itemPath, cause },
    );
  }
  const obj = asPlainObject(parsed);
  if (obj === null) {
    throw new StacWriterError(
      'item-json-malformed',
      `${ctx}: item.json root is not a plain object`,
      { path: itemPath },
    );
  }
  return obj;
}

function atomicWriteSync(target: string, data: Uint8Array | string): void {
  const tmpPath = `${target}.${process.pid}.${crypto
    .randomBytes(4)
    .toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tmpPath, data);
    fs.renameSync(tmpPath, target);
  } catch (cause) {
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }
    }
    if (isReadOnlyFsError(cause)) {
      throw new StacWriterError(
        'read-only-fs',
        `atomicWrite: filesystem is read-only at ${target}`,
        { path: target, cause },
      );
    }
    throw new StacWriterError(
      'write-failed',
      `atomicWrite: write/rename failed at ${target}`,
      { path: target, cause },
    );
  }
}

/**
 * Build the updated `item.json` object for a thumbnail-bearing commit: reads
 * the existing item, sets the `thumbnail` / `overview` assets (size + multihash
 * checksum), refreshes timestamps. Identical asset shape to
 * `writePlotThumbnailPair` so the two paths produce byte-compatible items.
 * Pure — performs no writes (the caller stages the returned JSON).
 */
function buildItemWithThumbnails(
  itemJsonPath: string,
  stacItemPath: string,
  smallBuffer: Buffer,
  largeBuffer: Buffer,
): Record<string, unknown> {
  let item: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(itemJsonPath, 'utf8');
    item = parseJsonObject(raw, 'commitPlotSave', stacItemPath);
  } catch (cause) {
    if (cause instanceof StacWriterError) {
      throw cause;
    }
    throw new StacWriterError(
      'item-json-malformed',
      `commitPlotSave: item.json unreadable at ${itemJsonPath}`,
      { path: stacItemPath, cause },
    );
  }

  const existingAssets = asPlainObject(item.assets) ?? {};
  const assets: Record<string, unknown> = { ...existingAssets };
  delete assets['thumbnail-sm']; // drop legacy spec-241 key (idempotent)
  assets['thumbnail'] = {
    href: './thumbnail.png',
    type: 'image/png',
    title: 'Plot thumbnail (200x150)',
    roles: ['thumbnail'],
    'proj:shape': [150, 200],
    'file:size': smallBuffer.byteLength,
    'file:checksum': multihashSha256(smallBuffer),
  };
  assets['overview'] = {
    href: './overview.png',
    type: 'image/png',
    title: 'Plot overview (800x600)',
    roles: ['overview'],
    'proj:shape': [600, 800],
    'file:size': largeBuffer.byteLength,
    'file:checksum': multihashSha256(largeBuffer),
  };
  item.assets = assets;

  const properties = asPlainObject(item.properties) ?? {};
  if (typeof properties['created'] !== 'string') {
    properties['created'] = isoNowUtc();
  }
  properties['updated'] = isoNowUtc();
  item.properties = properties;

  return item;
}

/**
 * Apply a save journal's pending `temp → final` renames, in order. Idempotent:
 * a temp that no longer exists was already applied (a prior rename or a partial
 * roll-forward), so it is skipped. Shared by `commitPlotSave` (apply phase) and
 * `reconcilePlotSave` (roll forward).
 */
function applyJournalRenames(itemDir: string, journal: SaveJournal): void {
  for (const rename of journal.renames) {
    const tempAbs = path.join(itemDir, rename.temp);
    if (!fs.existsSync(tempAbs)) {
      continue;
    }
    fs.renameSync(tempAbs, path.join(itemDir, rename.final));
  }
}

/** Best-effort removal of staged temp files (pre-commit rollback). */
function cleanupTemps(tempPaths: ReadonlyArray<string>): void {
  for (const temp of tempPaths) {
    try {
      if (fs.existsSync(temp)) {
        fs.unlinkSync(temp);
      }
    } catch {
      // best-effort
    }
  }
}

/** Map a raw fs error to the structured StacWriter taxonomy (Article I.3). */
function mapFsWriteError(
  cause: unknown,
  itemPath: string,
  ctx: string,
): StacWriterError {
  if (cause instanceof StacWriterError) {
    return cause;
  }
  if (isReadOnlyFsError(cause)) {
    return new StacWriterError('read-only-fs', `${ctx}: filesystem is read-only`, {
      path: itemPath,
      cause,
    });
  }
  return new StacWriterError(
    'write-failed',
    `${ctx}: ${cause instanceof Error ? cause.message : String(cause)}`,
    { path: itemPath, cause },
  );
}

/**
 * Multihash-encoded SHA-256 of `buffer`. Returns the hex string
 * `<varint algo=0x12><varint length=0x20><32-byte digest>`, matching the
 * Python helper `multihash_sha256_bytes` in
 * `services/stac/src/debrief_stac/_helpers.py`.
 */
function multihashSha256(buffer: Buffer): string {
  const digest = crypto.createHash('sha256').update(buffer).digest();
  return `1220${digest.toString('hex')}`;
}

function isoNowUtc(): string {
  return new Date().toISOString();
}

function isReadOnlyFsError(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) {return false;}
  const code = (cause as { code?: unknown }).code;
  return code === 'EACCES' || code === 'EROFS' || code === 'EPERM';
}

function mapThumbnailError(cause: unknown, itemPath: string): StacWriterError {
  if (cause instanceof SceneThumbnailError) {
    switch (cause.code) {
      case 'invalid-scene-id':
        return new StacWriterError(
          'validation-failed',
          cause.message,
          { path: itemPath, cause: cause.cause },
        );
      case 'empty-png':
        return new StacWriterError('empty-png', cause.message, {
          path: itemPath,
          cause: cause.cause,
        });
      case 'stac-item-not-found':
        return new StacWriterError(
          'stac-item-not-found',
          cause.message,
          { path: itemPath, cause: cause.cause },
        );
      case 'item-json-malformed':
      case 'item-json-unreadable':
        return new StacWriterError(
          'item-json-malformed',
          cause.message,
          { path: itemPath, cause: cause.cause },
        );
      case 'unknown-scene':
        return new StacWriterError(
          'stac-item-not-found',
          cause.message,
          { path: itemPath, cause: cause.cause },
        );
      case 'rename-failed':
      case 'write-failed':
      default:
        return new StacWriterError('write-failed', cause.message, {
          path: itemPath,
          cause: cause.cause,
        });
    }
  }
  if (cause instanceof StacWriterError) {return cause;}
  return new StacWriterError(
    'write-failed',
    cause instanceof Error ? cause.message : String(cause),
    { path: itemPath, cause },
  );
}

function mapStacServiceError(cause: unknown, itemPath: string): StacWriterError {
  if (cause instanceof StaleItemJsonError) {
    return new StacWriterError('stale-fingerprint', cause.message, {
      path: itemPath,
      cause,
    });
  }
  if (cause instanceof ReadOnlyFilesystemError) {
    return new StacWriterError('read-only-fs', cause.message, {
      path: itemPath,
      cause,
    });
  }
  if (cause instanceof StacWriterError) {return cause;}
  if (cause instanceof Error) {
    if (/not found/i.test(cause.message)) {
      return new StacWriterError('stac-item-not-found', cause.message, {
        path: itemPath,
        cause,
      });
    }
    if (/patch must contain/i.test(cause.message)) {
      return new StacWriterError('validation-failed', cause.message, {
        path: itemPath,
        cause,
      });
    }
    return new StacWriterError('write-failed', cause.message, {
      path: itemPath,
      cause,
    });
  }
  return new StacWriterError(
    'write-failed',
    typeof cause === 'string' ? cause : 'unknown error',
    { path: itemPath, cause },
  );
}
