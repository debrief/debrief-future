/**
 * Host-agnostic STAC writer interface — the persistence boundary mandated by
 * Constitution Article IV.4. Both VS Code (Node fs) and web-shell (IndexedDB)
 * implement this interface. Browser-safe — no Node imports allowed here.
 *
 * See specs/236-web-shell-stac-writes/contracts/stac-writer.ts for the
 * normative contract.
 */

// PropertiesProvenanceEntry is LinkML-derived (spec 240). Imported here for
// local use in PatchItemInput; re-exported below for downstream consumers.
import type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';

// ─── Core context ──────────────────────────────────────────────────────────

export interface StoreContext {
  /** Discriminator. Adaptors set this once at construction. */
  readonly kind: 'fs' | 'idb';
  /** Wall-clock source — overridable for tests. */
  readonly nowMs: () => number;
  /** Random ID generator (UUID/ULID) — overridable for tests. */
  readonly randomId: () => string;
}

// ─── STAC item shape (opaque-with-known-keys) ──────────────────────────────

export interface StacAsset {
  /** Always relative to the item directory. The web-shell adaptor
   *  synthesises `idb:` pseudo-hrefs at read time for IndexedDB-backed
   *  assets — see contracts/indexeddb-schema.md. */
  readonly href: string;
  readonly type?: string;
  readonly roles?: ReadonlyArray<string>;
  readonly title?: string;
  readonly [k: string]: unknown;
}

export interface StacItem {
  readonly id: string;
  readonly properties: Record<string, unknown>;
  readonly assets?: Record<string, StacAsset>;
  readonly links?: ReadonlyArray<{ readonly rel: string; readonly href: string }>;
  readonly [k: string]: unknown;
}

// Re-export the LinkML-derived PropertiesProvenanceEntry so downstream
// consumers see no change — same name, same import path, plus the schema
// contract underneath. See spec 240 / research R2 for the migration rationale.
export type { PropertiesProvenanceEntry };

// ─── Capability ────────────────────────────────────────────────────────────

export interface CapabilityReport {
  /** True iff the writer can persist. False in private mode, denied
   *  browser policy, or when IndexedDB is missing. VS Code: always true. */
  readonly available: boolean;
  /** True iff `navigator.storage.persisted()` is true (web-shell) or
   *  the directory is writable (VS Code). */
  readonly persistent: boolean;
  /** Set when `available` is false; drives the structured error message. */
  readonly reason?: 'unavailable' | 'quota' | 'denied' | 'idb-version-mismatch';
}

// ─── Operation inputs / results ────────────────────────────────────────────

export interface WriteItemInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
  readonly item: StacItem;
  readonly mode: 'create' | 'replace';
}
export interface WriteItemResult {
  readonly writtenPath: string;
}

export interface PatchItemInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
  readonly patch: Record<string, unknown>;
  readonly overrideFields: ReadonlyArray<string>;
  readonly provenance: Pick<PropertiesProvenanceEntry, 'tool' | 'fields'>;
  readonly packageVersion: string;
}
export interface PatchItemResult {
  readonly updatedProperties: Record<string, unknown>;
  readonly overrides: ReadonlyArray<string>;
  readonly activityId: string;
}

export interface WriteAssetInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
  readonly assetHref: string;
  /** Browser-safe: Uint8Array for binary, string for text/JSON. */
  readonly body: Uint8Array | string;
  readonly mediaType: string;
  readonly assetEntry: {
    readonly key: string;
    readonly roles?: ReadonlyArray<string>;
    readonly title?: string;
    readonly extra?: Record<string, unknown>;
  };
}
export interface WriteAssetResult {
  readonly assetPath: string;
  readonly assetKey: string;
}

export interface WriteSceneThumbnailPairInput {
  readonly ctx: StoreContext;
  readonly stacItemPath: string;
  readonly sceneId: string;
  readonly largePngBase64: string;
  readonly smallPngBase64: string;
}
export interface WriteSceneThumbnailPairResult {
  readonly assetKey: string;
  readonly largePath: string;
  readonly smallPath: string;
}

export interface WritePlotThumbnailPairInput {
  readonly ctx: StoreContext;
  /** Item path relative to the catalog root (e.g. `core--boat1/item.json`). */
  readonly stacItemPath: string;
  /** Base64-encoded PNG bytes for the 800x600 overview. */
  readonly largePngBase64: string;
  /** Base64-encoded PNG bytes for the 200x150 thumbnail. */
  readonly smallPngBase64: string;
}
export interface WritePlotThumbnailPairResult {
  /** Catalog-relative path of the written thumbnail PNG. */
  readonly thumbnailPath: string;
  /** Catalog-relative path of the written overview PNG. */
  readonly overviewPath: string;
}

export interface DeleteItemInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
}
export interface DeleteItemResult {
  readonly removedPath: string;
}

export interface DeleteAssetInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
  readonly assetKey: string;
}
export interface DeleteAssetResult {
  readonly removedAssetPath: string | null;
}

// ─── The writer interface ──────────────────────────────────────────────────

export interface StacWriter {
  capability(): Promise<CapabilityReport>;
  writeItem(input: WriteItemInput): Promise<WriteItemResult>;
  patchItem(input: PatchItemInput): Promise<PatchItemResult>;
  writeAsset(input: WriteAssetInput): Promise<WriteAssetResult>;
  writeSceneThumbnailPair(
    input: WriteSceneThumbnailPairInput,
  ): Promise<WriteSceneThumbnailPairResult>;
  writePlotThumbnailPair(
    input: WritePlotThumbnailPairInput,
  ): Promise<WritePlotThumbnailPairResult>;
  deleteItem(input: DeleteItemInput): Promise<DeleteItemResult>;
  deleteAsset(input: DeleteAssetInput): Promise<DeleteAssetResult>;
}

// ─── Stored item (IndexedDB schema layer; exposed for overlay-merge) ──────

export interface StoredItem {
  readonly kind: 'overlay' | 'standalone';
  readonly record: StacItem;
  readonly baseRevision?: string;
  readonly mtimeMs: number;
}
