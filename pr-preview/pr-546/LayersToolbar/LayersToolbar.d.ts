import { LayersToolbarProps } from './types';

/**
 * LayersToolbar renders buttons in two groups:
 * - Selection-scoped (left): Delete, Visibility, Format (097), Run
 * - Plot-scoped (right): Filter, Associated Files
 *
 * Only one dropdown is open at a time. Click-outside or Escape closes it.
 */
export declare function LayersToolbar({ selectedFeatureIds, features, hiddenIds, toolMatches, sourceFiles, resultFiles, toolsChanged, resultsChanged, filterState: externalFilterState, showHidden, onDelete, onToggleVisibility, onFormat, onRunTool, onRunAction, onFilterChange, onShowHiddenChange, onApplyToSelection, onFileAction, onDropdownOpened, labels: labelOverrides, className, }: LayersToolbarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=LayersToolbar.d.ts.map