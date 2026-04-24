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
import type { ResultsPanelService } from '../services/resultsPanelService';
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
  logPanelProvider?: LogPanelViewProvider,
  resultsPanelService?: ResultsPanelService
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
          feature_id: String(f.id),
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
      // Surface the failure in the Results panel as an error tab (FR-019)
      // so the user can retry without re-running from the toolbar.
      if (resultsPanelService) {
        const store = panel.getCurrentStore?.();
        const plot = panel.getCurrentPlot?.();
        if (store?.path && plot?.itemPath) {
          resultsPanelService.addErrorTab({
            plotKey: { storePath: store.path, itemPath: plot.itemPath },
            toolId: resolvedToolId,
            errorMessage: result.error ?? 'Unknown error',
            sourceFeatureIds: selectedFeatureIds,
            parameters: toolParams,
          });
        }
      }
      void vscode.window.showErrorMessage(
        `Tool execution failed: ${result.error ?? 'Unknown error'}`
      );
      return;
    }

    // Feature: 178-vscode-tabular-results
    //
    // Dataset-carrying features (carrier features whose `properties`
    // contain `__datasets` or `statistics`) must NOT flow through the
    // map-layer / STAC-persist path. They exist only to transport the
    // DatasetEnvelope to the Results panel; persisting them to the
    // plot's main GeoJSON would:
    //   - add a synthetic Point (often at [0,0]) to the map
    //   - silently save the tool output without the user clicking Save
    //   - break the FR-009 "save explicit" contract
    //
    // We split the feature collection into two views:
    //   - `mapOnlyFeatures`: real spatial results that belong on the map
    //     and in the plot GeoJSON (buffer polygons, reference points,
    //     etc.)
    //   - `datasetCarrierFeatures`: kept only in memory in the
    //     ResultsPanelService, never written to disk until the user
    //     clicks Save / Save As.
    //
    // The ORIGINAL `result.features` is preserved (with both groups)
    // and passed to `LogService.recordToolResult` so that Python-side
    // activity IDs attached to carrier features flow through provenance
    // continuity.
    type AnyFeature = { properties?: unknown };
    const allResultFeatures: AnyFeature[] =
      result.features?.features ?? [];
    const mapOnlyFeatures: AnyFeature[] = [];
    const datasetCarrierFeatures: AnyFeature[] = [];
    for (const feature of allResultFeatures) {
      const props = feature?.properties;
      if (props !== null && typeof props === 'object') {
        // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
        const propsMap = props as Record<string, unknown>;
        const hasDatasets =
          Array.isArray(propsMap['__datasets']) &&
          (propsMap['__datasets'] as unknown[]).length > 0;
        const hasStatistics =
          propsMap['statistics'] !== null &&
          typeof propsMap['statistics'] === 'object';
        if (hasDatasets || hasStatistics) {
          datasetCarrierFeatures.push(feature);
          continue;
        }
      }
      mapOnlyFeatures.push(feature);
    }

    // Build a MAP-ONLY view of the result for createResultLayer + addFeatures.
    // We deliberately do NOT mutate `result` — the original is reused
    // below when calling recordToolResult so Python activity IDs flow
    // through to provenance.
    const mapOnlyResult: typeof result = result.features
      ? {
          ...result,
          features: {
            ...result.features,
            features: mapOnlyFeatures as typeof result.features.features,
          },
        }
      : result;

    // Create result layer with provenance (FR-024).
    // When ALL features were dataset carriers, `mapOnlyFeatures` is
    // empty — `createResultLayer` returns null in that case, which
    // is exactly what we want: no map layer, no STAC row, no layers-tree
    // entry, just the Results panel tab.
    const execution = calcService.getCurrentExecution();
    const layer = calcService.createResultLayer(
      resolvedToolId,
      execution?.id ?? `exec-${Date.now()}`,
      mapOnlyResult,
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
      // NOTE (#178): `layer.features.features` already excludes
      // dataset carriers because it was built from `mapOnlyResult`.
      if (stacService && !result.artifactData && !isMutationResult) {
        try {
          const store = panel.getCurrentStore?.();
          const plot = panel.getCurrentPlot?.();
          if (store?.path && plot?.itemPath && layer.features.features.length > 0) {
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
    }

    // ──────────────────────────────────────────────────────────────────
    // Provenance + Results panel wiring — runs for BOTH map-layer and
    // dataset-only results.  A dataset-only tool (like `range-bearing`
    // returning carrier features) has `layer === null` above, so the
    // map-layer path is skipped, but we still need to:
    //   1. Record a ToolRunEvent in the analysis log so the Results
    //      panel's save flow can link the future FileSavedEvent to it.
    //   2. Create Results panel tabs via
    //      `ResultsPanelService.addDatasetsForToolResult()`.
    // ──────────────────────────────────────────────────────────────────

    const resolvedLogService = panel.getLogService?.() ?? logService;
    if (!resolvedLogService && (layer || datasetCarrierFeatures.length > 0)) {
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
              // Pass the ORIGINAL features (map + dataset carriers) so
              // Python-generated activity IDs on carrier features flow
              // through `extractActivityIdFromOutputFeatures`.
              features: result.features,
              duration_ms: result.durationMs,
              result_type: result.resultType,
              source_feature_ids: result.sourceFeatureIds ?? selectedFeatureIds,
              artifact_href: result.artifactHref,
              tool_id: resolvedToolId,
              ...(isMutation && preToolInputState ? { input_state: preToolInputState } : {}),
            },
            result.tool_version || result.parameters ? {
              tool_version: result.tool_version,
              modified_features: result.modifiedFeatures,
              created_features: result.createdFeatures,
              created_assets: result.createdAssets,
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

          // Feature: 178 — route tool result datasets into the Results panel.
          // Only fires when the tool emitted at least one dataset carrier
          // feature (whose `properties.__datasets` or `properties.statistics`
          // we detected above).  The carrier features are in-memory only —
          // they NEVER get written to disk until the user clicks Save / Save As.
          if (resultsPanelService && datasetCarrierFeatures.length > 0) {
            // Resolve human-readable feature names from the map panel
            // so the Results panel can show "Range (HMS Defender → USS
            // Freedom)" instead of "Range (c144f1fd → 8ebb42d3)".
            //
            // Uses the schema-typed `DebriefFeature` union via the
            // `isTrackFeature` / `isReferenceLocation` type guards
            // from @debrief/schemas.  TrackFeature has `platform_name`,
            // ReferenceLocation has `label`, annotations have `label`.
            const sourceIds = result.sourceFeatureIds ?? selectedFeatureIds;
            const allPanelFeatures: DebriefFeature[] = panel.getFeatures();
            const sourceFeatureNames: string[] = sourceIds.map((id) => {
              const feature = allPanelFeatures.find(
                (f: DebriefFeature) => String(f.id) === id,
              );
              if (!feature) { return id; }
              // TrackFeature → platform_name
              if ('platform_name' in feature.properties && feature.properties.platform_name) {
                return feature.properties.platform_name;
              }
              // ReferenceLocation / Annotation → label
              if ('label' in feature.properties && feature.properties.label) {
                return String(feature.properties.label);
              }
              return String(feature.id);
            });

            resultsPanelService.addDatasetsForToolResult({
              plotKey: { storePath: store.path, itemPath: plot.itemPath },
              toolId: resolvedToolId,
              result: {
                features: {
                  type: 'FeatureCollection',
                  features: datasetCarrierFeatures,
                },
              },
              sourceFeatureIds: sourceIds,
              sourceFeatureNames,
              parameters: toolParams,
              parentActivityId: recordResult.activity_id,
            });
          }
        }
      } catch (logErr) {
        console.warn('[debrief] Failed to record provenance:', logErr);
      }
    }

    // Success notification (FR-015) — only for results that produced
    // something user-visible (map layer, or Results panel datasets).
    if (layer) {
      void vscode.window.showInformationMessage(
        `Analysis complete: ${layer.name}`
      );
    } else if (datasetCarrierFeatures.length > 0) {
      void vscode.window.showInformationMessage(
        `${toolName} complete — see Debrief Results panel`
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
