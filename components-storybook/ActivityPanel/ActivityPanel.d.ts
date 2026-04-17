import { ActivityPanelProps } from './types';

/**
 * ActivityPanel component.
 *
 * @example
 * ```tsx
 * <ActivityPanel
 *   timeExtent={[startTime, endTime]}
 *   timeUiState="ready"
 *   tools={tools}
 *   features={features}
 *   selectedFeatureIds={selectedIds}
 *   onMessage={(msg) => handleMessage(msg)}
 * />
 * ```
 */
export declare function ActivityPanel({ timeExtent, currentTime, playbackSpeed, displayMode, timeUiState, tools, hasToolInventory, hasToolSelection, features, selectedFeatureIds, hiddenIds, toolMatches, sourceFiles, resultFiles, resultsChanged, propertiesFields, propertiesLoading, propertiesReadOnly, propertiesWriteError, openItemStorePath, openItemPath, collapseState: externalCollapseState, onCollapseStateChange, onMessage, className, }: ActivityPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ActivityPanel.d.ts.map