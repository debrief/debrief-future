/**
 * Open Plots Service - Tracks and persists currently-open plots for session restoration
 *
 * Feature: 052-restore-plots-session
 *
 * This service maintains a list of currently-open STAC plots in workspaceState,
 * enabling automatic restoration when VS Code is reopened.
 */

import * as vscode from 'vscode';
import type { OpenPlotReference, OpenPlotsState } from '../types/openPlots';

const OPEN_PLOTS_KEY = 'debrief.openPlots';
const CURRENT_VERSION = 1;

export class OpenPlotsService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get all currently-open plot references, in open order.
   * Returns empty array if no plots are open or state is corrupt.
   */
  getOpenPlots(): OpenPlotReference[] {
    try {
      const state = this.context.workspaceState.get<OpenPlotsState>(OPEN_PLOTS_KEY);
      if (!state || !Array.isArray(state.plots)) {
        return [];
      }
      return (state.plots as OpenPlotReference[]).slice();
    } catch {
      return [];
    }
  }

  /**
   * Record that a plot has been opened.
   * If the plot URI already exists, moves it to the end with updated timestamp.
   * Persists immediately to workspaceState.
   */
  async addPlot(
    uri: string,
    title: string,
    storeId: string,
    itemPath: string,
  ): Promise<void> {
    const plots = this.getOpenPlots();

    // Remove existing entry with same URI (if any)
    const filtered = plots.filter((p) => p.uri !== uri);

    // Append to end with current timestamp
    filtered.push({
      uri,
      title,
      storeId,
      itemPath,
      openedAt: new Date().toISOString(),
    });

    await this.persist(filtered);
  }

  /**
   * Record that a plot has been closed.
   * Removes the entry matching the URI. No-op if URI not found.
   * Persists immediately to workspaceState.
   */
  async removePlot(uri: string): Promise<void> {
    const plots = this.getOpenPlots();
    const filtered = plots.filter((p) => p.uri !== uri);

    if (filtered.length !== plots.length) {
      await this.persist(filtered);
    }
  }

  /**
   * Restore all previously-open plots by executing the openPlot command
   * for each persisted reference. Plots are restored sequentially.
   *
   * - Missing/corrupt plots are silently skipped and removed from state.
   * - Corrupt persisted state is replaced with empty state.
   * - The cleaned list is persisted after all attempts complete.
   *
   * @returns Array of URIs that were successfully restored
   */
  async restoreOpenPlots(): Promise<string[]> {
    const plots = this.getOpenPlots();
    if (plots.length === 0) {
      return [];
    }

    const restoredUris: string[] = [];
    const successfulPlots: OpenPlotReference[] = [];

    for (const plot of plots) {
      try {
        await vscode.commands.executeCommand('debrief.openPlot', { uri: plot.uri });
        restoredUris.push(plot.uri);
        successfulPlots.push(plot);
      } catch {
        // Silently skip failed plots
      }
    }

    // Persist cleaned list (only successfully restored plots)
    await this.persist(successfulPlots);

    return restoredUris;
  }

  /**
   * Clear all open plot references.
   */
  async clearAll(): Promise<void> {
    await this.persist([]);
  }

  /**
   * Check whether a plot URI is in the currently-open list.
   */
  isOpen(uri: string): boolean {
    const plots = this.getOpenPlots();
    return plots.some((p) => p.uri === uri);
  }

  /**
   * Persist the plots list to workspaceState.
   */
  private async persist(plots: OpenPlotReference[]): Promise<void> {
    const state: OpenPlotsState = {
      version: CURRENT_VERSION,
      plots,
    };
    await this.context.workspaceState.update(OPEN_PLOTS_KEY, state);
  }
}
