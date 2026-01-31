import { Tool } from '@debrief/schemas';
import { MatchResult } from '../../ToolMatch/types';

/**
 * Sample tools with category and subcategory for Run dropdown grouping.
 */
export declare const sampleToolsWithCategories: Tool[];
/**
 * Generate mock MatchResult array from tools.
 * All tools marked active for story purposes.
 */
export declare function createActiveToolResults(tools?: Tool[]): MatchResult[];
/**
 * Generate mixed active/inactive results.
 */
export declare function createMixedToolResults(): MatchResult[];
/** Empty tool results */
export declare const emptyToolResults: MatchResult[];
//# sourceMappingURL=tools.d.ts.map