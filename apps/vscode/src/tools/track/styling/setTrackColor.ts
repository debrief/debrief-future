/**
 * Set Track Color tool implementation.
 * Sets the display color for track features.
 */

import type { TrackFeature } from '@debrief/schemas';
import { isTrackFeature } from '@debrief/schemas';
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

export function execute(
  features: TrackFeature[],
  params: SetTrackColorParams,
): TrackFeature[] {
  const { color } = params;
  if (!color) {
    throw new Error('color parameter is required');
  }

  const modified: TrackFeature[] = [];

  for (const feature of features) {
    if (!isTrackFeature(feature)) {
      continue;
    }

    // TrackProperties.style is already typed as TrackStyle with line: LineProperties
    feature.properties.style.line.color = color;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
