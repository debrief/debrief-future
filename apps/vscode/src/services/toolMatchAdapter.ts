/**
 * ToolMatchAdapter - Bridges session-state selection to ToolMatchService
 *
 * This adapter converts the session-state FeatureSelection (array of feature IDs)
 * into the ToolMatchService Selection format (Map of kind → count) and provides
 * reactive tool matching for the VS Code extension.
 *
 * Feature: 038-context-tool-vscode
 *
 * @example
 * ```typescript
 * const adapter = new ToolMatchAdapter(tools, getFeatureKind);
 *
 * // Subscribe to session selection changes
 * subscribeToSelection(session, (selection) => {
 *   adapter.updateSelection(selection);
 *   const activeTools = adapter.getActiveTools();
 *   // Update UI with active tools
 * });
 * ```
 */

import {
  ToolMatchService,
  createSelectionFromCounts,
  type Tool,
  type ToolSelection,
  type MatchResult,
} from '../types/tool';
import type { FeatureSelection } from '@debrief/session-state';
import { getRoot } from '@debrief/session-state';

/**
 * Function to look up the feature kind for a feature ID (root ID, not path).
 * Returns the kind string (e.g., 'TRACK', 'POINT', 'CIRCLE') or undefined if unknown.
 */
export type FeatureKindLookup = (featureId: string) => string | undefined;

/**
 * ToolMatchAdapter - Bridges session selection to ToolMatchService.
 *
 * Responsibilities:
 * - Convert feature IDs to kind counts for ToolMatchService
 * - Cache current selection state
 * - Provide active/inactive tools based on selection
 * - Generate explanations for inactive tools (FR-011)
 */
export class ToolMatchAdapter {
  private matchService: ToolMatchService;
  private currentSelection: ToolSelection = new Map();
  private featureIds: string[] = [];
  private getFeatureKind: FeatureKindLookup;

  /**
   * Creates a new ToolMatchAdapter.
   *
   * @param tools - Array of available tools from CalcService
   * @param getFeatureKind - Function to look up feature kind by ID
   */
  constructor(tools: Tool[], getFeatureKind: FeatureKindLookup) {
    this.matchService = new ToolMatchService(tools);
    this.getFeatureKind = getFeatureKind;
  }

  /**
   * Update the current selection from session state.
   *
   * Converts feature IDs to kind counts and triggers re-evaluation.
   *
   * @param selection - FeatureSelection from session-state
   */
  updateSelection(selection: FeatureSelection): void {
    this.featureIds = selection.featureIds;
    this.currentSelection = this.featureIdsToSelection(selection.featureIds);
  }

  /**
   * Clear the current selection.
   */
  clearSelection(): void {
    this.featureIds = [];
    this.currentSelection = new Map();
  }

  /**
   * Update the tool inventory.
   *
   * Called when tools are refreshed from CalcService.
   *
   * @param tools - New tool inventory
   */
  updateTools(tools: Tool[]): void {
    this.matchService = new ToolMatchService(tools);
  }

  /**
   * Get all tools that are active for the current selection.
   *
   * @returns Array of active tools, sorted alphabetically
   */
  getActiveTools(): Tool[] {
    return this.matchService.getActiveTools(this.currentSelection);
  }

  /**
   * Get all tools with their match status for the current selection.
   *
   * @returns Array of MatchResult for all tools
   */
  getMatchResults(): MatchResult[] {
    return this.matchService.getMatchResults(this.currentSelection);
  }

  /**
   * Get all tools in the inventory.
   *
   * @returns Array of all tools, sorted alphabetically
   */
  getAllTools(): Tool[] {
    return this.matchService.getAllTools();
  }

  /**
   * Check if any features are currently selected.
   *
   * @returns True if at least one feature is selected
   */
  hasSelection(): boolean {
    return this.featureIds.length > 0;
  }

  /**
   * Get the current selection as feature IDs.
   *
   * @returns Array of selected feature IDs
   */
  getSelectedFeatureIds(): string[] {
    return [...this.featureIds];
  }

  /**
   * Get a summary of selected features by kind.
   *
   * @returns Map of kind to count
   */
  getSelectionSummary(): Map<string, number> {
    return new Map(this.currentSelection);
  }

  /**
   * Check if a specific tool is active for the current selection.
   *
   * @param tool - The tool to check
   * @returns True if tool is active
   */
  isToolActive(tool: Tool): boolean {
    return this.matchService.isToolActive(tool, this.currentSelection);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Convert an array of feature paths/IDs to a Selection map (kind → count).
   *
   * Feature 053: Extracts root feature ID from selection paths before looking up kind.
   * This ensures that "track-001/positions/4" is counted as one TRACK selection.
   *
   * @param featureIds - Array of feature paths from session selection
   * @returns Selection map for ToolMatchService
   */
  private featureIdsToSelection(featureIds: string[]): ToolSelection {
    const kindCounts: Record<string, number> = {};

    for (const path of featureIds) {
      const rootId = getRoot(path);
      const kind = this.getFeatureKind(rootId);
      if (kind) {
        kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
      }
    }

    return createSelectionFromCounts(kindCounts);
  }
}
