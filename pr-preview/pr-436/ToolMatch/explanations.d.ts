import { Tool } from '../../../schemas/src/generated/typescript/index.ts';
import { Selection } from './types';

/**
 * Gets a human-readable explanation of why a tool is inactive.
 *
 * Returns an empty string if the tool is actually active for the selection.
 *
 * @param tool - The tool to explain
 * @param selection - Current selection map
 * @returns Explanation string, or empty string if tool is active
 */
export declare function getInactiveReason(tool: Tool, selection: Selection): string;
/**
 * Gets all reasons why a tool is inactive (for detailed explanations).
 *
 * @param tool - The tool to explain
 * @param selection - Current selection map
 * @returns Array of all reasons, or empty array if tool is active
 */
export declare function getAllInactiveReasons(tool: Tool, selection: Selection): string[];
//# sourceMappingURL=explanations.d.ts.map