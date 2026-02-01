/**
 * ActivityPanel component - unified panel combining time control, tools, and layers.
 *
 * Composes TimeController, ToolsPanel, and LayersToolbar + FeatureList into a
 * single collapsible panel with three sections.
 */

import { useState, useCallback, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Icon } from 'vscrui';
import type { IIconProps } from 'vscrui';
import { TimeController } from '../TimeController';
import { ToolsPanel } from '../ToolsPanel';
import { LayersToolbar } from '../LayersToolbar';
import { FeatureList } from '../FeatureList';
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
 */
interface PaneSectionProps {
  title: string;
  icon: IIconProps['name'];
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function PaneSection({ title, icon, collapsed, onToggle, children }: PaneSectionProps) {
  return (
    <div className={`debrief-activity-panel__section ${collapsed ? 'debrief-activity-panel__section--collapsed' : ''}`}>
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
  // Layers props
  features = [],
  selectedFeatureIds = [],
  hiddenIds,
  toolMatches = [],
  // Collapse
  collapseState: externalCollapseState,
  onCollapseStateChange,
  // Communication
  onMessage,
  className,
}: ActivityPanelProps) {
  const [internalCollapseState, setInternalCollapseState] = useState(DEFAULT_COLLAPSE_STATE);
  const collapseState = externalCollapseState ?? internalCollapseState;

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
    (toolId: string) => {
      onMessage?.({ type: 'tool:run', payload: { toolId } });
    },
    [onMessage]
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

  return (
    <div className={`debrief-activity-panel ${className ?? ''}`} role="region" aria-label="Activity Panel">
      <PaneSection
        title="Time Controller"
        icon="watch"
        collapsed={collapseState.timeControllerCollapsed}
        onToggle={() => toggleSection('timeControllerCollapsed')}
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

      <PaneSection
        title="Tools"
        icon="tools"
        collapsed={collapseState.toolsCollapsed}
        onToggle={() => toggleSection('toolsCollapsed')}
      >
        <SectionErrorBoundary sectionName="Tools">
          <ToolsPanel tools={tools} onRunTool={handleRunTool} />
        </SectionErrorBoundary>
      </PaneSection>

      <PaneSection
        title="Layers"
        icon="layers"
        collapsed={collapseState.layersCollapsed}
        onToggle={() => toggleSection('layersCollapsed')}
      >
        <SectionErrorBoundary sectionName="Layers">
          <LayersToolbar
            selectedFeatureIds={selectedFeatureIds}
            features={features}
            hiddenIds={hiddenIds}
            toolMatches={toolMatches}
            onDelete={handleDelete}
            onToggleVisibility={handleToggleVisibility}
          />
          <FeatureList
            features={features}
            selectedIds={new Set(selectedFeatureIds)}
            hiddenIds={hiddenIds}
            onSelectionChange={handleSelectionChange}
            height={200}
          />
        </SectionErrorBoundary>
      </PaneSection>
    </div>
  );
}
