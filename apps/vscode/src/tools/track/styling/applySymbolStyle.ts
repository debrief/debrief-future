/**
 * Apply Symbol Style tool implementation.
 * Applies a symbol style to position markers on track features.
 */

import type { TrackFeature } from '@debrief/schemas';
import { isTrackFeature } from '@debrief/schemas';
import type { MCPToolDefinition } from '../../../types/tool';

const VALID_SYMBOLS = ['circle', 'square', 'diamond', 'triangle', 'cross'] as const;
type SymbolType = typeof VALID_SYMBOLS[number];

export interface ApplySymbolStyleParams {
  symbol?: SymbolType;
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
          symbol: { type: 'string', enum: [...VALID_SYMBOLS], default: 'square', 'x-debrief-param-type': 'MarkerSymbol' },
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
  },
};

export function execute(
  features: TrackFeature[],
  params: ApplySymbolStyleParams,
): TrackFeature[] {
  const { symbol: rawSymbol, radius = 4, fill_color } = params;
  const symbol: SymbolType = rawSymbol || 'square';

  if (!VALID_SYMBOLS.includes(symbol)) {
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

    // eslint-disable-next-line no-restricted-syntax -- defensive: features may lack nested style objects
    const props = feature.properties as unknown as Record<string, unknown>;
    const style = (props['style'] as { line?: { color?: string }; point?: Record<string, unknown> }) ?? {};
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
    props['style'] = style;

    // Update default_position_style so the PositionSymbolsLayer renderer
    // shows the chosen symbol shape on the map.
    const dps = (props['default_position_style'] ?? {}) as Record<string, unknown>;
    dps['symbol'] = symbol;
    dps['show_symbol'] = true;
    props['default_position_style'] = dps;

    modified.push(feature);
  }

  if (modified.length === 0) {
    throw new Error('No track features found in input');
  }

  return modified;
}
