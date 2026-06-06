/**
 * @debrief/stac-writer — host-agnostic STAC writer interface.
 *
 * Browser-safe public surface. No Node-only helpers re-exported here.
 */

export type {
  CapabilityReport,
  CommitPlotSaveInput,
  CommitPlotSaveResult,
  DeleteAssetInput,
  DeleteAssetResult,
  DeleteItemInput,
  DeleteItemResult,
  PatchItemInput,
  PatchItemResult,
  PropertiesProvenanceEntry,
  RawGeoJSONFeatureCollection,
  ReconcilePlotSaveInput,
  ReconcilePlotSaveResult,
  StacAsset,
  StacItem,
  StacWriter,
  StoreContext,
  StoredItem,
  WriteAssetInput,
  WriteAssetResult,
  WriteItemInput,
  WriteItemResult,
  WritePlotThumbnailPairInput,
  WritePlotThumbnailPairResult,
  WriteSceneThumbnailPairInput,
  WriteSceneThumbnailPairResult,
} from './interface.js';

export { StacWriterError, ReadOnlyFilesystemError } from './errors.js';
export type { StacWriterErrorKind, StacWriterErrorOptions } from './errors.js';

export { mergeOverlay } from './overlay.js';
export { pathGuard, validateSceneId } from './core/pathGuard.js';
export type { AtomicWrite, AtomicWriteDeps } from './core/atomicWrite.js';
