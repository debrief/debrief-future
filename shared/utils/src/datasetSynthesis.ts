/**
 * Dataset synthesis utilities.
 *
 * Feature: 178-vscode-tabular-results (R6 — extracted from web-shell mock calcService)
 *
 * When a tool result carries `properties.statistics` but no `__datasets` array,
 * synthesize a flat table-style DatasetEnvelope so the Results panel can render
 * a table tab consistent with the web-shell behaviour.
 */

import type { DatasetEnvelope } from './types.js';

/**
 * Synthesize a table-display DatasetEnvelope from a feature's
 * `properties.statistics` object.
 *
 * Returns `null` when:
 *   - `properties.statistics` is absent or not an object
 *   - the statistics object has no renderable (string|number) entries
 *
 * @param toolId       Tool identifier (used to compose the dataset `type`).
 * @param properties   Feature properties (must contain `statistics`).
 * @param sourceLabel  Human-readable label for the originating features
 *                     (shown in the title fallback).
 */
export function synthesizeTableDataset(
  toolId: string,
  properties: Record<string, unknown>,
  sourceLabel: string,
): DatasetEnvelope | null {
  const stats = properties['statistics'];
  if (!stats || typeof stats !== 'object') {
    return null;
  }

  const entries = Object.entries(stats as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string',
  );

  if (entries.length === 0) {
    return null;
  }

  const rawName = properties['name'];
  const title = typeof rawName === 'string' && rawName.length > 0
    ? rawName
    : `${sourceLabel} Results`;

  return {
    type: `${toolId}_statistics`,
    title,
    displayHint: 'table',
    metadata: {
      xAxis: { label: 'Metric', type: 'nominal' },
      yAxis: { label: 'Value', type: 'quantitative' },
    },
    data: entries.map(([key, val]) => ({
      metric: key.replace(/_/g, ' '),
      value: val,
    })),
  };
}
