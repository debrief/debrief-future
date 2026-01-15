/**
 * Recent Plots Service - Manages recently opened plots
 *
 * This service tracks recently opened plots for quick access from the welcome view.
 */

import * as vscode from 'vscode';
import type { RecentPlot } from '../types/plot';

const RECENT_PLOTS_KEY = 'debrief.recentPlots';

export class RecentPlotsService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get all recent plots
   */
  getRecentPlots(): RecentPlot[] {
    return this.context.workspaceState.get<RecentPlot[]>(RECENT_PLOTS_KEY) ?? [];
  }

  /**
   * Add a plot to the recent list
   */
  async addRecentPlot(
    plotId: string,
    title: string,
    storeId: string,
    uri: string
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('debrief');
    const maxCount = config.get<number>('recentPlots.maxCount') ?? 10;

    const recentPlots = this.getRecentPlots();

    // Remove if already exists
    const existingIndex = recentPlots.findIndex((p) => p.plotId === plotId);
    if (existingIndex !== -1) {
      recentPlots.splice(existingIndex, 1);
    }

    // Add to front
    recentPlots.unshift({
      plotId,
      title,
      storeId,
      lastOpened: new Date().toISOString(),
      uri,
    });

    // Trim to max count
    const trimmed = recentPlots.slice(0, maxCount);

    await this.context.workspaceState.update(RECENT_PLOTS_KEY, trimmed);
  }

  /**
   * Remove a plot from the recent list
   */
  async removeRecentPlot(plotId: string): Promise<void> {
    const recentPlots = this.getRecentPlots();
    const filteredPlots = recentPlots.filter((p) => p.plotId !== plotId);

    if (filteredPlots.length !== recentPlots.length) {
      await this.context.workspaceState.update(RECENT_PLOTS_KEY, filteredPlots);
    }
  }

  /**
   * Clear all recent plots
   */
  async clearRecentPlots(): Promise<void> {
    await this.context.workspaceState.update(RECENT_PLOTS_KEY, []);
  }

  /**
   * Get relative time string (e.g., "2 hours ago")
   */
  getRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) {
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (days === 1) {
      return 'yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
