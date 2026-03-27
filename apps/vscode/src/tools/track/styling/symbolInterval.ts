/**
 * Symbol Interval tool implementation.
 * Sets the time interval for displaying position symbols on track features.
 */

import type { TrackFeature } from '@debrief/schemas';
import { isTrackFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

export interface SymbolIntervalParams {
  interval?: string;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'symbol-interval',
  description: 'Sets the time interval for displaying position symbols on track features.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: { type: 'object', properties: { interval: { type: 'string', description: 'ISO 8601 duration', 'x-debrief-param-type': 'DurationPreset' } } },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
    'debrief:category': 'track/styling',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/track/styled',
  },
};

export function execute(
  features: TrackFeature[],
  params: SymbolIntervalParams,
): TrackFeature[] {
  const interval = params.interval || 'PT15M';

  const modified: TrackFeature[] = [];

  for (const feature of features) {
    if (!isTrackFeature(feature)) {
      continue;
    }

    // Defensively handle missing default_position_style.
    // symbol_interval is stored on default_position_style alongside show_symbol
    // (runtime extension beyond the PositionStyle schema type).
    const dps = feature.properties.default_position_style ?? {
      show_symbol: true, symbol: 'circle', show_label: false,
    };
    dps.show_symbol = true;
    Object.assign(dps, { symbol_interval: interval });
    feature.properties.default_position_style = dps;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
