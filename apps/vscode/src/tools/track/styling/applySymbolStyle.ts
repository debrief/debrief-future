/**
 * Apply Symbol Style tool implementation.
 * Applies a symbol style to position markers on track features.
 */

import type { TrackFeature } from '@debrief/schemas';
import { isTrackFeature, PointShapeEnum } from '@debrief/schemas';
import type { PointShape } from '@debrief/utils';
import type { MCPToolDefinition } from '../../../types/tool';

// Schema-derived list of valid marker shapes — no hand-typed union here so
// adding a value to LinkML `PointShapeEnum` widens the accepted set
// automatically after regeneration (FR-014 / SC-006).
const VALID_SYMBOLS = Object.values(PointShapeEnum) as readonly PointShape[];

export interface ApplySymbolStyleParams {
  symbol?: PointShape;
  radius?: number;
  fill_color?: string;
}

export const toolDefinition: MCPToolDefinition = {
  name: 'apply-symbol-style',
  description: 'Applies a symbol style to position markers on track features.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' } },
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string', enum: [...VALID_SYMBOLS] as string[], default: 'square', 'x-debrief-param-type': 'MarkerSymbol' },
          radius: { type: 'number', default: 4 },
          fill_color: { type: 'string' },
        },
      },
    },
  },
  annotations: {
    'debrief:selectionRequirements': [{ kind: 'TRACK', min: 1 }],
    'debrief:category': 'track/styling',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'mutation/track/styled',
    'debrief:uiCategory': 'style',
  },
};

export function execute(
  features: TrackFeature[],
  params: ApplySymbolStyleParams,
): TrackFeature[] {
  const { symbol: rawSymbol, radius = 4, fill_color } = params;
  const symbol: PointShape = rawSymbol || 'square';

  if (!(VALID_SYMBOLS as readonly string[]).includes(symbol)) {
    throw new Error(`symbol must be one of: ${VALID_SYMBOLS.join(', ')}`);
  }

  if (radius !== undefined && radius <= 0) {
    throw new Error('radius must be positive');
  }

  const modified: TrackFeature[] = [];

  for (const feature of features) {
    if (!isTrackFeature(feature)) {
      continue;
    }

    // Defensively handle missing style — real features from disk may lack it
    const style = feature.properties.style ?? { line: {} };
    const point = style.point ?? {
      shape: 'square', radius: 4, fill: true,
      fill_color: '#3388ff', fill_opacity: 0.8,
      stroke: true, color: '#ffffff', weight: 1, opacity: 1.0,
    };

    point.shape = symbol;
    if (radius !== undefined) {
      point.radius = radius;
    }

    if (fill_color !== undefined) {
      point.fill_color = fill_color;
    } else if (!point.fill_color && style.line?.color) {
      point.fill_color = style.line.color;
    }

    style.point = point;
    feature.properties.style = style;

    // Update default_position_style so the PositionSymbolsLayer renderer
    // uses the chosen symbol shape.  Only change the shape — do NOT set
    // show_symbol=true, as that would make ALL positions visible instead
    // of respecting the existing interval/override visibility cascade.
    const dps = feature.properties.default_position_style ?? { show_symbol: false, show_label: false };
    dps.symbol = symbol;
    feature.properties.default_position_style = dps;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
