# Quickstart: Context-Sensitive Tool Offering VS Code Integration

**Feature**: #038 Context-Tool-VSCode
**Date**: 2026-01-27

## Overview

This guide shows how to integrate the ToolMatchService with the VS Code extension to provide context-sensitive analysis tools.

## Prerequisites

- VS Code extension workspace (`apps/vscode`)
- `@debrief/components` package with ToolMatchService
- `@debrief/session-state` for selection state
- CalcService with MCP connectivity to debrief-calc

## Integration Steps

### 1. Import ToolMatchService

```typescript
// In apps/vscode/src/services/toolMatchAdapter.ts
import {
  ToolMatchService,
  createSelectionFromCounts,
  type Tool,
  type Selection,
  type MatchResult,
} from '@debrief/components';
```

### 2. Create ToolMatchAdapter

The adapter bridges session-state selection to ToolMatchService:

```typescript
import type { SessionManager } from './sessionManager';
import type { GeoJSONFeature } from '../types/plot';

export class ToolMatchAdapter {
  private _service: ToolMatchService | null = null;
  private _features: GeoJSONFeature[] = [];

  constructor(private _sessionManager: SessionManager) {}

  setTools(tools: Tool[]): void {
    this._service = new ToolMatchService(tools);
  }

  setFeatures(features: GeoJSONFeature[]): void {
    this._features = features;
  }

  getMatchResults(): MatchResult[] {
    if (!this._service) return [];

    const session = this._sessionManager.getActiveSession();
    const selection = session?.getState().selection;
    if (!selection || selection.featureIds.length === 0) {
      return this._service.getMatchResults(new Map());
    }

    const toolSelection = this._buildSelection(selection.featureIds);
    return this._service.getMatchResults(toolSelection);
  }

  private _buildSelection(featureIds: string[]): Selection {
    const counts: Record<string, number> = {};
    for (const id of featureIds) {
      const feature = this._features.find(f => f.id === id);
      const kind = (feature?.properties?.kind as string) ?? 'UNKNOWN';
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    return createSelectionFromCounts(counts);
  }
}
```

### 3. Initialize in Extension Activation

```typescript
// In apps/vscode/src/extension.ts
import { ToolMatchAdapter } from './services/toolMatchAdapter';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing initialization ...

  // Create adapter with session manager
  const toolMatchAdapter = new ToolMatchAdapter(sessionManager);

  // Fetch and cache tools
  const tools = await calcService.listTools();
  toolMatchAdapter.setTools(tools);

  // Pass adapter to tree provider
  toolsTreeProvider.setToolMatchAdapter(toolMatchAdapter);

  // Update adapter when plot opens
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (doc) => {
      if (doc.uri.scheme === 'stac') {
        const features = await stacService.loadPlotData(doc.uri);
        toolMatchAdapter.setFeatures(features);
      }
    })
  );
}
```

### 4. Update ToolsTreeProvider

```typescript
// In apps/vscode/src/providers/toolsTreeProvider.ts
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { MatchResult } from '@debrief/components';

export class ToolsTreeProvider implements vscode.TreeDataProvider<ToolTreeItem> {
  private _adapter: ToolMatchAdapter | null = null;
  private _showInactive = false;

  setToolMatchAdapter(adapter: ToolMatchAdapter): void {
    this._adapter = adapter;
  }

  setShowInactive(show: boolean): void {
    this._showInactive = show;
    this.refresh();
  }

  getChildren(): ToolTreeItem[] {
    if (!this._adapter) {
      return [new ToolTreeItem({ label: 'Loading tools...' })];
    }

    const results = this._adapter.getMatchResults();

    if (results.every(r => !r.isActive) && results.length > 0) {
      // All inactive - show empty state
      return [new ToolTreeItem({
        label: 'Select features to see available tools',
        description: '',
      })];
    }

    const visible = this._showInactive
      ? results
      : results.filter(r => r.isActive);

    return visible.map(r => new ToolTreeItem({
      label: r.tool.name,
      description: r.isActive ? r.tool.description : r.explanation,
      contextValue: r.isActive ? 'activeTool' : 'inactiveTool',
      command: r.isActive ? {
        command: `debrief.executeTool.${r.tool.id}`,
        title: 'Execute Tool',
      } : undefined,
    }));
  }
}
```

### 5. Subscribe to Selection Changes

```typescript
// In apps/vscode/src/extension.ts
import { subscribeToSelection } from '@debrief/session-state';

// When active session changes, subscribe to selection
sessionManager.onActiveSessionChange((session) => {
  if (session) {
    subscribeToSelection(session, () => {
      toolsTreeProvider.refresh();
      updateToolContexts(toolMatchAdapter.getMatchResults());
    });
  }
});

// Update VS Code contexts for menu visibility
function updateToolContexts(results: MatchResult[]): void {
  const activeIds = new Set(
    results.filter(r => r.isActive).map(r => r.tool.id)
  );

  for (const result of results) {
    vscode.commands.executeCommand(
      'setContext',
      `debrief.tool.${result.tool.id}.active`,
      activeIds.has(result.tool.id)
    );
  }
}
```

### 6. Register Tool Commands

```typescript
// In apps/vscode/src/extension.ts
async function registerToolCommands(
  tools: Tool[],
  calcService: CalcService,
  stacService: StacService
): Promise<vscode.Disposable[]> {
  return tools.map(tool =>
    vscode.commands.registerCommand(
      `debrief.executeTool.${tool.id}`,
      async () => {
        const session = sessionManager.getActiveSession();
        const selection = session?.getState().selection;

        if (!selection || selection.featureIds.length === 0) {
          vscode.window.showWarningMessage('Select features first');
          return;
        }

        try {
          const result = await calcService.executeTool(
            tool.id,
            selection.featureIds
          );

          // Add provenance to result features
          const provenance = {
            tool: { id: tool.id, name: tool.name, version: tool.version },
            timestamp: new Date().toISOString(),
            sourceFeatureIds: selection.featureIds,
          };

          for (const feature of result.add ?? []) {
            feature.properties.provenance = provenance;
          }

          // Persist via STAC
          const plotUri = session.getState().featureCollectionUri;
          await stacService.addFeatures(plotUri, result.add ?? []);

          vscode.window.showInformationMessage(
            `${tool.name} completed: ${result.add?.length ?? 0} features added`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Tool execution failed: ${error.message}`
          );
        }
      }
    )
  );
}
```

### 7. Configure package.json

Add to `contributes.commands`:

```json
{
  "commands": [
    {
      "command": "debrief.executeTool.rangeAndBearing",
      "title": "Debrief: Range & Bearing",
      "enablement": "debrief.tool.range-and-bearing.active"
    }
  ]
}
```

Add to `contributes.menus`:

```json
{
  "menus": {
    "webview/context": [
      {
        "submenu": "debrief.toolsSubmenu",
        "group": "debrief@2",
        "when": "debrief.plotOpen && debrief.hasSelection"
      }
    ],
    "debrief.toolsSubmenu": [
      {
        "command": "debrief.executeTool.rangeAndBearing",
        "when": "debrief.tool.range-and-bearing.active"
      }
    ]
  },
  "submenus": [
    {
      "id": "debrief.toolsSubmenu",
      "label": "Tools"
    }
  ]
}
```

## Testing

### Unit Test Example

```typescript
// In apps/vscode/tests/unit/toolMatchAdapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ToolMatchAdapter } from '../../src/services/toolMatchAdapter';

describe('ToolMatchAdapter', () => {
  it('converts session selection to ToolMatchService selection', () => {
    const mockSessionManager = {
      getActiveSession: vi.fn().mockReturnValue({
        getState: () => ({
          selection: { featureIds: ['track-1', 'track-2'] }
        })
      })
    };

    const adapter = new ToolMatchAdapter(mockSessionManager as any);
    adapter.setTools([{
      id: 'range',
      name: 'Range',
      requirements: [{ kind: 'TRACK', min: 2, max: 2 }]
    }]);
    adapter.setFeatures([
      { id: 'track-1', properties: { kind: 'TRACK' } },
      { id: 'track-2', properties: { kind: 'TRACK' } },
    ]);

    const results = adapter.getMatchResults();

    expect(results).toHaveLength(1);
    expect(results[0].isActive).toBe(true);
  });
});
```

## Verification

1. **Tool Discovery**: Open VS Code, verify tools appear in sidebar after extension activation
2. **Selection Matching**: Select two tracks, verify "Range & Bearing" becomes available
3. **Inactive Explanation**: Enable "Show inactive tools", verify explanation text appears
4. **Context Menu**: Right-click with selection, verify "Tools" submenu appears
5. **Command Palette**: Type "Debrief:", verify tool commands appear when applicable
6. **Execution**: Execute a tool, verify result appears on plot with provenance
