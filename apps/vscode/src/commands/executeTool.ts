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

/**
 * Create the execute tool command
 *
 * @param calcService - CalcService for executing tools
 * @param toolMatchAdapter - ToolMatchAdapter for getting selection
 * @param getMapPanel - Function to get current MapPanel
 * @param layersTreeProvider - LayersTreeProvider for displaying results
 * @param stacService - StacService for persisting results to STAC
 * @param activityPanelProvider - ActivityPanelViewProvider for updating result files
 * @param logService - LogService for recording provenance (Feature: 071)
 * @param resultIdRegistry - ResultIdRegistry for tracking result IDs (Feature: 087)
 */
export function createExecuteToolCommand(
  calcService: CalcService,
  toolMatchAdapter: ToolMatchAdapter,
  getMapPanel: () => MapPanel | undefined,
  layersTreeProvider: LayersTreeProvider,
  stacService?: StacService,
  activityPanelProvider?: ActivityPanelViewProvider,
  logService?: LogService,
  resultIdRegistry?: ResultIdRegistry
): (toolIdOrMessage: string | { toolId: string; params?: Record<string, unknown> }) => Promise<void> {
  return async (toolIdOrMessage: string | { toolId: string; params?: Record<string, unknown> }) => {
    // Handle string, { toolId, params } object, and legacy { toolName } format
    let resolvedToolId: string;
    let toolParams: Record<string, unknown> | undefined;

    if (typeof toolIdOrMessage === 'string') {
      resolvedToolId = toolIdOrMessage;
    } else if (typeof toolIdOrMessage === 'object' && toolIdOrMessage !== null) {
      resolvedToolId = (toolIdOrMessage as Record<string, unknown>).toolId as string
        || (toolIdOrMessage as Record<string, unknown>).toolName as string;
      toolParams = (toolIdOrMessage as Record<string, unknown>).params as Record<string, unknown> | undefined;
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

    // Capture pre-tool geometry for mutation tools (enables correct tune replay)
    let preToolInputState: InputFeatureState[] | undefined;
    const selectedIdSet = new Set(selectedFeatureIds);
    const allFeatures = panel.getFeatures();
    const preToolFeatures = allFeatures.filter(
      (f) => selectedIdSet.has(String(f.id))
    );
    if (preToolFeatures.length > 0) {
      preToolInputState = preToolFeatures.map((f) => {
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const { provenance: _p, ...restProps } = props;
        return {
          featureId: String(f.id),
          geometry: JSON.parse(JSON.stringify(f.geometry)) as unknown,
          properties: JSON.parse(JSON.stringify(restProps)) as Record<string, unknown>,
        };
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
      // Add to map (skip webview message for artifact layers — no map geometry)
      if (!layer.artifactHref) {
        panel.addResultLayer(layer);
      } else {
        // Still store in panel's result layers for tracking
        panel.addResultLayer(layer);
      }

      // Update layers panel
      layersTreeProvider.addResultLayer(layer);

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

      // Auto-persist addition results to STAC (#041)
      if (stacService && !result.artifactData && result.resultType?.startsWith('addition/')) {
        try {
          const store = panel.getCurrentStore?.();
          const plot = panel.getCurrentPlot?.();
          if (store?.path && plot?.itemPath) {
            await stacService.addFeatures(
              store.path,
              plot.itemPath,
              layer.features.features as Parameters<typeof stacService.addFeatures>[2]
            );
          }
        } catch (persistErr) {
          console.warn('[debrief] Failed to persist result to STAC:', persistErr);
        }
      }

      // Record provenance via Log Service (Feature: 071)
      if (logService && stacService) {
        try {
          const store = panel.getCurrentStore?.();
          const plot = panel.getCurrentPlot?.();
          if (store?.path && plot?.itemPath) {
            // Include pre-tool inputState for mutation tools
            const isMutation = result.resultType?.startsWith('mutation/');
            const recordResult = await logService.recordToolResult(
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
