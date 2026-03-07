import { StacBrowserProps } from './types';

/**
 * StacBrowser component — four-panel layout with synchronized filter state.
 *
 * Layout:
 *   [FilterBar]                    (top, full width)
 *   [ExerciseListView] [MapView]   (left 300px, right flex)
 *                      [Timeline]  (right bottom)
 */
export declare function StacBrowser({ items, taxonomy, onItemSelect, className, }: StacBrowserProps): JSX.Element;
//# sourceMappingURL=StacBrowser.d.ts.map