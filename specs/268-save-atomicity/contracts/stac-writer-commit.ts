/**
 * Contract: StacWriter atomic-save extension (feature 268-save-atomicity).
 *
 * Normative TypeScript contract for the two operations added to the
 * host-agnostic `StacWriter` interface so that a plot save commits as one
 * unit and an interrupted save reconciles to a coherent state on open.
 *
 * Browser-safe — no Node imports. Both adaptors (apps/vscode stacWriterFs,
 * apps/web-shell stacWriterIdb) implement these once against their native
 * backend (Constitution Article IV.4).
 *
 * Types are DERIVED from existing sources (Article IV.5 / XV): `thumbnails`
 * is a `Pick<>` of the existing thumbnail input; `featureCollection` reuses
 * the generated schema type. No fields are re-listed by name.
 */

import type { FeatureCollection } from '@debrief/schemas';
import type {
  StoreContext,
  WritePlotThumbnailPairInput,
} from '../../../shared/stac-writer/src/interface';

// ─── commitPlotSave ──────────────────────────────────────────────────────────

export interface CommitPlotSaveInput {
  readonly ctx: StoreContext;
  /** Catalog-relative item path, e.g. `core--boat1/item.json`. */
  readonly stacItemPath: string;
  /** Full feature collection to persist (features.geojson / geojson payload). */
  readonly featureCollection: FeatureCollection;
  /**
   * Thumbnail pair to commit alongside the feature collection. Omitted when
   * capture was skipped (best-effort) or unsupported (web-shell host).
   * Derived from the existing thumbnail-write input — not re-listed.
   */
  readonly thumbnails?: Pick<
    WritePlotThumbnailPairInput,
    'largePngBase64' | 'smallPngBase64'
  >;
}

export interface CommitPlotSaveResult {
  /** Catalog-relative path written for the feature collection. */
  readonly featuresPath: string;
  /** Catalog-relative thumbnail path, or null when none committed. */
  readonly thumbnailPath: string | null;
  /** Catalog-relative overview path, or null when none committed. */
  readonly overviewPath: string | null;
}

// ─── reconcilePlotSave ───────────────────────────────────────────────────────

export interface ReconcilePlotSaveInput {
  readonly ctx: StoreContext;
  readonly stacItemPath: string;
}

export interface ReconcilePlotSaveResult {
  /** True iff leftover state was acted on (drives the non-blocking notice). */
  readonly recovered: boolean;
  /**
   * `clean`         — nothing to reconcile.
   * `rolled-back`   — pre-commit temps discarded; last-good kept (FR-008).
   * `rolled-forward`— post-commit renames completed; new version (FR-007).
   */
  readonly outcome: 'clean' | 'rolled-back' | 'rolled-forward';
}

// ─── interface extension ─────────────────────────────────────────────────────

/**
 * Additions to `StacWriter`. The real interface gains these two members;
 * shown here standalone for the contract.
 */
export interface StacWriterAtomicSaveExt {
  /**
   * Persist the whole save unit (feature collection + optional thumbnails +
   * the STAC item metadata they imply) atomically. MUST be all-or-nothing:
   * on rejection, no part of the new state is observable to a later reader
   * (FR-001/FR-002), and the previously-persisted plot is intact (FR-006/FR-010).
   * MUST route the feature-collection write through this boundary (FR-004).
   */
  commitPlotSave(input: CommitPlotSaveInput): Promise<CommitPlotSaveResult>;

  /**
   * Inspect the store for leftovers from an interrupted `commitPlotSave` and
   * resolve them to a single coherent state, WITHOUT prompting the user
   * (FR-007/FR-008). MUST be called before the plot is read on open. Returns
   * whether a recovery happened so the host can show a non-blocking notice.
   * MUST be idempotent (safe to call when nothing needs reconciling).
   */
  reconcilePlotSave(
    input: ReconcilePlotSaveInput,
  ): Promise<ReconcilePlotSaveResult>;
}

// ─── Behavioural contract (asserted by acceptance tests) ─────────────────────
//
// C1  After commitPlotSave REJECTS at any internal step, a fresh read of the
//     item returns exactly the pre-save state (no partial). [SC-001, FR-001]
// C2  After commitPlotSave RESOLVES, a fresh read returns the new state for
//     EVERY artefact (features + item + thumbnails agree). [FR-002, US1-3]
// C3  Simulating an interruption at each phase, then calling reconcilePlotSave,
//     yields a coherent read every time; pre-commit → previous, post-commit →
//     new. No `.tmp` / journal remain afterwards. [SC-002, FR-007/008]
// C4  Web-shell: a single commitPlotSave performs exactly ONE IndexedDB
//     transaction; aborting it leaves the store byte-identical to before. [SC-005]
// C5  reconcilePlotSave is idempotent: calling it on a clean store returns
//     { recovered: false, outcome: 'clean' } and mutates nothing.
