/**
 * Component prop contracts for the Unified Activity Panel.
 *
 * These interfaces define the public API of each shared component.
 * Components in shared/components/ accept these props and have
 * zero dependency on VS Code APIs.
 */

import type { ToolItemContract, FeatureItemContract } from './messages';

// ─── ActivityPanel ───────────────────────────────────────────────────────────

export interface ActivityPanelProps {
  /** Initial collapse state for each section */
  initialCollapsed?: {
    timeController?: boolean;
    tools?: boolean;
    layers?: boolean;
  };
  /** Called when a section is collapsed or expanded */
  onSectionToggle?: (sectionId: string, collapsed: boolean) => void;
  /** Time Controller props */
  timeController: TimeControllerSectionProps;
  /** Tools section props */
  tools: ToolsListProps;
  /** Layers section props */
  layers: LayersSectionProps;
}

// ─── CollapsibleSection ──────────────────────────────────────────────────────

export interface CollapsibleSectionProps {
  /** Unique section identifier */
  id: string;
  /** Display title */
  title: string;
  /** Codicon icon name */
  icon?: string;
  /** Whether section is collapsed */
  collapsed: boolean;
  /** Called when header is clicked */
  onToggle: (collapsed: boolean) => void;
  /** Section content */
  children: React.ReactNode;
}

// ─── ToolsList ───────────────────────────────────────────────────────────────

export interface ToolsListProps {
  /** Available tools with match status */
  tools: ToolItemContract[];
  /** Whether any features are selected */
  hasSelection: boolean;
  /** Summary of current selection for display */
  selectionSummary: string;
  /** Whether to show inactive tools */
  showInactive?: boolean;
  /** Called when user clicks an active tool */
  onExecute: (toolId: string) => void;
}

// ─── TimeControllerSectionProps ──────────────────────────────────────────────

/** Props passed to TimeController within the unified panel (existing component API) */
export interface TimeControllerSectionProps {
  /** Start of time extent (epoch ms) */
  timeStart: number;
  /** End of time extent (epoch ms) */
  timeEnd: number;
  /** Current time position (epoch ms) */
  currentTime: number;
  /** Playback speed multiplier */
  speed: number;
  /** Display mode */
  displayMode: 'full' | 'trail';
  /** Whether playback is active */
  isPlaying: boolean;
  /** Called when user changes time */
  onTimeChange: (time: number) => void;
  /** Called when playback state changes */
  onPlaybackChange: (state: 'playing' | 'paused') => void;
  /** Called when display mode changes */
  onDisplayModeChange: (mode: 'full' | 'trail') => void;
}

// ─── LayersSectionProps ──────────────────────────────────────────────────────

/** Props for the layers section (wraps FeatureList + LayersToolbar) */
export interface LayersSectionProps {
  /** Features to display */
  features: FeatureItemContract[];
  /** Currently selected feature IDs */
  selectedIds: string[];
  /** Called when visibility is toggled */
  onToggleVisibility: (featureId: string, visible: boolean) => void;
  /** Called when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
}
