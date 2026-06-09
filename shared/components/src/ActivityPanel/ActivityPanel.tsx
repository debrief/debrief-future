/**
 * ActivityPanel component - unified panel combining time control, tools, and layers.
 *
 * Composes TimeController, ToolsPanel, and LayersToolbar + FeatureList into a
 * single collapsible panel with three sections.
 */

import { useState, useCallback, useRef, useEffect, useMemo, Component, useLayoutEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Icon } from 'vscrui';
import type { IIconProps } from 'vscrui';
import { TimeController } from '../TimeController';
import { ToolsPanel } from '../ToolsPanel';
import { LayersToolbar } from '../LayersToolbar';
import { FeatureList } from '../FeatureList';
import { FormatMenu } from '../FormatMenu';
import { GeometryDialog } from '../GeometryDialog';
import { PropertiesPanelDispatch } from '../PropertiesPanel/PropertiesPanelDispatch';
import { StoryboardPanel } from '../panels/StoryboardPanel';
import { resolveEditingMode } from '../PropertiesPanel/selectionMode';
import { saveStagedEdits } from '../PropertiesPanel/saveStagedEdits';
import type { FieldKey, FieldValue } from '../PropertiesPanel';
import type { FeatureSelection } from '@debrief/session-state/browser';
import { useStagedEdits } from './useStagedEdits';
import type { DebriefFeature } from '../utils/types';
import { isTrackFeature, isMultiPointFeature, isMultiPolygonFeature } from '../utils/types';
import type { DisplayMode, PlaybackState } from '@debrief/schemas';
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
 * Height threshold below which the short-height adaptation fires (T021).
 *
 * Derived from a 720-px viewport: subtract ~100px for the GoldenLayout header
 * chrome + the browser URL bar, leaving ~820 px for the panel itself.
 * Panels taller than 899 px (e.g. 900px+ / 13" laptop at full height, or
 * any desktop with the GL panel occupying the full viewport) are NOT adapted.
 *
 * Decision #2: adapt only when UNCONTROLLED AND height < threshold AND a
 * feature is selected. Never call onCollapseStateChange (not persisted).
 */
const SHORT_HEIGHT_THRESHOLD = 820;

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
  // Spec 192 — Properties Panel mode dispatcher
  selection,
  isPlotReadOnly = false,
  plotReadOnlyReason = null,
  onSavePropertiesPanel,
  appendPropertiesPanelProvenance,
  propertiesPanelPackageVersion = '0.0.0',
  onPropertiesPanelSaveResult,
  // Collapse
  collapseState: externalCollapseState,
  onCollapseStateChange,
  // Communication
  onMessage,
  // Storyboard section (optional 5th pane) — rendered as a child
  // StoryboardPanel, exactly like the Time Controller / Tools / Layers /
  // Properties sections above. The host supplies the StoryboardPanel props.
  storyboard,
  className,
}: ActivityPanelProps) {
  const [internalCollapseState, setInternalCollapseState] = useState(DEFAULT_COLLAPSE_STATE);
  const collapseState = externalCollapseState ?? internalCollapseState;

  // Ref for the panel root div — used by the short-height adaptation (T021).
  const panelRef = useRef<HTMLDivElement>(null);

  // Short-height adaptation (T021 / US4 / Decision #2):
  //
  // When the panel is UNCONTROLLED (no collapseState prop) AND the container
  // clientHeight is below SHORT_HEIGHT_THRESHOLD AND a feature is selected,
  // set the INITIAL internalCollapseState to collapse the Time Controller so
  // Properties moves up toward the fold — without hiding Tools or Layers.
  //
  // Rules:
  //   - No-op when collapseState is controlled (externalCollapseState provided).
  //   - No-op when clientHeight >= 900px.
  //   - NEVER calls onCollapseStateChange — not persisted; manual toggles win.
  //   - Read clientHeight ONCE (useLayoutEffect runs synchronously after DOM
  //     paint on the initial mount, Decision #13 — read once at init/reset).
  //   - A feature is "selected" when selectedFeatureIds is non-empty OR
  //     selection.featureIds is non-empty.
  const isUncontrolled = externalCollapseState === undefined;
  const hasSelectedFeature =
    (selectedFeatureIds?.length ?? 0) > 0 ||
    (selection?.featureIds?.length ?? 0) > 0;

  useLayoutEffect(() => {
    if (!isUncontrolled) return; // No-op when controlled
    const el = panelRef.current;
    if (!el) return;
    const height = el.clientHeight;
    if (height === 0 || height >= 900) return; // No-op when tall or unmeasured
    if (height >= SHORT_HEIGHT_THRESHOLD) return; // No-op above threshold
    if (!hasSelectedFeature) return; // No-op when no feature selected

    // Collapse ONLY the Time Controller (the topmost fixed-height section) to
    // free vertical space so Properties moves up toward the fold. We must NOT
    // collapse Tools or Layers: collapsing a section sets it display:none, which
    // hides the feature list (Layers) the user selects from and the Tools they
    // run — breaking the very selection/run flows this view exists for and
    // leaving those rows unreachable (they can't be scrolled into view). With
    // Tools/Layers kept expanded, Properties is reached via the column's natural
    // scroll (Decision #2 — never persisted; manual toggles win).
    setInternalCollapseState((prev) => ({
      ...prev,
      timeControllerCollapsed: true,
    }));
    // Intentionally NO call to onCollapseStateChange (Decision #2 — not persisted)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE at mount — clientHeight read once (Decision #13)

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
    // Accepts the full three-state PlaybackState vocabulary (Feature 205);
    // 'stopped' is treated identically to 'paused' (stopped ≡ paused rule).
    (state: PlaybackState) => {
      if (state === 'playing') {
        onMessage?.({ type: 'temporal:play', payload: { rate: 1 } });
      } else {
        onMessage?.({ type: 'temporal:pause' });
      }
    },
    [onMessage]
  );

  const handleDisplayModeChange = useCallback(
    (mode: DisplayMode) => {
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

  // ── Spec 192: Properties Panel staging buffer + mode dispatch ────────
  //
  // The staging buffer lives in `ActivityPanel` React state per R-002a
  // (not in a new Zustand slice). The hook returns a stable API surface
  // that the dispatcher / mode shells consume.
  const staging = useStagedEdits();

  // Build a `featuresById` lookup once per features-list reference.
  // Used by `resolveEditingMode` and handed into the mode shells for the
  // multi-select derivation in Phase 7.
  const featuresById = useMemo<ReadonlyMap<string, DebriefFeature>>(() => {
    const map = new Map<string, DebriefFeature>();
    for (const f of features) {
      map.set(f.id, f);
    }
    return map;
  }, [features]);

  // Synthesise a `FeatureSelection`-shaped object for the resolver. When
  // the host hasn't started passing `selection` yet, fall back to the
  // legacy `selectedFeatureIds` array — `resolveEditingMode` treats that
  // as featureIds with a null primary and resolves to plot/feature/multi
  // accordingly. Zero regression to #447's plot-editor flow.
  const resolverSelection = useMemo<FeatureSelection>(() => {
    if (selection) {
      return {
        featureIds: selection.featureIds,
        primary: selection.primary,
        // The resolver doesn't read `timestamp`; use Date.now() so the
        // shape matches without forcing the host to fabricate one.
        timestamp: { epoch: 0, iso: new Date(0).toISOString() },
      };
    }
    return {
      featureIds: selectedFeatureIds,
      primary: selectedFeatureIds.length === 1 ? (selectedFeatureIds[0] ?? null) : null,
      timestamp: { epoch: 0, iso: new Date(0).toISOString() },
    };
  }, [selection, selectedFeatureIds]);

  const editingMode = useMemo(
    () => resolveEditingMode(resolverSelection, featuresById),
    [resolverSelection, featuresById]
  );

  // ── Integrated save path (Spec 192 T025 + T048) ─────────────────────
  //
  // Reads `applyEditsToFeatures(features)` → calls the host writer →
  // appends provenance per affected feature → clears the staging buffer.
  // Read-only escalation post-write is handled inside the writer (R-009).
  //
  // T048 (Phase 6 / US-5) — read-only PRE-flight gate. When the plot
  // slice has already flagged the plot as read-only (either because
  // capability probe returned `persistent: false` at open time, or
  // because a prior save failed with `ReadOnlyFilesystemError` / EACCES /
  // EPERM), refuse to invoke the writer at all. Article I.3 — no silent
  // failure: bail explicitly with `success: false` so the host can show
  // an info banner if it subscribes to `onPropertiesPanelSaveResult`.
  const handlePropertiesPanelSave = useCallback(async () => {
    if (!onSavePropertiesPanel || !appendPropertiesPanelProvenance) return;
    if (isPlotReadOnly) {
      const result = {
        success: false as const,
        error: plotReadOnlyReason ?? 'Plot is read-only — edits are not saved.',
      };
      onPropertiesPanelSaveResult?.(result);
      return;
    }
    const result = await saveStagedEdits({
      features,
      staging,
      writer: onSavePropertiesPanel,
      appendProvenance: appendPropertiesPanelProvenance,
      packageVersion: propertiesPanelPackageVersion,
    });
    onPropertiesPanelSaveResult?.(result);
  }, [
    features,
    staging,
    onSavePropertiesPanel,
    appendPropertiesPanelProvenance,
    propertiesPanelPackageVersion,
    onPropertiesPanelSaveResult,
    isPlotReadOnly,
    plotReadOnlyReason,
  ]);
  // Surface the save handler to the React lint pass — wired through to
  // the mode shells in later phases. For Phase 2 we expose it via a
  // ref-style assignment so the eslint unused-vars rule is satisfied and
  // the binding is reachable in the dispatcher when later tasks wire a
  // visible Save action onto the modes.
  void handlePropertiesPanelSave;

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

  // #192 Phase 5: structured click event from FeatureList. Conveys the
  // `target + modifier` bits so the host can recompute `primary` via
  // `applyClickToSelection` — producing identical map/Layers parity.
  const handleSelectionEvent = useCallback(
    (event: { target: string; modifier: boolean; shift: boolean }) => {
      onMessage?.({
        type: 'layer:selectEvent',
        payload: { target: event.target, modifier: event.modifier, shift: event.shift },
      });
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
    <div ref={panelRef} className={`debrief-activity-panel ${className ?? ''}`} role="region" aria-label="Activity Panel">
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
            onSelectionEvent={handleSelectionEvent}
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
          {/*
            Spec 192 T019 — mode-aware dispatcher. The plot-mode branch
            renders the unchanged #447 `PropertiesForm` with the exact
            prop surface it had today (zero regression — FR-012 / SC-008).
            Feature / sub-feature / multi-select branches render the new
            mode shells.
          */}
          <PropertiesPanelDispatch
            editingMode={editingMode}
            featuresById={featuresById}
            isReadOnly={isPlotReadOnly}
            readOnlyReason={plotReadOnlyReason}
            plotFormProps={{
              fields: propertiesFields,
              onCommitField: handlePropertiesCommit,
              loading: propertiesLoading,
              readOnly: propertiesReadOnly,
              writeError: propertiesWriteError,
            }}
            setFeatureField={staging.setFeatureField}
            setVertexField={staging.setVertexField}
            revertField={staging.revertField}
            unrevertField={staging.unrevertField}
            stagedEdits={staging.state}
          />
        </SectionErrorBoundary>
      </PaneSection>

      {/* Storyboard — 5th section, a child StoryboardPanel rendered by this
          component (like the sections above). The host passes the live
          StoryboardPanel props via `storyboard`; when omitted, no section
          renders. The sidebar reads as a single flat list (Time Controller,
          Tools, Layers, Properties, Storyboard). */}
      {storyboard && (
        <PaneSection
          title="Storyboard"
          icon="device-camera-video"
          collapsed={collapseState.storyboardCollapsed ?? false}
          onToggle={() => toggleSection('storyboardCollapsed')}
          layout="flexible"
          // Floor the flexible share so the empty-state (and its "Create
          // storyboard" button) is never clipped when the panel is short and
          // multiple flexible sections compete. Populated storyboards scroll
          // internally within the section above this floor.
          style={{ minHeight: 200 }}
        >
          <SectionErrorBoundary sectionName="Storyboard">
            <StoryboardPanel {...storyboard} />
          </SectionErrorBoundary>
        </PaneSection>
      )}
    </div>
  );
}
