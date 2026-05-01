/**
 * Contract for `@debrief/stac-writer` — the host-agnostic STAC writer
 * interface. Lives in `shared/stac-writer/`. Browser-safe (no Node imports).
 *
 * Both hosts implement this interface against their native backend:
 *   - VS Code: `apps/vscode/src/services/stacWriterFs.ts` (Node fs)
 *   - Web-shell: `apps/web-shell/src/services/stacWriterIdb.ts` (IndexedDB)
 *
 * THIS FILE IS A CONTRACT, NOT IMPLEMENTATION. It is the single source
 * of truth for the writer's public surface. Any change here is a
 * breaking change to both hosts and requires a coordinated sweep.
 *
 * Article XIV (pre-release freedom) is in force pre-v4.0.0 — breaks
 * are permitted, but the constitution-mandated sweep across both hosts
 * remains a hard rule.
 */

// ─── Core types ─────────────────────────────────────────────────────────────

export interface StoreContext {
  /** Discriminator. Adaptors set this once at construction. */
  readonly kind: 'fs' | 'idb';
  /** Wall-clock source — overridable for tests. */
  readonly nowMs: () => number;
  /** Random ID generator (UUID/ULID) — overridable for tests. */
  readonly randomId: () => string;
}

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

export interface PropertiesProvenanceEntry {
  readonly activity_id: string;
  readonly timestamp: string;
  readonly tool: string;
  readonly method: string;
  readonly source: 'user' | 'tool' | 'import';
  readonly fields: ReadonlyArray<string>;
}

// ─── Capability ─────────────────────────────────────────────────────────────

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

// ─── Error taxonomy ─────────────────────────────────────────────────────────

export type StacWriterErrorKind =
  | 'path-rejected'
  | 'stac-item-not-found'
  | 'bundled-item-read-only'
  | 'item-json-malformed'
  | 'stale-fingerprint'
  | 'validation-failed'
  | 'write-failed'
  | 'read-only-fs'
  | 'quota-exceeded'
  | 'indexeddb-unavailable'
  | 'empty-png';

export class StacWriterError extends Error {
  readonly kind: StacWriterErrorKind;
  readonly path?: string;
  readonly cause?: unknown;

  constructor(
    kind: StacWriterErrorKind,
    message: string,
    options?: { readonly path?: string; readonly cause?: unknown },
  ) {
    super(message);
    this.kind = kind;
    this.path = options?.path;
    this.cause = options?.cause;
  }
}

// ─── Operation: writeItem ───────────────────────────────────────────────────

export interface WriteItemInput {
  readonly ctx: StoreContext;
  /** Catalog-relative path to the target item.json. */
  readonly itemPath: string;
  readonly item: StacItem;
  readonly mode: 'create' | 'replace';
}

export interface WriteItemResult {
  readonly writtenPath: string;
}

// ─── Operation: patchItem (preserves #193 semantics) ────────────────────────

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

// ─── Operation: writeAsset ──────────────────────────────────────────────────

export interface WriteAssetInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
  readonly assetHref: string;
  /** Browser-safe: Uint8Array for binary, string for text/JSON.
   *  The VS Code adaptor wraps Uint8Array to Buffer at the boundary. */
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

// ─── Operation: writeSceneThumbnailPair (preserves #174 semantics) ──────────

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

// ─── Operation: deleteItem ──────────────────────────────────────────────────

export interface DeleteItemInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
}

export interface DeleteItemResult {
  readonly removedPath: string;
}

// ─── Operation: deleteAsset ─────────────────────────────────────────────────

export interface DeleteAssetInput {
  readonly ctx: StoreContext;
  readonly itemPath: string;
  readonly assetKey: string;
}

export interface DeleteAssetResult {
  readonly removedAssetPath: string | null;
}

// ─── The writer interface itself ────────────────────────────────────────────

/**
 * Each host instantiates exactly one StacWriter at extension activation
 * (VS Code) or App boot (web-shell). The rest of the system depends only
 * on this interface — never on the host-specific implementation file.
 */
export interface StacWriter {
  /** Cheap, idempotent capability probe. Drives the "Session-only" badge. */
  capability(): Promise<CapabilityReport>;

  writeItem(input: WriteItemInput): Promise<WriteItemResult>;
  patchItem(input: PatchItemInput): Promise<PatchItemResult>;
  writeAsset(input: WriteAssetInput): Promise<WriteAssetResult>;
  writeSceneThumbnailPair(
    input: WriteSceneThumbnailPairInput,
  ): Promise<WriteSceneThumbnailPairResult>;
  deleteItem(input: DeleteItemInput): Promise<DeleteItemResult>;
  deleteAsset(input: DeleteAssetInput): Promise<DeleteAssetResult>;
}

// Cross-tab notification (BroadcastChannel) is intentionally NOT on this
// interface. It's a host-specific concern: the web-shell adaptor's
// catalogReadView listens to `BroadcastChannel('debrief-stac-writer-v1')`
// directly; VS Code has no equivalent. Keeping it off the interface
// prevents host-shaped semantics leaking into a contract that promises
// not to expose them (FR-020).

// ─── Pure overlay-merge helper (browser-safe, used by both hosts) ───────────

/** Stored item record shape used by the IndexedDB adaptor. Exposed here
 *  so the merge function can consume it without cross-package imports. */
export interface StoredItem {
  readonly kind: 'overlay' | 'standalone';
  readonly record: StacItem;
  readonly baseRevision?: string;
  readonly mtimeMs: number;
}

/**
 * Pure function. Given a (possibly-null) bundled item and a
 * (possibly-null) stored overlay/standalone record, returns the merged
 * item the UI should see, or null if neither is present.
 *
 * Semantics: shallow merge at top level + at properties + at assets.
 * Overlay always wins for fields it sets. Bundled fills gaps. See
 * data-model.md Layer 4 for the exact rules.
 */
export declare function mergeOverlay(
  bundled: StacItem | null,
  stored: StoredItem | null,
): StacItem | null;
