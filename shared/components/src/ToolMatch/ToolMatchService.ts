/**
 * ToolMatchService - Core matching algorithm for context-sensitive tool offering.
 *
 * Determines which analysis tools are applicable based on the current feature selection.
 * Tools define requirements (e.g., "needs 2 tracks") and this service matches
 * those requirements against the selection.
 */

import type { Tool } from '@debrief/schemas';
import type { Selection, MatchResult } from './types';
import { getInactiveReason } from './explanations';

/**
 * Service for matching tools to feature selections.
 *
 * @example
 * ```ts
 * const service = new ToolMatchService(tools);
 * const selection = createSelectionFromCounts({ TRACK: 2 });
 * const activeTools = service.getActiveTools(selection);
 * const allResults = service.getMatchResults(selection);
 * ```
 */
export class ToolMatchService {
  private tools: Tool[];

  /**
   * Creates a new ToolMatchService with the given tool inventory.
   *
   * @param tools - Array of tools to match against selections
   */
  constructor(tools: Tool[]) {
    this.tools = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Gets all tools with their match status for the given selection.
   *
   * @param selection - Map of feature kinds to counts
   * @returns Array of MatchResult for all tools, sorted alphabetically
   */
  getMatchResults(selection: Selection): MatchResult[] {
    return this.tools.map((tool) => {
      const isActive = this.isToolActive(tool, selection);
      return {
        tool,
        isActive,
        explanation: isActive ? '' : getInactiveReason(tool, selection),
      };
    });
  }

  /**
   * Gets only the active tools for the given selection.
   *
   * @param selection - Map of feature kinds to counts
   * @returns Array of active tools, sorted alphabetically
   */
  getActiveTools(selection: Selection): Tool[] {
    return this.tools.filter((tool) => this.isToolActive(tool, selection));
  }

  /**
   * Gets only the inactive tools for the given selection.
   *
   * @param selection - Map of feature kinds to counts
   * @returns Array of inactive tools, sorted alphabetically
   */
  getInactiveTools(selection: Selection): Tool[] {
    return this.tools.filter((tool) => !this.isToolActive(tool, selection));
  }

  /**
   * Checks if a single tool is active for the given selection.
   *
   * A tool is active when ANY of its requirements are satisfied:
   * - For each requirement, check if the selection has at least `min` features of that kind
   *   and at most `max` features (if specified)
   * - The tool is active if at least one requirement is fully satisfied
   * - If the selection has kinds not mentioned in any requirement, those are ignored
   *
   * A tool with no requirements (empty array) is always active.
   *
   * @param tool - The tool to check
   * @param selection - Map of feature kinds to counts
   * @returns True if the tool is active for the selection
   */
  isToolActive(tool: Tool, selection: Selection): boolean {
    const requirements = tool.requirements ?? [];

    // Tools with no requirements are always active
    if (requirements.length === 0) {
      return true;
    }

    // Check if ANY requirement is satisfied (OR semantics)
    for (const req of requirements) {
      const count = selection.get(req.kind) ?? 0;
      const min = req.min ?? 0;

      if (count < min) {
        continue;
      }

      if (req.max !== undefined && req.max !== null && count > req.max) {
        continue;
      }

      // This requirement is satisfied
      return true;
    }

    return false;
  }

  /**
   * Gets the list of all tools in this service.
   *
   * @returns Array of all tools, sorted alphabetically
   */
  getAllTools(): Tool[] {
    return [...this.tools];
  }
}
