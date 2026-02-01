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

/**
 * Create the execute tool command
 *
 * @param calcService - CalcService for executing tools
 * @param toolMatchAdapter - ToolMatchAdapter for getting selection
 * @param getMapPanel - Function to get current MapPanel
 * @param layersTreeProvider - LayersTreeProvider for displaying results
 * @param stacService - StacService for persisting results to STAC
 */
export function createExecuteToolCommand(
  calcService: CalcService,
  toolMatchAdapter: ToolMatchAdapter,
  getMapPanel: () => MapPanel | undefined,
  layersTreeProvider: LayersTreeProvider,
  stacService?: StacService
): (toolId: string) => Promise<void> {
  return async (toolId: string) => {
    // Handle both new format (toolId string) and legacy format (object with toolName)
    const resolvedToolId = typeof toolId === 'object' && toolId !== null
      ? ((toolId as Record<string, unknown>).toolName as string) || ((toolId as Record<string, unknown>).toolId as string)
      : toolId;

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
