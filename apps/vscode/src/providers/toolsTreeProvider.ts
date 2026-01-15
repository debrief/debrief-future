/**
 * Tools Tree Provider - Sidebar tree view for analysis tools
 *
 * Displays available analysis tools based on the current selection context.
 */

import * as vscode from 'vscode';
import type { CalcService } from '../services/calcService';
import type { AnalysisTool } from '../types/tool';
import type { Selection } from '../types/plot';

export class ToolsTreeProvider implements vscode.TreeDataProvider<AnalysisTool> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    AnalysisTool | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private calcService: CalcService;
  private currentSelection: Selection | null = null;
  private cachedTools: AnalysisTool[] = [];
  private isCalcAvailable = false;

  constructor(calcService: CalcService) {
    this.calcService = calcService;
  }

  /**
   * Update the selection context
   */
  updateSelection(selection: Selection): void {
    this.currentSelection = selection;
    this.refresh();
  }

  /**
   * Clear the selection
   */
  clearSelection(): void {
    this.currentSelection = null;
    this.cachedTools = [];
    this.refresh();
  }

  /**
   * Set calc availability
   */
  setCalcAvailable(available: boolean): void {
    this.isCalcAvailable = available;
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  refresh(item?: AnalysisTool): void {
    this._onDidChangeTreeData.fire(item ?? undefined);
  }

  /**
   * Get tree item for an element
   */
  getTreeItem(element: AnalysisTool): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.displayName,
      vscode.TreeItemCollapsibleState.None
    );

    item.description = this.getToolContextDescription(element);
    item.tooltip = element.description;
    item.contextValue = 'tool';
    item.iconPath = this.getToolIcon(element.name);

    // Add execute command
    item.command = {
      command: 'debrief.executeTool',
      title: 'Execute Tool',
      arguments: [{ toolName: element.name }],
    };

    return item;
  }

  /**
   * Get children for an element
   */
  async getChildren(element?: AnalysisTool): Promise<AnalysisTool[]> {
    if (element) {
      // Tools are leaf nodes
      return [];
    }

    // Root level: return applicable tools
    if (!this.isCalcAvailable) {
      return [];
    }

    if (!this.currentSelection || this.currentSelection.contextType === 'none') {
      return [];
    }

    try {
      const allTools = await this.calcService.listTools();

      // Filter by current selection context
      this.cachedTools = allTools.filter((tool) => {
        if (tool.contextType === 'any') {
          return true;
        }
        return tool.contextType === this.currentSelection?.contextType;
      });

      return this.cachedTools;
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getToolContextDescription(tool: AnalysisTool): string {
    switch (tool.contextType) {
      case 'single-track':
        return '1 track';
      case 'multi-track':
        return '2+ tracks';
      case 'location':
        return 'location';
      case 'mixed':
        return 'track + location';
      default:
        return '';
    }
  }

  private getToolIcon(toolName: string): vscode.ThemeIcon {
    // Map tool names to icons
    const iconMap: Record<string, string> = {
      'range-bearing': 'ruler',
      'closest-approach': 'arrow-both',
      'relative-motion': 'symbol-event',
      'track-stats': 'graph',
      'distance-to-point': 'symbol-ruler',
    };

    const icon = iconMap[toolName] ?? 'tools';
    return new vscode.ThemeIcon(icon);
  }
}
