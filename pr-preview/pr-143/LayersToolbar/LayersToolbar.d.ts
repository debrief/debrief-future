import { LayersToolbarProps } from './types';

/**
 * LayersToolbar renders 5 buttons in two groups:
 * - Selection-scoped (left): Delete, Visibility, Run
 * - Plot-scoped (right): Filter, Associated Files
 *
 * Only one dropdown is open at a time. Click-outside or Escape closes it.
 */
export declare function LayersToolbar({ selectedFeatureIds, features, toolMatches, sourceFiles, resultFiles, toolsChanged, resultsChanged, filterState: externalFilterState, onDelete, onToggleVisibility, onRunTool, onRunAction, onFilterChange, onApplyToSelection, onFileAction, onDropdownOpened, labels: labelOverrides, className, }: LayersToolbarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LayersToolbar.d.ts.map