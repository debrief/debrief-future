/**
 * Label Interval tool implementation.
 * Sets the time interval for displaying labels on track positions.
 */

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
      params: { type: 'object', properties: { interval: { type: 'string', description: 'ISO 8601 duration' } } },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
    'debrief:category': 'track/styling',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/track/styled',
  },
};

interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

interface DefaultPositionStyle {
  show_symbol?: boolean;
  symbol?: string;
  show_label?: boolean;
  label_interval?: string;
}

export function execute(
  features: GeoJSONFeature[],
  params: LabelIntervalParams,
): GeoJSONFeature[] {
  const interval = params.interval || 'PT15M';

  const modified: GeoJSONFeature[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    if (props.kind !== 'TRACK') {
      continue;
    }

    const dps: DefaultPositionStyle = (props.default_position_style as DefaultPositionStyle) ?? {
      show_symbol: true, symbol: 'circle', show_label: false,
    };
    dps.show_label = true;
    dps.label_interval = interval;
    props.default_position_style = dps;
    feature.properties = props;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
