/**
 * Sample tool definitions for the ToolMatchHarness.
 *
 * These tools demonstrate various requirement patterns:
 * - Exact count requirements (2 tracks exactly)
 * - Minimum requirements (1+ tracks)
 * - Multiple requirements (track + point)
 * - No requirements (always active)
 */

import type { Tool } from '@debrief/schemas';

/**
 * Sample tools for demonstration.
 */
export const sampleTools: Tool[] = [
  {
    id: 'range-calculation',
    name: 'Range Calculation',
    description: 'Calculate range and bearing between two tracks',
    version: '1.0.0',
    requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
  },
  {
    id: 'bearing-to-point',
    name: 'Bearing to Point',
    description: 'Calculate bearing from a track to a reference point',
    version: '1.0.0',
    requirements: [
      { kind: 'TRACK', min: 1, max: 1 },
      { kind: 'POINT', min: 1, max: 1 },
    ],
  },
  {
    id: 'area-analysis',
    name: 'Area Analysis',
    description: 'Analyze area bounded by 3+ reference points',
    version: '1.0.0',
    requirements: [{ kind: 'POINT', min: 3 }],
  },
  {
    id: 'track-summary',
    name: 'Track Summary',
    description: 'Generate summary statistics for selected tracks',
    version: '1.0.0',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'global-statistics',
    name: 'Global Statistics',
    description: 'Show overall plot statistics (no selection required)',
    version: '1.0.0',
    requirements: [],
  },
];

/**
 * Get tool by ID.
 */
export function getToolById(id: string): Tool | undefined {
  return sampleTools.find((t) => t.id === id);
}
