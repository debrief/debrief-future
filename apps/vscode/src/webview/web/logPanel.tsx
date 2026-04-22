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
 * Updated: 176-log-panel-ux (unified ViewMode)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LogPanel, LOG_DEFAULT_FILTER_STATE } from '@debrief/components';
import type {
  TimelineEntry,
  ViewMode,
  LogFilterState,
  LogPanelMessage,
  ParameterSchemaEntry,
} from '@debrief/components';
// Shared message contract — single source of truth for both extension and webview.
import type {
  ExtensionMessage,
  ReplayProgressPayload,
  ToolCategoryMap,
} from '../logPanelMessages';
import { postWebviewMessage } from '../logPanelMessages';

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

  // UI state — unified ViewMode (Feature 176)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = vscode.getState();
    return saved?.viewMode ?? 'timeline';
  });
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<LogFilterState>(LOG_DEFAULT_FILTER_STATE);
  const [actionResultMessage, setActionResultMessage] = useState<string | null>(null);

  // Phase 6: Replay state
  const [replayProgress, setReplayProgress] = useState<ReplayProgressPayload | null>(null);

  // Feature 207: tool-manifest map for icon category resolution.
  // `undefined` = not yet received (render with grey fallback); once a
  // `tools:manifest` message arrives this becomes a live map and the
  // Log Panel re-renders with correct colours.
  const [toolCategories, setToolCategories] = useState<ToolCategoryMap | undefined>(
    undefined,
  );

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
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
          setViewMode(msg.payload.viewMode as ViewMode);
          break;

        // Feature 207: tool-manifest push (icon categories)
        case 'tools:manifest':
          setToolCategories(msg.payload.categories);
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
              `Replay completed: ${result.entries_replayed} operations replayed.`
            );
          } else if (result.status === 'halted' && result.halt_reason) {
            setActionResultMessage(
              `Replay halted at "${result.halt_reason.tool_id}": ${result.halt_reason.message}`
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
    postWebviewMessage(vscode, message);
  }, []);

  // Handle view mode change → persist in webview state + notify extension
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, viewMode: mode });
    // Notify extension for globalState persistence
    postWebviewMessage(vscode, { type: 'mode:change', payload: { viewMode: mode } });
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
      // Optimistic update: immediately reflect the new value in local state.
      // ParameterValue.value is `string` per the LinkML schema (wire format),
      // so coerce here to keep the local state type-correct.
      setEntries((prev) =>
        prev.map((e) => {
          if (e.activity_id !== activityId) return e;
          const paramEntry = e.parameters[parameter];
          if (!paramEntry) return e;
          return {
            ...e,
            parameters: {
              ...e.parameters,
              [parameter]: { ...paramEntry, value: String(newValue) },
            },
          };
        })
      );

      // Debounce the actual replay request
      if (tuneTimerRef.current) clearTimeout(tuneTimerRef.current);
      tuneTimerRef.current = setTimeout(() => {
        tuneTimerRef.current = null;
        postWebviewMessage(vscode, {
          type: 'tune:request',
          payload: { activity_id: activityId, parameter, new_value: newValue },
        });
      }, 400);
    },
    []
  );

  const handleRevertToRequest = useCallback((activityId: string) => {
    postWebviewMessage(vscode, {
      type: 'revert-to:request',
      payload: { activity_id: activityId },
    });
  }, []);

  const handleRevertThisRequest = useCallback((activityId: string) => {
    postWebviewMessage(vscode, {
      type: 'revert-this:request',
      payload: { activity_id: activityId },
    });
  }, []);

  const handleRestoreRequest = useCallback((activityId: string) => {
    postWebviewMessage(vscode, {
      type: 'restore:request',
      payload: { activity_id: activityId },
    });
  }, []);

  const handleReplayCancel = useCallback(() => {
    postWebviewMessage(vscode, { type: 'replay:cancel' });
  }, []);

  // Feature 113: Schema resolution via extension host round-trip.
  const pendingSchemaRef = useRef(new Map<string, {
    resolve: (schema: ReadonlyArray<ParameterSchemaEntry>) => void;
  }>());

  const handleSchemaRequest = useCallback(
    (toolId: string): Promise<ReadonlyArray<ParameterSchemaEntry>> => {
      return new Promise<ReadonlyArray<ParameterSchemaEntry>>((resolve) => {
        pendingSchemaRef.current.set(toolId, { resolve });
        postWebviewMessage(vscode, { type: 'schema:request', payload: { toolId } });

        // Timeout fallback: derive from local parameter metadata after 2s
        setTimeout(() => {
          if (!pendingSchemaRef.current.has(toolId)) return;
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
    postWebviewMessage(vscode, {
      type: 'disable:toggle',
      payload: { activity_id: activityId, disabled },
    });
  }, []);

  // Feature 113: rationale update → forward to extension
  const handleRationaleUpdate = useCallback((activityId: string, rationale: string) => {
    postWebviewMessage(vscode, {
      type: 'rationale:update',
      payload: { activity_id: activityId, rationale },
    });
  }, []);

  return (
    <LogPanel
      entries={entries}
      featureNames={featureNames}
      viewMode={viewMode}
      selectedEntryId={selectedEntryId}
      filterState={filterState}
      hasActiveSession={hasActiveSession}
      plotName={plotName}
      actionResultMessage={actionResultMessage}
      replayProgress={replayProgress}
      toolCategories={toolCategories}
      onMessage={handleMessage}
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
postWebviewMessage(vscode, { type: 'webviewReady' });
