/**
 * Tool Execution Commands - Execute and cancel analysis tools
 *
 * Feature: 038-context-tool-vscode, 041-tool-results-architecture
 * - Uses ToolMatchAdapter to get selected feature IDs
 * - Adds provenance metadata to result layers (FR-024)
 * - Shows notifications for success/failure (FR-015)
 * - Auto-persists addition results to STAC (#041)
 */

import * as vscode from 'vscode';
import type { CalcService } from '../services/calcService';
import type { StacService } from '../services/stacService';
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { MapPanel } from '../webview/mapPanel';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';
import type { ActivityPanelViewProvider } from '../views/activityPanelView';
import type { LogService, InputFeatureState, ResultIdRegistry } from '@debrief/session-state';
import type { LogPanelViewProvider } from '../views/logPanelView';
import type { ToolParameter } from '../types/tool';
import type { DebriefFeature } from '@debrief/components';

/**
 * Known parameter type → values map.
 * Mirrors @debrief/components paramTypeResolver for use in VS Code QuickPick.
 */
const PARAM_TYPE_VALUES: Record<string, string[]> = {
  ReferencePointPattern: ['grid', 'scatter'],
  NamedColor: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'grey', 'black', 'white'],
  MarkerSymbol: ['circle', 'square', 'triangle', 'diamond', 'cross', 'star'],
  CardinalDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
};

/**
 * Collect tool parameters via VS Code QuickPick.
 * Returns collected params or undefined if the user cancelled.
 */
async function collectParameters(
  parameters: ToolParameter[],
  toolName: string,
): Promise<Record<string, unknown> | undefined> {
  const collected: Record<string, unknown> = {};

  for (const param of parameters) {
    // Resolve choices: explicit choices, or from known paramType
    const choices: string[] =
      param.choices?.map(String) ??
      (param.paramType ? PARAM_TYPE_VALUES[param.paramType] ?? [] : []);

    if (choices.length === 0) { continue; }

    const items: vscode.QuickPickItem[] = choices.map((c) => ({
      label: c.charAt(0).toUpperCase() + c.slice(1),
      description: param.defaultValue !== undefined && String(param.defaultValue) === c ? '(default)' : undefined,
      detail: undefined,
      picked: false,
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: `${toolName}: ${param.description || param.name}`,
      title: param.description || param.name,
    });

    if (!picked) { return undefined; } // user cancelled

    // Store the raw value (lowercase original)
    const rawValue = choices[items.indexOf(picked)];
    // Convert numeric strings to numbers for numeric params
    collected[param.name] = param.valueType === 'number' ? Number(rawValue) : rawValue;
  }

  return collected;
}

/**
 * Create the execute tool command
 *
 * @param calcService - CalcService for executing tools
 * @param toolMatchAdapter - ToolMatchAdapter for getting selection
 * @param getMapPanel - Function to get current MapPanel
 * @param layersTreeProvider - LayersTreeProvider for displaying results
 * @param stacService - StacService for persisting results to STAC
 * @param activityPanelProvider - ActivityPanelViewProvider for updating result files
 * @param logService - LogService for recording provenance (Feature: 071) — deprecated, prefer MapPanel getter
 * @param resultIdRegistry - ResultIdRegistry for tracking result IDs (Feature: 087)
 * @param logPanelProvider - LogPanelViewProvider for refreshing timeline after tool execution (Feature: 113)
 */
export function createExecuteToolCommand(
  calcService: CalcService,
  toolMatchAdapter: ToolMatchAdapter,
  getMapPanel: () => MapPanel | undefined,
  layersTreeProvider: LayersTreeProvider,
  stacService?: StacService,
  activityPanelProvider?: ActivityPanelViewProvider,
  logService?: LogService,
  resultIdRegistry?: ResultIdRegistry,
  logPanelProvider?: LogPanelViewProvider
): (toolIdOrMessage: string | { toolId: string; params?: Record<string, unknown> }) => Promise<void> {
  return async (toolIdOrMessage: string | { toolId: string; params?: Record<string, unknown> }) => {
    // Handle string, { toolId, params } object, and legacy { toolName } format
    let resolvedToolId: string;
    let toolParams: Record<string, unknown> | undefined;

    if (typeof toolIdOrMessage === 'string') {
      resolvedToolId = toolIdOrMessage;
    } else if (typeof toolIdOrMessage === 'object' && toolIdOrMessage !== null) {
      const msg = toolIdOrMessage as { toolId?: string; toolName?: string; params?: Record<string, unknown> };
      resolvedToolId = msg.toolId || msg.toolName || '';
      toolParams = msg.params;
    } else {
      return;
    }

    if (!resolvedToolId) {
      return;
    }

    const panel = getMapPanel();
    if (!panel) {
      void vscode.window.showWarningMessage('No plot open');
      return;
    }

    // Get selected feature IDs from ToolMatchAdapter (Feature: 038)
    const selectedFeatureIds = toolMatchAdapter.getSelectedFeatureIds();

    if (selectedFeatureIds.length === 0) {
      void vscode.window.showWarningMessage('No features selected');
      return;
    }

    // Find tool name for display
    const tools = toolMatchAdapter.getAllTools();
    const tool = tools.find((t) => t.id === resolvedToolId);
    const toolName = tool?.name ?? resolvedToolId;

    // Collect parameters if needed (Feature: 091)
    if (!toolParams && tool?.parameters && tool.parameters.length > 0) {
      const collected = await collectParameters(tool.parameters, toolName);
      if (!collected) {
        return; // user cancelled parameter collection
      }
      toolParams = collected;
    }

    // Capture pre-tool geometry for mutation tools (enables correct tune replay)
    let preToolInputState: InputFeatureState[] | undefined;
    const selectedIdSet = new Set(selectedFeatureIds);
    const allFeatures: DebriefFeature[] = panel.getFeatures();
    const preToolFeatures: DebriefFeature[] = allFeatures.filter(
      (f: DebriefFeature) => selectedIdSet.has(String(f.id))
    );
    if (preToolFeatures.length > 0) {
      preToolInputState = preToolFeatures.map((f: DebriefFeature) => {
        // Deep-copy geometry and properties (minus provenance) for input state snapshot.
        const { provenance: _p, ...restProps } = structuredClone(f.properties);
        const state: InputFeatureState = {
          featureId: String(f.id),
          geometry: structuredClone(f.geometry),
          properties: restProps,
        };
        return state;
      });
    }

    // Execute tool with progress (FR-015)
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Running ${toolName}...`,
        cancellable: true,
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => {
          calcService.cancelExecution();
        });

        return calcService.executeTool({
          toolId: resolvedToolId,
          featureIds: selectedFeatureIds,
          ...(toolParams ? { params: toolParams } : {}),
        });
      }
    );

    if (!result.success) {
      void vscode.window.showErrorMessage(
        `Tool execution failed: ${result.error ?? 'Unknown error'}`
      );
      return;
    }

    // Create result layer with provenance (FR-024)
    const execution = calcService.getCurrentExecution();
    const layer = calcService.createResultLayer(
      resolvedToolId,
      execution?.id ?? `exec-${Date.now()}`,
      result,
      selectedFeatureIds
    );

    if (layer) {
      const isMutationResult = result.resultType?.startsWith('mutation/');

      if (isMutationResult && !layer.artifactHref) {
        // Mutation tools: update the original plot features in-place
        // rather than adding a duplicate result layer.
        panel.updatePlotFeatures(layer);

        // Persist mutated features to disk so Python provenance (with full
        // parameter metadata including tunable flags) is stored alongside
        // the updated geometry. Without this, only in-memory state would
        // reflect the mutation, and recordToolResult would write provenance
        // entries with empty parameters.
        if (stacService) {
          try {
            const store = panel.getCurrentStore?.();
            const plot = panel.getCurrentPlot?.();
            if (store?.path && plot?.itemPath) {
              const fc = await stacService.loadGeoJsonForItem(store.path, plot.itemPath);
              if (fc) {
                const fid = (f: { id?: unknown; properties?: Record<string, unknown> | null }): string =>
                  String(f.id ?? f.properties?.['id'] ?? '');
                const updatedMap = new Map(
                  layer.features.features.map((f) => [fid(f), f])
                );
                fc.features = fc.features.map((f) => {
                  const id = fid(f);
                  const updated = updatedMap.get(id);
                  return updated ?? f;
                });
                await stacService.writeGeoJson(store.path, plot.itemPath, fc);
              }
            }
          } catch (persistErr) {
            console.warn('[debrief] Failed to persist mutation to STAC:', persistErr);
          }
        }
      } else {
        // Additive tools or artifacts: add as result layer
        panel.addResultLayer(layer);
      }

      // Update layers panel (additive results only — mutations
      // don't create new layers, they modify existing ones)
      if (!isMutationResult) {
        layersTreeProvider.addResultLayer(layer);
      }

      // Auto-persist artifact results to STAC
      if (stacService && result.artifactData && result.artifactHref) {
        try {
          const store = panel.getCurrentStore?.();
          const plot = panel.getCurrentPlot?.();
          if (store?.path && plot?.itemPath) {
            await stacService.addResultAsset(
              store.path,
              plot.itemPath,
              result.artifactHref,
              result.artifactData,
              'application/json',
              {
                'debrief:toolId': resolvedToolId,
                'debrief:sourceFeatures': selectedFeatureIds,
              }
            );

            // Notify activity panel of new result file
            activityPanelProvider?.addResultFile(
              layer.name,
              `assets/${result.artifactHref}`
            );
          }
        } catch (persistErr) {
          console.warn('[debrief] Failed to persist artifact to STAC:', persistErr);
        }
      }

      // Auto-persist non-mutation feature results to STAC (#041)
      // All additive/reference/etc. results must be on disk so that
      // the tune replay cycle (cleanup → re-execute → write) works.
      if (stacService && !result.artifactData && !isMutationResult) {
        try {
          const store = panel.getCurrentStore?.();
          const plot = panel.getCurrentPlot?.();
          if (store?.path && plot?.itemPath) {
            await stacService.addFeatures(
              store.path,
              plot.itemPath,
              layer.features.features
            );
          }
        } catch (persistErr) {
          console.warn('[debrief] Failed to persist result to STAC:', persistErr);
        }
      }

      // Record provenance via Log Service (Feature: 071)
      // Resolve logService dynamically: prefer MapPanel's logService (set per-plot),
      // fall back to the static logService parameter (legacy path).
      const resolvedLogService = panel.getLogService?.() ?? logService;
      if (!resolvedLogService) {
        console.warn('[debrief] executeTool: logService not available — provenance will not be recorded. Was the plot opened correctly?');
      }
      if (resolvedLogService && stacService) {
        try {
          const store = panel.getCurrentStore?.();
          const plot = panel.getCurrentPlot?.();
          if (store?.path && plot?.itemPath) {
            // Include pre-tool inputState for mutation tools
            const isMutation = result.resultType?.startsWith('mutation/');
            const recordResult = await resolvedLogService.recordToolResult(
              {
                success: true,
                features: result.features,
                durationMs: result.durationMs,
                resultType: result.resultType,
                sourceFeatureIds: result.sourceFeatureIds ?? selectedFeatureIds,
                artifactHref: result.artifactHref,
                toolId: resolvedToolId,
                ...(isMutation && preToolInputState ? { inputState: preToolInputState } : {}),
              },
              result.toolVersion || result.parameters ? {
                toolVersion: result.toolVersion,
                modifiedFeatures: result.modifiedFeatures,
                createdFeatures: result.createdFeatures,
                createdAssets: result.createdAssets,
                parameters: result.parameters,
              } : undefined,
              store.path,
              plot.itemPath
            );

            // Update Result ID Registry from recorded entries (Feature: 087)
            if (resultIdRegistry) {
              resultIdRegistry.registerFromRecordResult(recordResult);
            }

            // Refresh Log Panel timeline to show the new entry (Feature: 113)
            if (logPanelProvider) {
              void logPanelProvider.refreshTimeline();
            }
          }
        } catch (logErr) {
          console.warn('[debrief] Failed to record provenance:', logErr);
        }
      }

      // Success notification (FR-015)
      void vscode.window.showInformationMessage(
        `Analysis complete: ${layer.name}`
      );
    }
  };
}

/**
 * Create the cancel tool execution command
 */
export function createCancelToolExecutionCommand(
  calcService: CalcService
): (args: { executionId: string }) => void {
  return (_args: { executionId: string }) => {
    calcService.cancelExecution();
  };
}

/**
 * Create the show tool requirements command (FR-011)
 *
 * Shows why a tool is inactive in a notification.
 */
export function createShowToolRequirementsCommand(): (toolId: string, explanation: string) => void {
  return (toolId: string, explanation: string) => {
    void vscode.window.showInformationMessage(
      `Tool "${toolId}" is inactive: ${explanation ?? 'Selection does not match requirements'}`
    );
  };
}

/**
 * Create the toggle inactive tools command (FR-010)
 */
export function createToggleInactiveToolsCommand(
  toolsTreeProvider: { toggleShowInactiveTools: () => void; getShowInactiveTools: () => boolean }
): () => void {
  return () => {
    toolsTreeProvider.toggleShowInactiveTools();
    const showInactive = toolsTreeProvider.getShowInactiveTools();
    void vscode.window.showInformationMessage(
      showInactive ? 'Showing inactive tools' : 'Hiding inactive tools'
    );
  };
}
