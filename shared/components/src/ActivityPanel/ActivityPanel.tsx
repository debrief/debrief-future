/**
 * ActivityPanel component - unified panel combining time control, tools, and layers.
 *
 * Composes TimeController, ToolsPanel, and LayersToolbar + FeatureList into a
 * single collapsible panel with three sections.
 */

import { useState, useCallback, useRef, useEffect, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Icon } from 'vscrui';
import type { IIconProps } from 'vscrui';
import { TimeController } from '../TimeController';
import { ToolsPanel } from '../ToolsPanel';
import { LayersToolbar } from '../LayersToolbar';
import { FeatureList } from '../FeatureList';
import { FormatMenu } from '../FormatMenu';
import { GeometryDialog } from '../GeometryDialog';
import { PropertiesForm } from '../PropertiesPanel';
import type { FieldKey, FieldValue } from '../PropertiesPanel';
import type { DebriefFeature } from '../utils/types';
import { isTrackFeature, isMultiPointFeature, isMultiPolygonFeature } from '../utils/types';
import { getFeatureLabel } from '../utils/labels';
import type { DisplayItem } from '../FeatureList/flattenFeatures';
import type { ActivityPanelProps } from './types';
import { DEFAULT_COLLAPSE_STATE } from './types';
import './ActivityPanel.css';

/**
 * Error boundary for individual sections.
 * If a section throws an error, it shows an inline error message
 * without affecting other sections.
 */
interface SectionErrorBoundaryProps {
  sectionName: string;
  children: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`ActivityPanel: ${this.props.sectionName} error:`, error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="debrief-activity-panel__section-error">
          <Icon name="error" />
          <span>{this.props.sectionName} encountered an error</span>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Internal helper component for collapsible sections.
 *
 * `layout`:
 *  - "fixed"    → section sizes to its content, no internal scroll
 *  - "flexible" → section stretches to fill available space, content scrolls
 */
interface PaneSectionProps {
  title: string;
  icon: IIconProps['name'];
  collapsed: boolean;
  onToggle: () => void;
  layout?: 'fixed' | 'flexible';
  style?: React.CSSProperties;
  children: React.ReactNode;
}

function PaneSection({ title, icon, collapsed, onToggle, layout = 'fixed', style, children }: PaneSectionProps) {
  const sectionClass = [
    'debrief-activity-panel__section',
    collapsed && 'debrief-activity-panel__section--collapsed',
    layout === 'flexible' && !collapsed && 'debrief-activity-panel__section--flexible',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={sectionClass} style={style}>
      <button
        type="button"
        className="debrief-activity-panel__section-header"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} />
        <Icon name={icon} />
        <span className="debrief-activity-panel__section-title">{title}</span>
      </button>
      {!collapsed && (
        <div className="debrief-activity-panel__section-content">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Drag handle that lets the user resize the split between two flexible sections.
 */
interface ResizeHandleProps {
  onDrag: (deltaY: number) => void;
}

function ResizeHandle({ onDrag }: ResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    let startY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const delta = e.clientY - startY;
      startY = e.clientY;
      onDrag(delta);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      startY = e.clientY;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    };

    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [onDrag]);

  return <div ref={handleRef} className="debrief-activity-panel__resize-handle" />;
}

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
export function ActivityPanel({
  // Time props
  timeExtent,
  currentTime,
  playbackSpeed,
  displayMode,
  timeUiState,
  // Tools props
  tools = [],
  hasToolInventory,
  hasToolSelection,
  // Layers props
  features = [],
  selectedFeatureIds = [],
  hiddenIds,
  toolMatches = [],
  sourceFiles = [],
  resultFiles = [],
  resultsChanged = false,
  // Properties section (T042-T045)
  propertiesFields = [],
  propertiesLoading = false,
  propertiesReadOnly = false,
  propertiesWriteError = null,
  openItemStorePath,
  openItemPath,
  // Collapse
  collapseState: externalCollapseState,
  onCollapseStateChange,
  // Communication
  onMessage,
  className,
}: ActivityPanelProps) {
  const [internalCollapseState, setInternalCollapseState] = useState(DEFAULT_COLLAPSE_STATE);
  const collapseState = externalCollapseState ?? internalCollapseState;

  // Tracks the pixel offset from the default 50/50 split between Tools and Layers
  const [splitOffset, setSplitOffset] = useState(0);

  const handleResizeDrag = useCallback((deltaY: number) => {
    setSplitOffset((prev) => prev + deltaY);
  }, []);

  const toggleSection = useCallback(
    (section: keyof typeof DEFAULT_COLLAPSE_STATE) => {
      const newState = { ...collapseState, [section]: !collapseState[section] };
      setInternalCollapseState(newState);
      onCollapseStateChange?.(newState);
    },
    [collapseState, onCollapseStateChange]
  );

  const handleTimeChange = useCallback(
    (time: number) => {
      onMessage?.({ type: 'temporal:seek', payload: { time } });
    },
    [onMessage]
  );

  const handlePlaybackStateChange = useCallback(
    (state: 'playing' | 'paused') => {
      if (state === 'playing') {
        onMessage?.({ type: 'temporal:play', payload: { rate: 1 } });
      } else {
        onMessage?.({ type: 'temporal:pause' });
      }
    },
    [onMessage]
  );

  const handleDisplayModeChange = useCallback(
    (mode: 'full' | 'trail') => {
      onMessage?.({ type: 'temporal:displayMode', payload: { mode } });
    },
    [onMessage]
  );

  const handleRunTool = useCallback(
    (toolId: string, params?: Record<string, unknown>) => {
      onMessage?.({ type: 'tool:run', payload: { toolId, params } });
    },
    [onMessage]
  );

  const handlePropertiesCommit = useCallback(
    (key: FieldKey, value: FieldValue) => {
      if (!openItemStorePath || !openItemPath) return;
      onMessage?.({
        type: 'properties:commit',
        storePath: openItemStorePath,
        itemPath: openItemPath,
        patch: { [key]: value },
      });
    },
    [onMessage, openItemStorePath, openItemPath]
  );

  const handleToggleVisibility = useCallback(
    (featureIds: string[]) => {
      onMessage?.({ type: 'layer:toggleVisibility', payload: { featureIds } });
    },
    [onMessage]
  );

  const handleDelete = useCallback(
    (featureIds: string[]) => {
      onMessage?.({ type: 'layer:delete', payload: { featureIds } });
    },
    [onMessage]
  );

  const handleSelectionChange = useCallback(
    (ids: Set<string>) => {
      onMessage?.({ type: 'layer:select', payload: { featureIds: Array.from(ids) } });
    },
    [onMessage]
  );

  // Format menu state (Feature 097)
  const [formatMenuState, setFormatMenuState] = useState<{
    featureIds: string[];
    featureKinds: string[];
    position: { x: number; y: number };
    /** For child overrides (e.g., individual track point formatting) */
    childOverride?: { parentFeatureId: string; childIndex: number; childType: string };
  } | null>(null);

  const handleFormatClick = useCallback(
    (event: React.MouseEvent, feature: DebriefFeature) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const kind = feature.properties.kind as string | undefined;
      setInfoDialogState(null); // Mutual exclusion
      setFormatMenuState({
        featureIds: [feature.id],
        featureKinds: kind ? [kind] : ['TRACK'],
        position: { x: rect.right + 4, y: rect.top },
      });
    },
    []
  );

  const handleChildFormatClick = useCallback(
    (event: React.MouseEvent, displayItem: DisplayItem) => {
      if (!displayItem.parentId || displayItem.index === null) return;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setInfoDialogState(null); // Mutual exclusion

      // Map child type to the menu kind
      const childKindMap: Record<string, string> = {
        position: 'POSITION',
        point: 'POINT',
        polygon: 'POLY',
      };
      const menuKind = childKindMap[displayItem.type] ?? 'POINT';

      setFormatMenuState({
        featureIds: [displayItem.parentId],
        featureKinds: [menuKind],
        position: { x: rect.right + 4, y: rect.top },
        childOverride: {
          parentFeatureId: displayItem.parentId,
          childIndex: displayItem.index,
          childType: displayItem.type,
        },
      });
    },
    []
  );

  const handleToolbarFormat = useCallback(
    (featureIds: string[], anchorPosition: { x: number; y: number }) => {
      const kinds = featureIds.map((id) => {
        const f = features.find((feat) => feat.id === id);
        const kind = f ? (f.properties.kind as string | undefined) : undefined;
        return kind ?? 'TRACK';
      });
      // Deduplicate kinds
      const uniqueKinds = [...new Set(kinds)];
      setFormatMenuState({ featureIds, featureKinds: uniqueKinds, position: anchorPosition });
    },
    [features]
  );

  const handleFormatChange = useCallback(
    (featureIds: readonly string[], property: string, value: string | number) => {
      const override = formatMenuState?.childOverride;
      onMessage?.({
        type: 'layer:format',
        payload: {
          featureIds: [...featureIds],
          property,
          value,
          ...(override && {
            isPointOverride: true,
            positionIndex: override.childIndex,
            childType: override.childType,
          }),
        },
      });
      setFormatMenuState(null);
    },
    [onMessage, formatMenuState]
  );

  // Info dialog state (Feature 098)
  const [infoDialogState, setInfoDialogState] = useState<{
    feature_id: string;
    featureName: string;
    geometryType: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
    properties?: Record<string, unknown>;
    position: { x: number; y: number };
  } | null>(null);

  const handleInfoClick = useCallback(
    (event: React.MouseEvent, feature: DebriefFeature) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setFormatMenuState(null); // Mutual exclusion
      setInfoDialogState({
        feature_id: feature.id,
        featureName: getFeatureLabel(feature),
        geometryType: feature.geometry?.type ?? 'None',
        coordinates: (feature.geometry?.coordinates ?? []) as number[] | number[][] | number[][][] | number[][][][],
        // eslint-disable-next-line no-restricted-syntax
        properties: feature.properties as unknown as Record<string, unknown>,
        position: { x: rect.right + 4, y: rect.top },
      });
    },
    []
  );

  const handleChildInfoClick = useCallback(
    (event: React.MouseEvent, displayItem: DisplayItem) => {
      if (!displayItem.parentId || displayItem.index === null) return;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const parentFeature = features.find((f) => f.id === displayItem.parentId);
      if (!parentFeature) return;

      let geometryType: string;
      let coordinates: number[] | number[][] | number[][][] | number[][][][];

      if (isTrackFeature(parentFeature) && displayItem.type === 'position') {
        // eslint-disable-next-line no-restricted-syntax
        const coords = parentFeature.geometry.coordinates as unknown as number[][];
        geometryType = 'Point';
        coordinates = coords[displayItem.index] ?? [];
      } else if (isMultiPointFeature(parentFeature) && displayItem.type === 'point') {
        // eslint-disable-next-line no-restricted-syntax
        const coords = parentFeature.geometry.coordinates as unknown as number[][];
        geometryType = 'Point';
        coordinates = coords[displayItem.index] ?? [];
      } else if (isMultiPolygonFeature(parentFeature) && displayItem.type === 'polygon') {
        // eslint-disable-next-line no-restricted-syntax
        const coords = parentFeature.geometry.coordinates as unknown as number[][][][];
        geometryType = 'Polygon';
        coordinates = coords[displayItem.index] ?? [];
      } else {
        return;
      }

      setFormatMenuState(null); // Mutual exclusion
      setInfoDialogState({
        feature_id: displayItem.id,
        featureName: displayItem.label,
        geometryType,
        coordinates,
        position: { x: rect.right + 4, y: rect.top },
      });
    },
    [features]
  );

  // Determine how many flexible sections are expanded (for split calc)
  const toolsExpanded = !collapseState.toolsCollapsed;
  const layersExpanded = !collapseState.layersCollapsed;
  const bothFlexible = toolsExpanded && layersExpanded;

  // Build flex styles for the two flexible sections.
  // When both are expanded they share remaining space 50/50, adjusted by splitOffset.
  // `splitOffset` is in px but we approximate via flex-basis.
  const toolsStyle: React.CSSProperties | undefined = bothFlexible
    ? { flexBasis: `calc(50% + ${splitOffset}px)` }
    : undefined;
  const layersStyle: React.CSSProperties | undefined = bothFlexible
    ? { flexBasis: `calc(50% - ${splitOffset}px)` }
    : undefined;

  return (
    <div className={`debrief-activity-panel ${className ?? ''}`} role="region" aria-label="Activity Panel">
      {/* Time Controller — fixed height, no resize */}
      <PaneSection
        title="Time Controller"
        icon="watch"
        collapsed={collapseState.timeControllerCollapsed}
        onToggle={() => toggleSection('timeControllerCollapsed')}
        layout="fixed"
      >
        <SectionErrorBoundary sectionName="Time Controller">
          <TimeController
            timeExtent={timeExtent ?? undefined}
            initialTime={currentTime}
            initialSpeed={playbackSpeed}
            initialDisplayMode={displayMode}
            uiState={timeUiState}
            onTimeChange={handleTimeChange}
            onPlaybackStateChange={handlePlaybackStateChange}
            onDisplayModeChange={handleDisplayModeChange}
          />
        </SectionErrorBoundary>
      </PaneSection>

      {/* Tools — flexible, scrollable */}
      <PaneSection
        title="Tools"
        icon="tools"
        collapsed={collapseState.toolsCollapsed}
        onToggle={() => toggleSection('toolsCollapsed')}
        layout="flexible"
        style={toolsStyle}
      >
        <SectionErrorBoundary sectionName="Tools">
          <ToolsPanel tools={tools} hasToolInventory={hasToolInventory} hasSelection={hasToolSelection} onRunTool={handleRunTool} />
        </SectionErrorBoundary>
      </PaneSection>

      {/* Resize handle between Tools and Layers (only when both expanded) */}
      {bothFlexible && <ResizeHandle onDrag={handleResizeDrag} />}

      {/* Layers — flexible, scrollable */}
      <PaneSection
        title="Layers"
        icon="layers"
        collapsed={collapseState.layersCollapsed}
        onToggle={() => toggleSection('layersCollapsed')}
        layout="flexible"
        style={layersStyle}
      >
        <SectionErrorBoundary sectionName="Layers">
          <LayersToolbar
            selectedFeatureIds={selectedFeatureIds}
            features={features}
            hiddenIds={hiddenIds}
            toolMatches={toolMatches}
            sourceFiles={sourceFiles}
            resultFiles={resultFiles}
            resultsChanged={resultsChanged}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
            onFormat={handleToolbarFormat}
            onRunTool={(toolId) => onMessage?.({ type: 'tool:run', payload: { toolId } })}
            onFileAction={(file, action) => onMessage?.({ type: 'file:action', payload: { file, action } })}
          />
          <FeatureList
            features={features}
            selectedIds={new Set(selectedFeatureIds)}
            hiddenIds={hiddenIds}
            onSelectionChange={handleSelectionChange}
            showFormatIcon
            onFormatClick={handleFormatClick}
            onChildFormatClick={handleChildFormatClick}
            showInfoIcon
            onInfoClick={handleInfoClick}
            onChildInfoClick={handleChildInfoClick}
          />
          {formatMenuState && (
            <FormatMenu
              featureIds={formatMenuState.featureIds}
              featureKinds={formatMenuState.featureKinds}
              anchorPosition={formatMenuState.position}
              onFormatChange={handleFormatChange}
              onDismiss={() => setFormatMenuState(null)}
            />
          )}
          {infoDialogState && (
            <GeometryDialog
              featureName={infoDialogState.featureName}
              geometryType={infoDialogState.geometryType}
              coordinates={infoDialogState.coordinates}
              properties={infoDialogState.properties}
              anchorPosition={infoDialogState.position}
              onDismiss={() => setInfoDialogState(null)}
            />
          )}
        </SectionErrorBoundary>
      </PaneSection>

      {/* Properties — 4th section, schema-driven form over the open plot's item.json */}
      <PaneSection
        title="Properties"
        icon="settings-gear"
        collapsed={collapseState.propertiesCollapsed}
        onToggle={() => toggleSection('propertiesCollapsed')}
        layout="fixed"
      >
        <SectionErrorBoundary sectionName="Properties">
          <PropertiesForm
            fields={propertiesFields}
            onCommitField={handlePropertiesCommit}
            loading={propertiesLoading}
            readOnly={propertiesReadOnly}
            writeError={propertiesWriteError}
          />
        </SectionErrorBoundary>
      </PaneSection>
    </div>
  );
}
