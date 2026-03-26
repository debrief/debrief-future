/**
 * Label Interval tool implementation.
 * Sets the time interval for displaying labels on track positions.
 */

import type { TrackFeature } from '@debrief/schemas';
import { isTrackFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

export interface LabelIntervalParams {
  interval?: string;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'label-interval',
  description: 'Sets the time interval for displaying labels on track positions.',
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
  params: LabelIntervalParams,
): TrackFeature[] {
  const interval = params.interval || 'PT15M';

  const modified: TrackFeature[] = [];

  for (const feature of features) {
    if (!isTrackFeature(feature)) {
      continue;
    }

    // eslint-disable-next-line no-restricted-syntax -- defensive: features may lack default_position_style
    const props = feature.properties as unknown as Record<string, unknown>;
    const dps = (props['default_position_style'] ?? {
      show_symbol: true, symbol: 'circle', show_label: false,
    }) as Record<string, unknown>;
    dps['show_label'] = true;
    dps['label_interval'] = interval;
    props['default_position_style'] = dps;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
