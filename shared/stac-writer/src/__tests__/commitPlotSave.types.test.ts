/**
 * Compile-time contract guard (#268, ADR-033 / Article IV.5).
 *
 * `CommitPlotSaveInput.thumbnails` MUST stay structurally DERIVED from
 * `WritePlotThumbnailPairInput` via `Pick<>`, and `featureCollection` MUST
 * reuse the generated `RawGeoJSONFeatureCollection` — never a hand-re-listed
 * shape. Re-listing fields by name is the known root cause of silently-dropped
 * data when the source type grows (ADR-033 / PR #623). If either boundary type
 * drifts, one of the `true` assignments below resolves to `never` and this file
 * fails `tsc --noEmit` (the CI typecheck gate — `tests/` is excluded from the
 * package tsconfig, so the guard lives under `src/` deliberately).
 *
 * No runtime: this is a type-level test (vitest's glob is `tests/**`, so it is
 * intentionally not executed — its failure mode is a compile error).
 */

import type { RawGeoJSONFeatureCollection } from '@debrief/schemas';
import type {
  CommitPlotSaveInput,
  WritePlotThumbnailPairInput,
} from '../interface.js';

/** Invariant (bidirectional) type equality. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

// 1. thumbnails === Pick<WritePlotThumbnailPairInput, 'largePngBase64' | 'smallPngBase64'>
type _ThumbnailsStayDerived =
  Equals<
    NonNullable<CommitPlotSaveInput['thumbnails']>,
    Pick<WritePlotThumbnailPairInput, 'largePngBase64' | 'smallPngBase64'>
  > extends true
    ? true
    : never;
const _thumbnailsStayDerived: _ThumbnailsStayDerived = true;
void _thumbnailsStayDerived;

// 2. featureCollection reuses the generated parse-boundary FC (not re-listed).
type _FeatureCollectionReused =
  Equals<
    CommitPlotSaveInput['featureCollection'],
    RawGeoJSONFeatureCollection
  > extends true
    ? true
    : never;
const _featureCollectionReused: _FeatureCollectionReused = true;
void _featureCollectionReused;
