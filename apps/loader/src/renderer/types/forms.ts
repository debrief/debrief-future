/**
 * Form state types.
 */

/**
 * Form state for creating a new plot.
 */
export interface NewPlotForm {
  /** Plot name (required) */
  name: string;

  /** Plot description (optional) */
  description: string;

  /** Validation errors */
  errors: {
    name?: string;
  };
}

/**
 * Form state for creating a new local store.
 */
export interface NewStoreForm {
  /** Store name (required) */
  name: string;

  /** Store path (required) */
  path: string;

  /** Validation errors */
  errors: {
    name?: string;
    path?: string;
  };
}
