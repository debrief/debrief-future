/**
 * Type definitions for the ActivityPanel component.
 *
 * This module defines the props and state for the unified activity panel,
 * which combines time control, tools, and layers sections.
 */

import type { DebriefFeature } from '../utils/types';
import type { DisplayMode, PlaybackState } from '@debrief/schemas';
import type { MatchResult, ToolParameter } from '../ToolMatch/types';
import type { AssociatedFile } from '../LayersToolbar/types';
import type { PropertiesCommitMessage } from '../PropertiesPanel/messageTypes';
import type { PropertiesFormField } from '../PropertiesPanel/types';
import type {
  SaveWriter,
  AppendProvenanceFn,
  SaveStagedEditsResult,
} from '../PropertiesPanel/saveStagedEdits';

/**
 * Collapse state for each section of the ActivityPanel.
 */
export interface ActivityPanelCollapseState {
  timeControllerCollapsed: boolean;
  toolsCollapsed: boolean;
  layersCollapsed: boolean;
  propertiesCollapsed: boolean;
}

/**
 * Default collapse state - all sections expanded.
 */
export const DEFAULT_COLLAPSE_STATE: ActivityPanelCollapseState = {
  timeControllerCollapsed: false,
  toolsCollapsed: false,
  layersCollapsed: false,
  propertiesCollapsed: false,
};

/**
 * Item in the ToolsPanel list.
 */
export interface ToolsPanelItem {
  /** Unique identifier for the tool */
  id: string;
  /** Display name */
  name: string;
  /** Brief description of what the tool does */
  description: string;
  /** Whether the tool is applicable to the current selection */
  applicable: boolean;
  /** Explanation when tool is not applicable (optional) */
  explanation?: string;
  /** Configurable parameters with type metadata */
  parameters?: ToolParameter[];
}

/**
 * Props for the ToolsPanel component.
 */
export interface ToolsPanelProps {
  /** List of tools to display */
  tools: ToolsPanelItem[];
  /** Whether the tool inventory has been loaded (false = calc service unavailable) */
  hasToolInventory?: boolean;
  /** Whether features are currently selected */
  hasSelection?: boolean;
  /** Callback when a tool is run, with optional collected parameters */
  onRunTool?: (toolId: string, params?: Record<string, unknown>) => void;
  /** CSS class name */
  className?: string;
}

/**
 * Messages sent from ActivityPanel to the host (VS Code extension).
 */
export type ActivityPanelMessage =
  | { type: 'temporal:seek'; payload: { time: number } }
  | { type: 'temporal:play'; payload: { rate: number } }
  | { type: 'temporal:pause' }
  | { type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }
  | { type: 'tool:run'; payload: { toolId: string; params?: Record<string, unknown> } }
  | { type: 'layer:toggleVisibility'; payload: { featureIds: string[] } }
  | { type: 'layer:delete'; payload: { featureIds: string[] } }
  | { type: 'layer:select'; payload: { featureIds: string[] } }
  | {
      /**
       * Structured click-event payload (mirrors `SelectionClickEvent`),
       * emitted alongside `layer:select` whenever a user clicks a row
       * in the Layers panel via plain/modifier click (#192 Phase 5).
       * Hosts that need to recompute `selection.primary` deterministic-
       * ally — e.g. via `applyClickToSelection` — listen for this
       * variant; hosts that only care about the resulting feature-id
       * set can continue to use `layer:select`.
       */
      type: 'layer:selectEvent';
      payload: { target: string; modifier: boolean; shift: boolean };
    }
  | { type: 'layer:format'; payload: { featureIds: string[]; property: string; value: string | number | boolean; isPointOverride?: boolean; positionIndex?: number; childType?: string } }
  | { type: 'file:action'; payload: { file: AssociatedFile; action: 'open' | 'openWith' | 'reveal' | 'delete' } }
  | PropertiesCommitMessage;

/**
 * Props for the ActivityPanel component.
 */
export interface ActivityPanelProps {
  // TimeController section
  /** Time range [start, end] in milliseconds since epoch */
  timeExtent?: [number, number] | null;
  /** Current time position */
  currentTime?: number;
  /** Current playback state — widened to the canonical three-state vocabulary in Feature 205 */
  playbackState?: PlaybackState;
  /** Playback speed multiplier */
  playbackSpeed?: 1 | 2 | 4 | 8 | 16 | 32 | 64;
  /** Track display mode */
  displayMode?: DisplayMode;
  /** UI state for time controller */
  timeUiState?: 'empty' | 'loading' | 'ready';

  // Tools section
  /** List of available tools */
  tools?: ToolsPanelItem[];
  /** Whether the tool inventory has been loaded */
  hasToolInventory?: boolean;
  /** Whether features are currently selected */
  hasToolSelection?: boolean;

  // Layers section (uses existing LayersToolbar + FeatureList props)
  /** Features to display in the layers list */
  features?: DebriefFeature[];
  /** IDs of selected features */
  selectedFeatureIds?: string[];
  /** IDs of hidden features */
  hiddenIds?: Set<string>;
  /** Tool match results for features */
  toolMatches?: MatchResult[];
  /** Source files for Associated Files dropdown */
  sourceFiles?: AssociatedFile[];
  /** Result files for Associated Files dropdown */
  resultFiles?: AssociatedFile[];
  /** Whether new results were added (shows halo on attachments button) */
  resultsChanged?: boolean;

  // Collapse state
  /** Current collapse state for all sections */
  collapseState?: ActivityPanelCollapseState;
  /** Callback when collapse state changes */
  onCollapseStateChange?: (state: ActivityPanelCollapseState) => void;

  // Properties section (T042-T045)
  /** Fields to render in the Properties section. Hydrated host-side from item.properties + JSON Schema. */
  propertiesFields?: PropertiesFormField[];
  /** True while the open plot's item.json / schema is still loading. */
  propertiesLoading?: boolean;
  /** True when the item.json is on a read-only filesystem. */
  propertiesReadOnly?: boolean;
  /** Last write error to surface as a banner above the Properties form. Cleared on next successful commit. */
  propertiesWriteError?: string | null;
  /** Absolute path to the STAC store root for the open plot — used when emitting commit messages. */
  openItemStorePath?: string;
  /** Relative path (from storePath) to the item.json for the open plot. */
  openItemPath?: string;

  // Spec 192 — Properties Panel mode dispatcher (Phase 2, T019/T025).
  /**
   * The current feature selection. Used to drive `resolveEditingMode`, which
   * decides whether the Properties pane renders the plot form (default), the
   * feature editor, the sub-feature editor, or the multi-select summary.
   * When omitted the panel falls back to plot mode (zero regression to #447).
   */
  selection?: {
    featureIds: string[];
    primary: string | null;
  };
  /** True iff the plot slice's `isReadOnly` selector returns true. */
  isPlotReadOnly?: boolean;
  /** Human-readable reason from the plot slice's `readOnlyReason` selector. */
  plotReadOnlyReason?: string | null;
  /**
   * Writer surface used by the integrated save path (Spec 192 T025). When
   * absent the dispatcher omits the save action wiring; the existing
   * direct-write `onCommitField` path remains in place for plot mode.
   */
  onSavePropertiesPanel?: SaveWriter;
  /**
   * Provenance appender invoked once per affected feature on successful
   * save. Required when `onSavePropertiesPanel` is provided.
   */
  appendPropertiesPanelProvenance?: AppendProvenanceFn;
  /**
   * Package version pin embedded in the provenance entry's `method` field
   * (e.g. `properties-panel@1.0.0`). Defaults to `'0.0.0'`.
   */
  propertiesPanelPackageVersion?: string;
  /**
   * Notified when a staged-edits save completes (success or failure). Host
   * surfaces the result as an info banner / dirty indicator. Optional.
   */
  onPropertiesPanelSaveResult?: (result: SaveStagedEditsResult) => void;

  // Message callback for host communication
  /** Callback for messages sent to the host */
  onMessage?: (message: ActivityPanelMessage) => void;

  /** CSS class name */
  className?: string;
}
