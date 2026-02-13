/**
 * Result ID Registry module — public API.
 * Feature: 087-logical-result-id-registry (E04)
 */

export type {
  ResultIdMapping,
  ResultIdChangeEvent,
  ResultIdChangeCallback,
  ResultIdRegistry,
  StacAssetForHydration,
} from './types.js';

export { createResultIdRegistry } from './resultIdRegistry.js';
