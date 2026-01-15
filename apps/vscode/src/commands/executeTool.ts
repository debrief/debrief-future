/**
 * Tool Execution Commands - Execute and cancel analysis tools
 */

import * as vscode from 'vscode';
import type { CalcService } from '../services/calcService';
import type { MapPanel } from '../webview/mapPanel';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';

interface ExecuteToolArgs {
  toolName: string;
  params?: Record<string, unknown>;
}

/**
 * Create the execute tool command
 */
export function createExecuteToolCommand(
  calcService: CalcService,
  getMapPanel: () => MapPanel | undefined,
  layersTreeProvider: LayersTreeProvider
): (args: ExecuteToolArgs) => Promise<void> {
  return async (args: ExecuteToolArgs) => {
    if (!args?.toolName) {
      return;
    }

    const panel = getMapPanel();
    if (!panel) {
      void vscode.window.showWarningMessage('No plot open');
      return;
    }

    const tracks = panel.getTracks();
    const locations = panel.getLocations();

    // Get selected features
    const selectedTrackIds = tracks.filter((t) => t.selected).map((t) => t.id);
    const selectedLocationIds = locations
      .filter((l) => l.selected)
      .map((l) => l.id);

    if (selectedTrackIds.length === 0 && selectedLocationIds.length === 0) {
      void vscode.window.showWarningMessage('No tracks or locations selected');
      return;
    }

    // Execute tool with progress
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Running ${args.toolName}...`,
        cancellable: true,
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          calcService.cancelExecution();
        });

        return calcService.executeTool(
          {
            toolName: args.toolName,
            trackIds: selectedTrackIds,
            locationIds: selectedLocationIds,
            params: args.params,
          },
          tracks,
          locations
        );
      }
    );

    if (!result.success) {
      void vscode.window.showErrorMessage(
        `Tool execution failed: ${result.error ?? 'Unknown error'}`
      );
      return;
    }

    // Create result layer
    const execution = calcService.getCurrentExecution();
    const layer = calcService.createResultLayer(
      args.toolName,
      execution?.id ?? `exec-${Date.now()}`,
      result
    );

    if (layer) {
      // Add to map
      panel.addResultLayer(layer);

      // Update layers panel
      layersTreeProvider.addResultLayer(layer);

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
