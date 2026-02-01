/**
 * Message contracts for the Unified Activity Panel webview.
 *
 * Messages flow between the VS Code extension host (activityPanelView.ts)
 * and the webview (activityPanel.tsx) via postMessage.
 */

// ─── Webview → Extension Host ────────────────────────────────────────────────

/** Webview signals it is ready to receive messages */
export interface WebviewReadyMessage {
  type: 'webviewReady';
}

// Time Controller messages (existing, carried forward)
export interface TimeChangeMessage {
  type: 'timeChange';
  time: number;
}

export interface PlaybackStateChangeMessage {
  type: 'playbackStateChange';
  state: 'playing' | 'paused';
}

export interface DisplayModeChangeMessage {
  type: 'displayModeChange';
  mode: 'full' | 'trail';
}

// Tools messages
export interface ExecuteToolMessage {
  type: 'executeTool';
  toolId: string;
}

// Layers messages
export interface ToggleVisibilityMessage {
  type: 'toggleVisibility';
  featureId: string;
  visible: boolean;
}

export interface LayerSelectionChangeMessage {
  type: 'layerSelectionChange';
  selectedIds: string[];
}

// Panel state messages
export interface SectionCollapseMessage {
  type: 'sectionCollapse';
  sectionId: 'timeController' | 'tools' | 'layers';
  collapsed: boolean;
}

export type WebviewToHostMessage =
  | WebviewReadyMessage
  | TimeChangeMessage
  | PlaybackStateChangeMessage
  | DisplayModeChangeMessage
  | ExecuteToolMessage
  | ToggleVisibilityMessage
  | LayerSelectionChangeMessage
  | SectionCollapseMessage;

// ─── Extension Host → Webview ────────────────────────────────────────────────

// Time Controller updates
export interface UpdateTimeExtentMessage {
  type: 'updateTimeExtent';
  start: number;
  end: number;
}

export interface SetCurrentTimeMessage {
  type: 'setCurrentTime';
  time: number;
}

export interface SetTimeUIStateMessage {
  type: 'setTimeUIState';
  speed: number;
  displayMode: 'full' | 'trail';
  isPlaying: boolean;
}

// Tools updates
export interface UpdateToolMatchesMessage {
  type: 'updateToolMatches';
  tools: ToolItemContract[];
  hasSelection: boolean;
  selectionSummary: string;
}

export interface ToolItemContract {
  id: string;
  name: string;
  description: string;
  active: boolean;
  explanation: string;
  icon: string;
}

export interface ToolExecutionResultMessage {
  type: 'toolExecutionResult';
  toolId: string;
  success: boolean;
  error?: string;
}

// Layers updates
export interface UpdateFeaturesMessage {
  type: 'updateFeatures';
  features: FeatureItemContract[];
}

export interface FeatureItemContract {
  id: string;
  name: string;
  kind: string;
  visible: boolean;
  selected: boolean;
}

export interface UpdateLayerSelectionMessage {
  type: 'updateLayerSelection';
  selectedIds: string[];
}

// Panel state restore
export interface RestoreCollapseStateMessage {
  type: 'restoreCollapseState';
  collapsedSections: {
    timeController: boolean;
    tools: boolean;
    layers: boolean;
  };
}

export type HostToWebviewMessage =
  | UpdateTimeExtentMessage
  | SetCurrentTimeMessage
  | SetTimeUIStateMessage
  | UpdateToolMatchesMessage
  | ToolExecutionResultMessage
  | UpdateFeaturesMessage
  | UpdateLayerSelectionMessage
  | RestoreCollapseStateMessage;
