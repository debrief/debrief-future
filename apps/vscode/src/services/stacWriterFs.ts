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
  DeleteAssetInput,
  DeleteAssetResult,
  DeleteItemInput,
  DeleteItemResult,
  PatchItemInput,
  PatchItemResult,
  StacWriter,
  StoreContext,
  WriteAssetInput,
  WriteAssetResult,
  WriteItemInput,
  WriteItemResult,
  WriteSceneThumbnailPairInput,
  WriteSceneThumbnailPairResult,
} from '@debrief/stac-writer';
import { StacWriterError, pathGuard, validateSceneId } from '@debrief/stac-writer';

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

    async patchItem(input: PatchItemInput): Promise<PatchItemResult> {
      pathGuard('patchItem.itemPath', input.itemPath);
      // The upstream UpdateItemMetadataInput types `tool` as the
      // PROPERTIES_PANEL_TOOL_SENTINEL literal because today the only path
      // through the writer is the Properties Panel. The shared StacWriter
      // surface keeps `tool: string` so future tools can route through the
      // same interface; we narrow back to the literal at the boundary.
      if (input.provenance.tool !== PROPERTIES_PANEL_TOOL_SENTINEL) {
        throw new StacWriterError(
          'validation-failed',
          `patchItem: tool must be ${PROPERTIES_PANEL_TOOL_SENTINEL} (#236 phase 1)`,
          { path: input.itemPath },
        );
      }
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
