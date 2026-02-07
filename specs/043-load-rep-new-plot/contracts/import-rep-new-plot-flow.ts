/**
 * Contract: New plot creation flow in importRep command
 *
 * Extends the existing "Load into Debrief..." QuickPick with
 * "Add to new plot in [store-name]" options.
 */

import type { GeoJSON } from 'geojson';

/**
 * QuickPick item for the import picker.
 * When `kind === 'newPlot'`, the user selected "Add to new plot".
 */
export interface ImportPickItem {
  label: string;
  description?: string;
  detail?: string;
  /** Store identifier */
  storeId: string;
  /** Absolute path to store root (set for newPlot items) */
  storePath?: string;
  /** Relative item path (set for existingPlot items, undefined for newPlot) */
  itemPath?: string;
  /** Discriminator */
  kind: 'newPlot' | 'existingPlot';
}

/**
 * Full "create new plot from REP files" workflow.
 *
 * Preconditions:
 * - At least one .rep file URI provided
 * - User has selected a store (kind === 'newPlot')
 * - User has entered a non-empty title
 *
 * Steps:
 * 1. Parse all REP files via ioService.parseRep() — fail-fast on any error
 * 2. Merge all parsed features into single FeatureCollection
 * 3. Create STAC Item via stacService.createItem(storePath, { title })
 * 4. Write merged GeoJSON via stacService.addFeatures(storePath, itemPath, features)
 * 5. Copy each .rep file via stacService.addAsset(storePath, itemPath, repFilePath)
 * 6. Open new plot in MapPanel
 *
 * Atomicity:
 * - If step 1 fails: no side effects
 * - If steps 3-5 fail: delete the item folder, show error
 * - Original .rep files are never modified
 *
 * @param repFileUris - URIs of selected .rep files
 * @param storePath - Absolute path to target STAC store
 * @param title - User-provided plot title
 */
export type CreateNewPlotFromRep = (
  repFileUris: string[],
  storePath: string,
  title: string
) => Promise<void>;
