/**
 * ActivityPanel Webview Entry Point
 *
 * This React component wraps the ActivityPanel from @debrief/components
 * and handles communication with the VS Code extension.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ActivityPanel } from '@debrief/components';
import { Bootstrap } from './_bootstrap';
import { StoryboardPanelApp } from './storyboardPanelApp';

// Import codicon font CSS for vscrui icons (esbuild loads as text string)
import codiconCss from 'vscrui/dist/codicon.css';

// Inject codicon CSS into the document
const codiconStyle = document.createElement('style');
codiconStyle.textContent = codiconCss;
document.head.appendChild(codiconStyle);
import type {
  ActivityPanelCollapseState,
  ActivityPanelMessage,
  ToolsPanelItem,
  AssociatedFile,
} from '@debrief/components';
import type { DebriefFeature } from '@debrief/components';
import type { MatchResult } from '@debrief/components';
import type { ToolsUpdateMessage as ToolsUpdateMessageSchema } from '@debrief/schemas';

// VS Code API type
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): ActivityPanelWebviewState | undefined;
  setState(state: ActivityPanelWebviewState): void;
};

// Webview state persisted across reloads
interface ActivityPanelWebviewState {
  collapseState?: ActivityPanelCollapseState;
}

// Messages from extension to webview
interface TemporalUpdateMessage {
  type: 'temporal:update';
  payload: {
    startTime: number;
    endTime: number;
    currentTime?: number;
    playbackSpeed?: 1 | 2 | 4 | 8 | 16 | 32 | 64;
    displayMode?: 'full' | 'trail';
  };
}

/**
 * Schema-rooted on `ToolsUpdateMessage` from `@debrief/schemas` (LinkML
 * `mcp.yaml`) and narrowed with the concrete payload shape used by the
 * activity panel. The schema base contributes the `type: 'tools:update'`
 * literal discriminator; this projection materialises the live payload
 * shape. Per FR-004 the audit treats this file as schema-rooted.
 */
type ToolsUpdateMessage = Omit<ToolsUpdateMessageSchema, 'payload'> & {
  payload: {
    tools: ToolsPanelItem[];
    hasToolInventory?: boolean;
    hasSelection?: boolean;
  };
};

interface LayersUpdateMessage {
  type: 'layers:update';
  payload: {
    layers: DebriefFeature[];
    hiddenIds?: string[];
    toolMatches?: MatchResult[];
    sourceFiles?: AssociatedFile[];
    resultFiles?: AssociatedFile[];
    resultsChanged?: boolean;
  };
}

interface SelectionUpdateMessage {
  type: 'selection:update';
  payload: {
    selectedIds: string[];
  };
}

interface SetUIStateMessage {
  type: 'setUIState';
  uiState: 'empty' | 'loading' | 'ready';
}

type ExtensionMessage =
  | TemporalUpdateMessage
  | ToolsUpdateMessage
  | LayersUpdateMessage
  | SelectionUpdateMessage
  | SetUIStateMessage;

// VS Code API instance
const vscode = acquireVsCodeApi();

/**
 * ActivityPanel Webview App
 */
function ActivityPanelApp(): React.ReactElement {
  // State for each section
  const [timeExtent, setTimeExtent] = useState<[number, number] | null>(null);
  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4 | 8 | 16 | 32 | 64 | undefined>(
    undefined
  );
  const [displayMode, setDisplayMode] = useState<'full' | 'trail' | undefined>(undefined);
  const [timeUiState, setTimeUiState] = useState<'empty' | 'loading' | 'ready'>('empty');
  const [tools, setTools] = useState<ToolsPanelItem[]>([]);
  const [hasToolInventory, setHasToolInventory] = useState<boolean | undefined>(undefined);
  const [hasSelection, setHasSelection] = useState(false);
  const [features, setFeatures] = useState<DebriefFeature[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [toolMatches, setToolMatches] = useState<MatchResult[]>([]);
  const [sourceFiles, setSourceFiles] = useState<AssociatedFile[]>([]);
  const [resultFiles, setResultFiles] = useState<AssociatedFile[]>([]);
  const [resultsChanged, setResultsChanged] = useState(false);

  // Collapse state from vscode.getState
  const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>(() => {
    const saved = vscode.getState();
    return (
      saved?.collapseState ?? {
        timeControllerCollapsed: false,
        toolsCollapsed: false,
        layersCollapsed: false,
      }
    );
  });

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'temporal:update':
          setTimeExtent([msg.payload.startTime, msg.payload.endTime]);
          if (msg.payload.currentTime !== undefined) {
            setCurrentTime(msg.payload.currentTime);
          }
          if (msg.payload.playbackSpeed !== undefined) {
            setPlaybackSpeed(msg.payload.playbackSpeed);
          }
          if (msg.payload.displayMode !== undefined) {
            setDisplayMode(msg.payload.displayMode);
          }
          setTimeUiState('ready');
          break;

        case 'tools:update':
          setTools(msg.payload.tools);
          if (msg.payload.hasToolInventory !== undefined) {
            setHasToolInventory(msg.payload.hasToolInventory);
          }
          if (msg.payload.hasSelection !== undefined) {
            setHasSelection(msg.payload.hasSelection);
          }
          break;

        case 'layers:update':
          setFeatures(msg.payload.layers);
          if (msg.payload.hiddenIds) {
            setHiddenIds(new Set(msg.payload.hiddenIds));
          }
          if (msg.payload.toolMatches) {
            setToolMatches(msg.payload.toolMatches);
          }
          if (msg.payload.sourceFiles) {
            setSourceFiles(msg.payload.sourceFiles);
          }
          if (msg.payload.resultFiles) {
            setResultFiles(msg.payload.resultFiles);
          }
          if (msg.payload.resultsChanged !== undefined) {
            setResultsChanged(msg.payload.resultsChanged);
          }
          break;

        case 'selection:update':
          setSelectedIds(msg.payload.selectedIds);
          break;

        case 'setUIState':
          setTimeUiState(msg.uiState);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCollapseChange = useCallback((state: ActivityPanelCollapseState) => {
    setCollapseState(state);
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, collapseState: state });
  }, []);

  const handleMessage = useCallback((message: ActivityPanelMessage) => {
    vscode.postMessage(message);
  }, []);

  return (
    <div className="activity-panel-webview">
      <ActivityPanel
        timeExtent={timeExtent}
        currentTime={currentTime}
        playbackSpeed={playbackSpeed}
        displayMode={displayMode}
        timeUiState={timeUiState}
        tools={tools}
        hasToolInventory={hasToolInventory}
        hasToolSelection={hasSelection}
        features={features}
        selectedFeatureIds={selectedIds}
        hiddenIds={hiddenIds}
        toolMatches={toolMatches}
        sourceFiles={sourceFiles}
        resultFiles={resultFiles}
        resultsChanged={resultsChanged}
        collapseState={collapseState}
        onCollapseStateChange={handleCollapseChange}
        onMessage={handleMessage}
        storyboardSlot={<StoryboardPanelApp vscode={vscode} />}
      />
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Bootstrap>
        <ActivityPanelApp />
      </Bootstrap>
    </React.StrictMode>
  );
}

// Notify extension that webview is ready
vscode.postMessage({ type: 'webviewReady' });
