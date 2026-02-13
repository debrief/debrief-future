/**
 * Set Track Color tool implementation.
 * Sets the display color for track features.
 */

import type { MCPToolDefinition } from '../../../types/tool';

export interface SetTrackColorParams {
  color: string;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'set-track-color',
  description: 'Sets the display color for track features.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: { type: 'object', properties: { color: { type: 'string', description: 'CSS color value', 'x-debrief-param-type': 'NamedColor' } } },
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

interface TrackStyle {
  line?: { stroke?: boolean; color?: string; weight?: number; opacity?: number };
  point?: Record<string, unknown>;
}

export function execute(
  features: GeoJSONFeature[],
  params: SetTrackColorParams,
): GeoJSONFeature[] {
  const { color } = params;
  if (!color) {
    throw new Error('color parameter is required');
  }

  const modified: GeoJSONFeature[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    if (props.kind !== 'TRACK') {
      continue;
    }

    const style = (props.style as TrackStyle) ?? {};
    const line = style.line ?? { stroke: true, color: '#3388ff', weight: 3, opacity: 1.0 };
    line.color = color;
    style.line = line;
    props.style = style;
    feature.properties = props;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
