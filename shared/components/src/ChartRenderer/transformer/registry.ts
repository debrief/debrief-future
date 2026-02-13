import type { DatasetEnvelope } from '../types';
import type { TransformFunction, TransformResult } from './types';

/**
 * Registry mapping dataset type identifiers to transform functions.
 *
 * Each dataset type (e.g., "zone_histogram") has a dedicated mapping
 * function that produces a Vega-Lite TopLevelSpec.
 */
export class TransformerRegistry {
  private mappings = new Map<string, TransformFunction>();

  /** Register a transform function for a dataset type. */
  register(type: string, fn: TransformFunction): void {
    this.mappings.set(type, fn);
  }

  /** List all registered dataset types. */
  getSupportedTypes(): string[] {
    return Array.from(this.mappings.keys());
  }

  /** Check whether a dataset type is supported. */
  has(type: string): boolean {
    return this.mappings.has(type);
  }

  /**
   * Transform a dataset envelope into a Vega-Lite spec.
   *
   * Returns `{ ok: true, spec }` on success or
   * `{ ok: false, error }` when the type is unsupported.
   */
  transform(dataset: DatasetEnvelope): TransformResult {
    const fn = this.mappings.get(dataset.type);
    if (!fn) {
      return {
        ok: false,
        error: {
          type: 'unsupported_type',
          message: `Unsupported dataset type: ${dataset.type}`,
          datasetType: dataset.type,
        },
      };
    }
    return { ok: true, spec: fn(dataset) };
  }
}
