/**
 * ToolMatch module - Context-sensitive tool offering.
 *
 * Provides a service for matching analysis tools to feature selections.
 *
 * @example
 * ```ts
 * import { ToolMatchService, createSelectionFromCounts } from '@debrief/components/ToolMatch';
 *
 * const service = new ToolMatchService(tools);
 * const selection = createSelectionFromCounts({ TRACK: 2 });
 * const activeTools = service.getActiveTools(selection);
 * ```
 */
export { ToolMatchService } from './ToolMatchService';
export { getInactiveReason, getAllInactiveReasons } from './explanations';
export type { Selection, MatchResult } from './types';
export { createSelection, createSelectionFromCounts } from './types';
export type { Tool, SelectionRequirement } from './types';
//# sourceMappingURL=index.d.ts.map