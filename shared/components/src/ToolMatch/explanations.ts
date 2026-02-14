/**
 * Explanation generator for inactive tools.
 *
 * Produces human-readable explanations of why a tool is not available
 * for the current selection.
 */

import type { Tool } from '@debrief/schemas';
import type { Selection } from './types';

/**
 * Gets a human-readable explanation of why a tool is inactive.
 *
 * Returns an empty string if the tool is actually active for the selection.
 *
 * @param tool - The tool to explain
 * @param selection - Current selection map
 * @returns Explanation string, or empty string if tool is active
 */
export function getInactiveReason(tool: Tool, selection: Selection): string {
  const requirements = tool.requirements ?? [];

  // Tools with no requirements are always active
  if (requirements.length === 0) {
    return '';
  }

  // OR semantics: if ANY requirement is satisfied, the tool is active
  for (const req of requirements) {
    const count = selection.get(req.kind) ?? 0;
    const min = req.min ?? 0;
    if (count < min) continue;
    if (req.max !== undefined && req.max !== null && count > req.max) continue;
    // This requirement is satisfied — tool is active
    return '';
  }

  // No requirement satisfied — build explanation
  if (requirements.length > 1) {
    const kinds = requirements.map(r => formatKindLabel(r.kind)).join(' or ');
    return `Requires ${kinds} feature selected`;
  }

  const req = requirements[0]!;
  const count = selection.get(req.kind) ?? 0;
  const min = req.min ?? 0;
  const max = req.max;
  const kindLabel = formatKindLabel(req.kind);

  if (count < min) {
    if (min === 1 && count === 0) {
      return `Requires at least 1 ${kindLabel}`;
    } else if (min === max) {
      return `Requires exactly ${min} ${pluralize(kindLabel, min)} (${count} selected)`;
    } else {
      return `Requires at least ${min} ${pluralize(kindLabel, min)} (${count} selected)`;
    }
  }

  if (max !== undefined && max !== null && count > max) {
    if (max === 0) {
      return `Does not accept ${kindLabel} features (${count} in selection)`;
    } else if (min === max) {
      return `Requires exactly ${max} ${pluralize(kindLabel, max)} (${count} selected)`;
    } else {
      return `Maximum ${max} ${pluralize(kindLabel, max)} allowed (${count} selected)`;
    }
  }

  return '';
}

/**
 * Gets all reasons why a tool is inactive (for detailed explanations).
 *
 * @param tool - The tool to explain
 * @param selection - Current selection map
 * @returns Array of all reasons, or empty array if tool is active
 */
export function getAllInactiveReasons(tool: Tool, selection: Selection): string[] {
  const reason = getInactiveReason(tool, selection);
  return reason ? [reason] : [];
}

/**
 * Formats a feature kind enum value to a human-readable label.
 *
 * @param kind - The kind enum value (e.g., "TRACK", "POINT")
 * @returns Formatted label (e.g., "track", "point")
 */
function formatKindLabel(kind: string): string {
  return kind.toLowerCase().replace(/_/g, ' ');
}

/**
 * Simple pluralization helper.
 *
 * @param word - The word to pluralize
 * @param count - The count to determine plurality
 * @returns Pluralized word if count !== 1
 */
function pluralize(word: string, count: number): string {
  if (count === 1) {
    return word;
  }
  // Handle special cases
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}
