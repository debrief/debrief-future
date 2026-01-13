/**
 * Application state types.
 */

import type { StacStoreInfo, PlotInfo } from './store';
import type { NewPlotForm } from './forms';
import type { LoadResult, LoaderError } from './results';

/**
 * Represents the file being loaded.
 */
export interface SourceFile {
  /** Absolute path to the file */
  path: string;

  /** File name (basename) */
  name: string;

  /** File size in bytes */
  size: number;

  /** Detected format type */
  format: 'rep' | 'unknown';

  /** SHA-256 hash for deduplication detection */
  hash?: string;
}

/**
 * Wizard step identifiers.
 */
export type WizardStep =
  | 'store-selection'
  | 'plot-configuration'
  | 'processing'
  | 'complete'
  | 'error';

/**
 * Root state for the wizard workflow.
 */
export interface LoaderState {
  /** Current step in the wizard */
  step: WizardStep;

  /** File being loaded */
  sourceFile: SourceFile;

  /** Available STAC stores from debrief-config */
  availableStores: StacStoreInfo[];

  /** User's selected store (null until selected) */
  selectedStore: StacStoreInfo | null;

  /** Active tab on plot configuration step */
  plotTab: 'add-existing' | 'create-new';

  /** Selected existing plot (if plotTab = 'add-existing') */
  selectedPlot: PlotInfo | null;

  /** New plot form data (if plotTab = 'create-new') */
  newPlotForm: NewPlotForm;

  /** Processing progress (0-100) */
  progress: number;

  /** Processing status message */
  statusMessage: string;

  /** Error details (if step = 'error') */
  error: LoaderError | null;

  /** Result details (if step = 'complete') */
  result: LoadResult | null;
}
