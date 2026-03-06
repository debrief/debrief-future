/**
 * Track styling tools barrel file.
 *
 * Exports tool definitions for all track styling tools.
 * These are consumed by the TypeScript tool registry for web-shell and
 * by the VS Code extension when the Python backend is unavailable.
 */

import type { MCPToolDefinition } from '../../../types/tool';

/** Set Track Color tool definition */
export const setTrackColorDefinition: MCPToolDefinition = {
  name: 'set-track-color',
  description: 'Sets the display color for track features. Modifies the line color property of each track\'s style, making tracks visually distinct.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' }, description: 'GeoJSON track features to modify' },
      params: {
        type: 'object',
        properties: {
          color: { type: 'string', description: 'CSS color value to apply (e.g., "#FF0000", "red")' },
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

/** Apply Symbol Style tool definition */
export const applySymbolStyleDefinition: MCPToolDefinition = {
  name: 'apply-symbol-style',
  description: 'Applies a symbol style to position markers on track features.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' }, description: 'GeoJSON track features to modify' },
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string', enum: ['circle', 'square', 'diamond', 'triangle', 'cross'], description: 'Marker shape' },
          radius: { type: 'number', description: 'Marker radius in pixels', default: 4 },
          fill_color: { type: 'string', description: 'Fill color for markers (CSS color string)' },
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

/** Label Interval tool definition */
export const labelIntervalDefinition: MCPToolDefinition = {
  name: 'label-interval',
  description: 'Sets the time interval for displaying labels on track positions.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' }, description: 'GeoJSON track features to modify' },
      params: {
        type: 'object',
        properties: {
          interval: { type: 'string', description: 'ISO 8601 duration (e.g., "PT5M" for 5 minutes)' },
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

/** Symbol Interval tool definition */
export const symbolIntervalDefinition: MCPToolDefinition = {
  name: 'symbol-interval',
  description: 'Sets the time interval for displaying position symbols on track features.',
  inputSchema: {
    type: 'object',
    properties: {
      features: { type: 'array', items: { type: 'object' }, description: 'GeoJSON track features to modify' },
      params: {
        type: 'object',
        properties: {
          interval: { type: 'string', description: 'ISO 8601 duration (e.g., "PT5M" for 5 minutes)' },
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

/** All styling tool definitions */
export const allStylingToolDefinitions: MCPToolDefinition[] = [
  setTrackColorDefinition,
  applySymbolStyleDefinition,
  labelIntervalDefinition,
  symbolIntervalDefinition,
];
