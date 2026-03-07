import { FilterExpression, FilterType } from '../filter-engine';
import { FilterBarState, FilterBarAction } from './types';

/** Convert filter bar state to a FilterExpression for the engine */
export declare function toFilterExpression(state: FilterBarState): FilterExpression;
export interface UseFilterBarReturn {
    readonly state: FilterBarState;
    readonly dispatch: React.Dispatch<FilterBarAction>;
    readonly expression: FilterExpression;
    readonly addLozenge: (filterType: FilterType, value: string) => void;
    readonly removeLozenge: (id: string) => void;
    readonly editLozenge: (id: string, value: string) => void;
    readonly addOrContainer: () => void;
    readonly removeOrContainer: (id: string) => void;
    readonly addChildLozenge: (containerId: string, filterType: FilterType, value: string) => void;
    readonly toggleNegate: (id: string) => void;
    readonly moveToContainer: (lozengeId: string, containerId: string) => void;
    readonly moveToTopLevel: (lozengeId: string, fromContainerId: string) => void;
    readonly setState: (state: FilterBarState) => void;
}
export declare function useFilterBar(initialState?: FilterBarState): UseFilterBarReturn;
//# sourceMappingURL=useFilterBar.d.ts.map