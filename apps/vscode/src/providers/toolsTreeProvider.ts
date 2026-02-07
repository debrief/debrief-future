/**
 * Tools Tree Provider - Shows analysis tools in the sidebar
 *
 * Displays available analysis tools from debrief-calc, filtered by the
 * current selection context using ToolMatchAdapter.
 *
 * Feature: 038-context-tool-vscode
 * - Uses ToolMatchAdapter to filter tools based on selection
 * - Shows active tools that match current selection
 * - Optionally shows inactive tools with explanations (FR-011)
 * - Supports empty/loading/error states
 */

import * as vscode from 'vscode';
import type { CalcService } from '../services/calcService';
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { Tool } from '../types/tool';
import { getInactiveReason } from '../types/tool';

/**
 * Tree item representing a tool in the sidebar
 */
export class ToolTreeItem extends vscode.TreeItem {
  constructor(
    public readonly tool: Tool,
    public readonly isActive: boolean,
    public readonly explanation?: string
  ) {
    super(tool.name, vscode.TreeItemCollapsibleState.None);

    // Set description from tool
    this.description = tool.description ?? '';

    // Set tooltip with more detail
    if (isActive) {
      this.tooltip = new vscode.MarkdownString(
        `**${tool.name}**\n\n${tool.description ?? ''}\n\n*Click to execute*`
      );
    } else {
      this.tooltip = new vscode.MarkdownString(
        `**${tool.name}** *(inactive)*\n\n${tool.description ?? ''}\n\n*Why inactive:* ${explanation ?? 'Unknown'}`
      );
    }

    // Set icon based on active state
    if (isActive) {
      this.iconPath = new vscode.ThemeIcon('tools');
      // Execute tool on click
      this.command = {
        command: 'debrief.executeTool',
        title: 'Execute Tool',
        arguments: [tool.id],
      };
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('disabledForeground'));
      // Show explanation on click for inactive tools
      this.command = {
        command: 'debrief.showToolRequirements',
        title: 'Show Requirements',
        arguments: [tool.id, explanation],
      };
    }

    // Set context value for menu contributions
    this.contextValue = isActive ? 'tool.active' : 'tool.inactive';
  }
}

/**
 * Message tree item for empty/loading/error states
 */
class MessageTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    description?: string,
    icon?: vscode.ThemeIcon
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = icon;
    this.contextValue = 'message';
  }
}

export class ToolsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private toolMatchAdapter: ToolMatchAdapter;
  private calcAvailable = false;
  private showInactiveTools = false;

  constructor(_calcService: CalcService, toolMatchAdapter: ToolMatchAdapter) {
    this.toolMatchAdapter = toolMatchAdapter;
  }

  /**
   * Set whether debrief-calc is available
   */
  setCalcAvailable(available: boolean): void {
    this.calcAvailable = available;
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Toggle showing inactive tools (FR-010, FR-011)
   */
  toggleShowInactiveTools(): void {
    this.showInactiveTools = !this.showInactiveTools;
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Get whether inactive tools are shown
   */
  getShowInactiveTools(): boolean {
    return this.showInactiveTools;
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // No nested children
    if (element) {
      return [];
    }

    // Check if calc service is available (NFR-002)
    if (!this.calcAvailable) {
      return [
        new MessageTreeItem(
          'Analysis tools unavailable',
          'debrief-calc not connected',
          new vscode.ThemeIcon('warning')
        ),
      ];
    }

    // Check if any features are selected (FR-005)
    if (!this.toolMatchAdapter.hasSelection()) {
      return [
        new MessageTreeItem(
          'Select features to see tools',
          'Click tracks or points on the map',
          new vscode.ThemeIcon('info')
        ),
      ];
    }

    // Get match results from adapter (FR-006, FR-007)
    const matchResults = this.toolMatchAdapter.getMatchResults();

    if (matchResults.length === 0) {
      return [
        new MessageTreeItem(
          'No tools available',
          'Try selecting different features',
          new vscode.ThemeIcon('info')
        ),
      ];
    }

    // Build tree items
    const items: vscode.TreeItem[] = [];

    // Active tools first (FR-008)
    const activeResults = matchResults.filter((r) => r.isActive);
    for (const result of activeResults) {
      items.push(new ToolTreeItem(result.tool, true));
    }

    // Add inactive tools if toggle is on (FR-010, FR-011)
    if (this.showInactiveTools) {
      const inactiveResults = matchResults.filter((r) => !r.isActive);

      if (inactiveResults.length > 0) {
        // Add separator
        const separator = new MessageTreeItem(
          `${inactiveResults.length} inactive tool${inactiveResults.length === 1 ? '' : 's'}`,
          'selection doesn\'t match requirements',
          new vscode.ThemeIcon('dash')
        );
        items.push(separator);

        // Add inactive tools with explanations
        for (const result of inactiveResults) {
          const explanation = result.explanation ?? getInactiveReason(result.tool, this.toolMatchAdapter.getSelectionSummary());
          items.push(new ToolTreeItem(result.tool, false, explanation));
        }
      }
    }

    // If no active tools and not showing inactive, show a helpful message
    if (items.length === 0) {
      return [
        new MessageTreeItem(
          'No matching tools',
          'Toggle inactive tools to see all',
          new vscode.ThemeIcon('info')
        ),
      ];
    }

    return items;
  }

  /**
   * Get the selection summary for display
   */
  getSelectionSummary(): string {
    const summary = this.toolMatchAdapter.getSelectionSummary();
    const parts: string[] = [];

    for (const [kind, count] of summary) {
      parts.push(`${count} ${kind.toLowerCase()}${count !== 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No selection';
  }
}
