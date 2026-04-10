import { Tool } from '../../../../schemas/src/generated/typescript/index.ts';
import { MatchResult } from '../../ToolMatch/types';

/** Extended Tool with category for Run dropdown grouping */
type ToolWithCategory = Tool & {
    category?: string;
};
/**
 * Sample tools with category and subcategory for Run dropdown grouping.
 */
export declare const sampleToolsWithCategories: ToolWithCategory[];
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
export {};
//# sourceMappingURL=tools.d.ts.map