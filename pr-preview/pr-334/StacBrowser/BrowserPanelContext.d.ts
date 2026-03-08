import { StacBrowserItem } from '../filter-engine/types';
import { ExerciseListItem } from '../ExerciseListView';

export interface BrowserPanelContextValue {
    /** Items after all filter axes applied. */
    readonly filteredItems: readonly StacBrowserItem[];
    /** ExerciseListView-compatible items (with trackDataHref). */
    readonly listItems: readonly ExerciseListItem[];
    /** Callback when user selects an item. */
    readonly onItemSelect?: (itemPath: string) => void;
}
export declare const BrowserPanelContext: import('../../../../node_modules/.pnpm/react@18.3.1/node_modules/react').Context<BrowserPanelContextValue | null>;
export declare function useBrowserPanelContext(): BrowserPanelContextValue;
//# sourceMappingURL=BrowserPanelContext.d.ts.map