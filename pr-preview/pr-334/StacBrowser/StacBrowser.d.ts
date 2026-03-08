import { StacBrowserProps } from './types';

/**
 * StacBrowser component — FilterBar on top, GoldenLayout workspace below.
 *
 * Layout:
 *   [FilterBar]                          (top, full width — outside GL)
 *   [ExerciseList] | [Map]               (GL panels, draggable/resizable)
 *                  | [Timeline]
 */
export declare function StacBrowser({ items, taxonomy, onItemSelect, className, }: StacBrowserProps): JSX.Element;
//# sourceMappingURL=StacBrowser.d.ts.map