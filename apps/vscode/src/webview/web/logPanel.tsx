/**
 * LogPanel Webview Entry Point
 *
 * Bridges VS Code webview API to the LogPanel React component.
 * Handles message passing between extension host and React component.
 * Phase 6: Adds tune/revert/replay message forwarding.
 * Feature 113: Adds schema cache, disable/rationale handlers.
 *
 * Feature: 072-log-panel (E02, Phase 2)
 * Updated: 076-replay-tune (E02, Phase 6)
 * Updated: 113-prov-card-flip (flip-card edit wiring)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LogPanel, LOG_DEFAULT_FILTER_STATE } from '@debrief/components';
import type {
  TimelineEntry,
  PresentationMode,
  ViewMode,
  LogFilterState,
  LogPanelMessage,
  ExtensionToWebviewMessage,
  ParameterSchemaEntry,
} from '@debrief/components';

// Phase 6 message types from the extension
interface ReplayProgressPayload {
  current: number;
  total: number;
  currentToolId: string;
  phase: string;
}

interface ReplayResultPayload {
  status: 'completed' | 'halted' | 'cancelled';
  entriesReplayed: number;
  totalEntries: number;
  haltReason: { type: string; toolId: string; message: string } | null;
}

// Extended message type to include Phase 6 + Feature 113 messages
type ExtendedExtensionMessage =
  | ExtensionToWebviewMessage
  | { type: 'replay:progress'; payload: ReplayProgressPayload }
  | { type: 'replay:result'; payload: ReplayResultPayload }
  | { type: 'replay:error'; payload: { message: string } }
  | { type: 'schema:response'; payload: { toolId: string; schema: unknown[]; error: string | null } };

// VS Code API type
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): LogPanelWebviewState | undefined;
  setState(state: LogPanelWebviewState): void;
};

// Webview state persisted across reloads
interface LogPanelWebviewState {
  viewMode?: ViewMode;
}

// VS Code API instance
const vscode = acquireVsCodeApi();

/**
 * LogPanel Webview App
 */
function LogPanelApp(): React.ReactElement {
  // Timeline data
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});

  // Session state
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [plotName, setPlotName] = useState<string | null>(null);

  // UI state
  const [presentationMode, setPresentationMode] = useState<PresentationMode>('normal');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = vscode.getState();
    return saved?.viewMode ?? 'timeline';
  });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<LogFilterState>(LOG_DEFAULT_FILTER_STATE);
  const [actionResultMessage, setActionResultMessage] = useState<string | null>(null);

  // Phase 6: Replay state
  const [replayProgress, setReplayProgress] = useState<ReplayProgressPayload | null>(null);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtendedExtensionMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'timeline:update':
          setEntries(msg.payload.entries);
          setFeatureNames(msg.payload.featureNames);
          break;

        case 'session:change':
          setHasActiveSession(msg.payload.hasActiveSession);
          setPlotName(msg.payload.plotName);
          if (!msg.payload.hasActiveSession) {
            setEntries([]);
            setFeatureNames({});
            setSelectedEntryId(null);
          }
          break;

        case 'selection:update':
          break;

        case 'action:result':
          setActionResultMessage(msg.payload.message);
          setTimeout(() => setActionResultMessage(null), 3000);
          break;

        case 'mode:init':
          setPresentationMode(msg.payload.presentationMode);
          break;

        // Phase 6: replay messages
        case 'replay:progress':
          setReplayProgress(msg.payload);
          break;

        case 'replay:result': {
          setReplayProgress(null);
          const result = msg.payload;
          if (result.status === 'completed') {
            setActionResultMessage(
              `Replay completed: ${result.entriesReplayed} operations replayed.`
            );
          } else if (result.status === 'halted' && result.haltReason) {
            setActionResultMessage(
              `Replay halted at "${result.haltReason.toolId}": ${result.haltReason.message}`
            );
          } else if (result.status === 'cancelled') {
            setActionResultMessage('Replay cancelled. Previous state restored.');
          }
          setTimeout(() => setActionResultMessage(null), 5000);
          break;
        }

        case 'replay:error':
          setReplayProgress(null);
          setActionResultMessage(msg.payload.message);
          setTimeout(() => setActionResultMessage(null), 5000);
          break;

        case 'schema:response': {
          const { toolId: schemaToolId, schema: rawSchema, error: schemaErr } = msg.payload;
          const pending = pendingSchemaRef.current.get(schemaToolId);
          if (pending) {
            pendingSchemaRef.current.delete(schemaToolId);
            if (schemaErr || !rawSchema || (rawSchema as unknown[]).length === 0) {
              // Extension returned empty/error — fall back to local derivation
              const entry = entries.find((e) => e.toolName === schemaToolId);
              const fallback: ParameterSchemaEntry[] = [];
              if (entry) {
                for (const [name, param] of Object.entries(entry.parameters)) {
                  const isNum = typeof param.value === 'number';
                  fallback.push({
                    name,
                    type: isNum ? 'number' : 'string',
                    description: null,
                    tunable: param.tunable !== false,
                    defaultValue: param.default ? param.value : null,
                    minimum: null,
                    maximum: null,
                    step: isNum ? 1 : null,
                    choices: null,
                    paramType: null,
                  });
                }
              }
              pending.resolve(fallback);
            } else {
              // Merge extension schema with local parameter tunability/values
              const entry = entries.find((e) => e.toolName === schemaToolId);
              const merged = (rawSchema as ParameterSchemaEntry[]).map((s) => {
                const paramVal = entry?.parameters[s.name];
                return {
                  ...s,
                  tunable: paramVal ? paramVal.tunable !== false : s.tunable,
                };
              });
              pending.resolve(merged);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle messages from LogPanel component → forward to extension
  const handleMessage = useCallback((message: LogPanelMessage) => {
    vscode.postMessage(message);
  }, []);

  // Handle presentation mode change → forward to extension for persistence
  const handlePresentationModeChange = useCallback((mode: PresentationMode) => {
    setPresentationMode(mode);
    vscode.postMessage({ type: 'mode:change', payload: { presentationMode: mode } });
  }, []);

  // Handle view mode change → persist in webview state
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, viewMode: mode });
  }, []);

  // Handle entry selection
  const handleSelectedEntryChange = useCallback((entryId: string | null) => {
    setSelectedEntryId(entryId);
  }, []);

  // Phase 6: tune/revert handlers → send dedicated messages to extension.
  // Optimistic local update so the slider responds instantly during drag.
  // Debounced (400ms) so rapid slider drags only trigger one replay.
  const tuneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTuneRequest = useCallback(
    (activityId: string, parameter: string, newValue: unknown) => {
      // Optimistic update: immediately reflect the new value in local state
      // so the slider doesn't snap back while waiting for the replay round-trip.
      setEntries((prev) =>
        prev.map((e) => {
          if (e.activityId !== activityId) return e;
          const paramEntry = e.parameters[parameter];
          if (!paramEntry) return e;
          return {
            ...e,
            parameters: {
              ...e.parameters,
              [parameter]: { ...paramEntry, value: newValue },
            },
          };
        })
      );

      // Debounce the actual replay request
      if (tuneTimerRef.current) clearTimeout(tuneTimerRef.current);
      tuneTimerRef.current = setTimeout(() => {
        tuneTimerRef.current = null;
        vscode.postMessage({
          type: 'tune:request',
          payload: { activityId, parameter, newValue },
        });
      }, 400);
    },
    []
  );

  const handleRevertToRequest = useCallback((activityId: string) => {
    vscode.postMessage({
      type: 'revert-to:request',
      payload: { activityId },
    });
  }, []);

  const handleRevertThisRequest = useCallback((activityId: string) => {
    vscode.postMessage({
      type: 'revert-this:request',
      payload: { activityId },
    });
  }, []);

  const handleRestoreRequest = useCallback((activityId: string) => {
    vscode.postMessage({
      type: 'restore:request',
      payload: { activityId },
    });
  }, []);

  const handleReplayCancel = useCallback(() => {
    vscode.postMessage({ type: 'replay:cancel' });
  }, []);

  // Feature 113: Schema resolution via extension host round-trip.
  // Sends schema:request to extension, which looks up tool definitions
  // and returns ParameterSchemaEntry[] with proper choices/paramType.
  // Falls back to local parameter-based derivation if no response.
  const pendingSchemaRef = useRef(new Map<string, {
    resolve: (schema: ReadonlyArray<ParameterSchemaEntry>) => void;
  }>());

  const handleSchemaRequest = useCallback(
    (toolId: string): Promise<ReadonlyArray<ParameterSchemaEntry>> => {
      return new Promise<ReadonlyArray<ParameterSchemaEntry>>((resolve) => {
        // Store resolver for when schema:response arrives
        pendingSchemaRef.current.set(toolId, { resolve });

        // Send request to extension host
        vscode.postMessage({ type: 'schema:request', payload: { toolId } });

        // Timeout fallback: derive from local parameter metadata after 2s
        setTimeout(() => {
          if (!pendingSchemaRef.current.has(toolId)) return; // Already resolved
          pendingSchemaRef.current.delete(toolId);

          const entry = entries.find((e) => e.toolName === toolId);
          const schema: ParameterSchemaEntry[] = [];
          if (entry) {
            for (const [name, param] of Object.entries(entry.parameters)) {
              const isNum = typeof param.value === 'number';
              schema.push({
                name,
                type: isNum ? 'number' : 'string',
                description: null,
                tunable: param.tunable !== false,
                defaultValue: param.default ? param.value : null,
                minimum: null,
                maximum: null,
                step: isNum ? 1 : null,
                choices: null,
                paramType: null,
              });
            }
          }
          resolve(schema);
        }, 2000);
      });
    },
    [entries]
  );

  // Feature 113: disable toggle → forward to extension
  const handleDisableToggle = useCallback((activityId: string, disabled: boolean) => {
    vscode.postMessage({
      type: 'disable:toggle',
      payload: { activityId, disabled },
    });
  }, []);

  // Feature 113: rationale update → forward to extension
  const handleRationaleUpdate = useCallback((activityId: string, rationale: string) => {
    vscode.postMessage({
      type: 'rationale:update',
      payload: { activityId, rationale },
    });
  }, []);

  return (
    <LogPanel
      entries={entries}
      featureNames={featureNames}
      presentationMode={presentationMode}
      viewMode={viewMode}
      selectedEntryId={selectedEntryId}
      filterState={filterState}
      hasActiveSession={hasActiveSession}
      plotName={plotName}
      actionResultMessage={actionResultMessage}
      replayProgress={replayProgress}
      onMessage={handleMessage}
      onPresentationModeChange={handlePresentationModeChange}
      onViewModeChange={handleViewModeChange}
      onFilterStateChange={setFilterState}
      onSelectedEntryChange={handleSelectedEntryChange}
      onTuneRequest={handleTuneRequest}
      onRevertToRequest={handleRevertToRequest}
      onRevertThisRequest={handleRevertThisRequest}
      onRestoreRequest={handleRestoreRequest}
      onReplayCancel={handleReplayCancel}
      onSchemaRequest={handleSchemaRequest}
      onDisableToggle={handleDisableToggle}
      onRationaleUpdate={handleRationaleUpdate}
    />
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <LogPanelApp />
    </React.StrictMode>
  );
}

// Notify extension that webview is ready
vscode.postMessage({ type: 'webviewReady' });
