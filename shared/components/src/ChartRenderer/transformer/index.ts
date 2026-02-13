import type { DatasetEnvelope } from '../types';
import type { TransformFunction, TransformResult } from './types';
import { TransformerRegistry } from './registry';
import { buildThemeConfig } from './theme';
import { registerBuiltinMappings } from './mappings';

export type { TransformerError, TransformResult, TransformFunction } from './types';

// Singleton registry with built-in mappings pre-registered.
const registry = new TransformerRegistry();
registerBuiltinMappings(registry);

/**
 * Transform a dataset envelope into a Vega-Lite spec.
 *
 * Validates the dataset, looks up the registered mapping function,
 * and merges the current theme config into the result.
 */
export function transformDataset(dataset: DatasetEnvelope): TransformResult {
  // Validate envelope structure
  if (!dataset || typeof dataset !== 'object') {
    return {
      ok: false,
      error: { type: 'invalid_schema', message: 'Dataset must be a non-null object' },
    };
  }
  if (!dataset.type || typeof dataset.type !== 'string') {
    return {
      ok: false,
      error: { type: 'invalid_schema', message: 'Dataset must have a string "type" field' },
    };
  }
  if (!dataset.title || typeof dataset.title !== 'string') {
    return {
      ok: false,
      error: { type: 'invalid_schema', message: 'Dataset must have a string "title" field' },
    };
  }
  if (!dataset.metadata || !dataset.metadata.xAxis || !dataset.metadata.yAxis) {
    return {
      ok: false,
      error: { type: 'invalid_schema', message: 'Dataset must have metadata with xAxis and yAxis' },
    };
  }

  // Check for empty data
  const hasData = Array.isArray(dataset.data) && dataset.data.length > 0;
  const hasSeries =
    Array.isArray(dataset.series) &&
    dataset.series.length > 0 &&
    dataset.series.some((s) => s.data.length > 0);

  if (!hasData && !hasSeries) {
    return {
      ok: false,
      error: { type: 'empty_data', message: 'Dataset contains no data points' },
    };
  }

  // Transform via registry
  const result = registry.transform(dataset);
  if (!result.ok) return result;

  // Merge theme config
  const theme = buildThemeConfig();
  return {
    ok: true,
    spec: { ...result.spec, config: { ...theme, ...result.spec.config } },
  };
}

/** Register a custom dataset type mapping at runtime. */
export function registerTransformer(type: string, fn: TransformFunction): void {
  registry.register(type, fn);
}

/** List all supported dataset types. */
export function getSupportedTypes(): string[] {
  return registry.getSupportedTypes();
}
