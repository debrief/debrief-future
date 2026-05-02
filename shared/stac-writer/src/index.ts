/**
 * @debrief/stac-writer — host-agnostic STAC writer interface.
 *
 * Browser-safe public surface. No Node-only helpers re-exported here.
 */

export type {
  CapabilityReport,
  DeleteAssetInput,
  DeleteAssetResult,
  DeleteItemInput,
  DeleteItemResult,
  PatchItemInput,
  PatchItemResult,
  PropertiesProvenanceEntry,
  StacAsset,
  StacItem,
  StacWriter,
  StoreContext,
  StoredItem,
  WriteAssetInput,
  WriteAssetResult,
  WriteItemInput,
  WriteItemResult,
  WriteSceneThumbnailPairInput,
  WriteSceneThumbnailPairResult,
} from './interface.js';

export { StacWriterError } from './errors.js';
export type { StacWriterErrorKind, StacWriterErrorOptions } from './errors.js';

export { mergeOverlay } from './overlay.js';
export { pathGuard, validateSceneId } from './core/pathGuard.js';
export type { AtomicWrite, AtomicWriteDeps } from './core/atomicWrite.js';
