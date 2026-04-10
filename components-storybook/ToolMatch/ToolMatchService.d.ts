import { Tool } from '../../../schemas/src/generated/typescript/index.ts';
import { Selection, MatchResult } from './types';

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
export declare class ToolMatchService {
    private tools;
    /**
     * Creates a new ToolMatchService with the given tool inventory.
     *
     * @param tools - Array of tools to match against selections
     */
    constructor(tools: Tool[]);
    /**
     * Gets all tools with their match status for the given selection.
     *
     * @param selection - Map of feature kinds to counts
     * @returns Array of MatchResult for all tools, sorted alphabetically
     */
    getMatchResults(selection: Selection): MatchResult[];
    /**
     * Gets only the active tools for the given selection.
     *
     * @param selection - Map of feature kinds to counts
     * @returns Array of active tools, sorted alphabetically
     */
    getActiveTools(selection: Selection): Tool[];
    /**
     * Gets only the inactive tools for the given selection.
     *
     * @param selection - Map of feature kinds to counts
     * @returns Array of inactive tools, sorted alphabetically
     */
    getInactiveTools(selection: Selection): Tool[];
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
    isToolActive(tool: Tool, selection: Selection): boolean;
    /**
     * Gets the list of all tools in this service.
     *
     * @returns Array of all tools, sorted alphabetically
     */
    getAllTools(): Tool[];
}
//# sourceMappingURL=ToolMatchService.d.ts.map