/**
 * Sample tool match results for LayersToolbar stories and tests.
 */

import type { Tool } from '@debrief/schemas';
import type { MatchResult } from '../../ToolMatch/types';

/** Extended Tool with category for Run dropdown grouping */
type ToolWithCategory = Tool & { category?: string };

/**
 * Sample tools with category and subcategory for Run dropdown grouping.
 */
export const sampleToolsWithCategories: ToolWithCategory[] = [
  {
    id: 'tma-bearing-only',
    name: 'Bearing-Only TMA',
    description: 'Target motion analysis from bearing measurements',
    version: '1.0.0',
    category: 'TMA',
    requirements: [{ kind: 'TRACK', min: 1, max: 1 }, { kind: 'POINT', min: 1 }],
  },
  {
    id: 'tma-range-bearing',
    name: 'Range & Bearing TMA',
    description: 'Target motion analysis from range and bearing',
    version: '1.0.0',
    category: 'TMA',
    requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
  },
  {
    id: 'track-smooth',
    name: 'Smooth Track',
    description: 'Apply smoothing filter to track positions',
    version: '1.0.0',
    category: 'Track Processing',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'track-resample',
    name: 'Resample Track',
    description: 'Resample track to uniform time intervals',
    version: '1.0.0',
    category: 'Track Processing',
    requirements: [{ kind: 'TRACK', min: 1 }],
  },
  {
    id: 'range-statistics',
    name: 'Range Statistics',
    description: 'Statistical summary of range between two tracks',
    version: '1.0.0',
    category: 'Statistics',
    requirements: [{ kind: 'TRACK', min: 2, max: 2 }],
  },
  {
    id: 'global-stats',
    name: 'Global Statistics',
    description: 'Overall plot statistics',
    version: '1.0.0',
    category: 'Statistics',
    requirements: [],
  },
];

/**
 * Generate mock MatchResult array from tools.
 * All tools marked active for story purposes.
 */
export function createActiveToolResults(tools: Tool[] = sampleToolsWithCategories): MatchResult[] {
  return tools.map((tool) => ({
    tool,
    isActive: true,
    explanation: '',
  }));
}

/**
 * Generate mixed active/inactive results.
 */
export function createMixedToolResults(): MatchResult[] {
  return sampleToolsWithCategories.map((tool, i) => ({
    tool,
    isActive: i < 3,
    explanation: i >= 3 ? `Requires additional selection for ${tool.name}` : '',
  }));
}

/** Empty tool results */
export const emptyToolResults: MatchResult[] = [];
