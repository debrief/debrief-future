/**
 * Typed message protocol for the Unified Activity Panel webview.
 *
 * Host → Webview: state updates pushed when SessionManager state changes.
 * Webview → Host: user actions requesting state mutations.
 */

// ── Host → Webview ──────────────────────────────────────────────

export interface TemporalUpdateMessage {
  type: 'temporal:update';
  payload: {
    currentTime: number;
    startTime: number;
    endTime: number;
    rate: number;
    playing: boolean;
  };
}

export interface ToolsUpdateMessage {
  type: 'tools:update';
  payload: {
    tools: ToolMatch[];
  };
}

export interface LayersUpdateMessage {
  type: 'layers:update';
  payload: {
    layers: LayerItem[];
  };
}

export interface SelectionUpdateMessage {
  type: 'selection:update';
  payload: {
    selectedIds: string[];
  };
}

export type HostToWebviewMessage =
  | TemporalUpdateMessage
  | ToolsUpdateMessage
  | LayersUpdateMessage
  | SelectionUpdateMessage;

// ── Webview → Host ──────────────────────────────────────────────

export interface TemporalSeekMessage {
  type: 'temporal:seek';
  payload: { time: number };
}

export interface TemporalPlayMessage {
  type: 'temporal:play';
  payload: { rate: number };
}

export interface ToolRunMessage {
  type: 'tool:run';
  payload: { toolId: string };
}

export interface LayerToggleVisibilityMessage {
  type: 'layer:toggleVisibility';
  payload: { layerId: string };
}

export type WebviewToHostMessage =
  | TemporalSeekMessage
  | TemporalPlayMessage
  | ToolRunMessage
  | LayerToggleVisibilityMessage;

// ── Shared Entities ─────────────────────────────────────────────

export interface ToolMatch {
  id: string;
  name: string;
  description: string;
  applicable: boolean;
}

export type LayerType = 'track' | 'reference' | 'shape' | 'result';

export interface LayerItem {
  id: string;
  label: string;
  type: LayerType;
  visible: boolean;
  children: LayerItem[];
}

// ── Panel State (persisted via vscode.setState) ─────────────────

export interface ActivityPanelState {
  timeControllerCollapsed: boolean;
  toolsCollapsed: boolean;
  layersCollapsed: boolean;
}

export const DEFAULT_PANEL_STATE: ActivityPanelState = {
  timeControllerCollapsed: false,
  toolsCollapsed: false,
  layersCollapsed: false,
};
