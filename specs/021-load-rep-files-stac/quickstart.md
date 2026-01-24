# Developer Quickstart: REP File Import

**Feature**: 021-load-rep-files-stac

## Overview

This guide walks through implementing REP file import in the VS Code extension. By the end, you'll have drag-drop import of REP files onto the map panel.

## Prerequisites

- Node.js 18+
- Python 3.11+
- VS Code Extension development environment set up
- `uv` (Python package manager) installed

## Architecture Summary

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Map Webview   │────▶│  Extension Host   │────▶│ Python Services │
│   (map.ts)      │     │ (loadRepFile.ts)  │     │ (debrief-io/stac)│
└─────────────────┘     └───────────────────┘     └─────────────────┘
      Drop event    Message passing       JSON-RPC over stdio
```

## Step 1: Add Webview Drop Handler

Edit `apps/vscode/src/webview/web/map.ts`:

```typescript
// Add to initialization
function setupDropHandler() {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  // Prevent default browser behavior
  mapContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragging .rep file
    const items = e.dataTransfer?.items;
    const hasRepFile = items && Array.from(items).some(
      item => item.kind === 'file' && item.type === '' // VS Code URIs have no type
    );

    if (hasRepFile) {
      mapContainer.classList.add('drop-zone-active');
    }
  });

  mapContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    mapContainer.classList.remove('drop-zone-active');
  });

  mapContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    mapContainer.classList.remove('drop-zone-active');

    // Get file URIs from VS Code
    const uris = e.dataTransfer?.getData('text/uri-list');
    if (!uris) return;

    const filePath = uris.split('\n')[0].replace('file://', '');
    const fileName = filePath.split('/').pop() || '';

    // Validate .rep extension
    if (!fileName.toLowerCase().endsWith('.rep')) {
      vscode.postMessage({
        type: 'error',
        payload: { message: `Only .rep files can be imported. Received: ${fileName}` }
      });
      return;
    }

    // Send to extension host
    vscode.postMessage({
      type: 'repFileDrop',
      payload: { filePath, fileName, fileSize: 0 }
    });
  });
}
```

## Step 2: Create Python Service Client

Create `apps/vscode/src/services/pythonService.ts`:

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export class PythonService {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();

  async start(pythonPath: string): Promise<void> {
    if (this.process) return;

    this.process = spawn(pythonPath, ['-m', 'debrief_service']);

    const rl = readline.createInterface({
      input: this.process.stdout!,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      const response: JsonRpcResponse = JSON.parse(line);
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        this.pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
    });
  }

  async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    if (!this.process) {
      throw new Error('Python service not started');
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
```

## Step 3: Create Import Command

Create `apps/vscode/src/commands/loadRepFile.ts`:

```typescript
import * as vscode from 'vscode';
import { PythonService } from '../services/pythonService';

interface ParseResult {
  features: Array<{ type: 'Feature'; geometry: unknown; properties: unknown }>;
  warnings: Array<{ message: string; lineNumber?: number }>;
}

interface AddFeaturesResult {
  feature_count: number;
  bounds: [number, number, number, number];
}

export async function loadRepFile(
  pythonService: PythonService,
  filePath: string,
  fileName: string,
  catalogPath: string,
  plotId: string
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Importing ${fileName}`,
      cancellable: false
    },
    async (progress) => {
      try {
        // Step 1: Parse REP file
        progress.report({ message: 'Parsing REP file...' });
        const parseResult = await pythonService.call<ParseResult>('io.parse_rep', {
          file_path: filePath
        });

        if (parseResult.features.length === 0) {
          throw new Error('No tracks found in REP file');
        }

        // Step 2: Check for duplicates
        progress.report({ message: 'Checking for duplicates...' });
        const assets = await pythonService.call<{ assets: Array<{ title: string }> }>(
          'stac.list_assets',
          { catalog_path: catalogPath, plot_id: plotId }
        );

        const isDuplicate = assets.assets.some(a => a.title === fileName);
        if (isDuplicate) {
          vscode.window.showWarningMessage(
            `File '${fileName}' has already been imported. Skipping.`
          );
          return;
        }

        // Step 3: Store asset
        progress.report({ message: 'Storing source file...' });
        await pythonService.call('stac.add_asset', {
          catalog_path: catalogPath,
          plot_id: plotId,
          source_path: filePath,
          asset_key: `source-${fileName.replace('.rep', '')}`,
          media_type: 'application/x-debrief-rep'
        });

        // Step 4: Add features
        progress.report({ message: 'Adding tracks to plot...' });
        const addResult = await pythonService.call<AddFeaturesResult>('stac.add_features', {
          catalog_path: catalogPath,
          plot_id: plotId,
          features: parseResult.features
        });

        // Step 5: Show success
        vscode.window.showInformationMessage(
          `Imported ${parseResult.features.length} tracks from '${fileName}'`
        );

        // Return bounds for map zoom
        return addResult.bounds;

      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to import '${fileName}': ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      }
    }
  );
}
```

## Step 4: Wire It Up

In `apps/vscode/src/extension.ts`, add:

```typescript
import { loadRepFile } from './commands/loadRepFile';
import { PythonService } from './services/pythonService';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Start Python service
  const pythonService = new PythonService();
  await pythonService.start('python'); // Or get from config

  // Handle messages from map webview
  MapPanel.onMessage((message) => {
    if (message.type === 'repFileDrop') {
      const { filePath, fileName } = message.payload;
      const stacContext = MapPanel.getCurrentStacContext();

      loadRepFile(
        pythonService,
        filePath,
        fileName,
        stacContext.catalogPath,
        stacContext.plotId
      ).then((bounds) => {
        if (bounds) {
          MapPanel.zoomToBounds(bounds);
        }
        MapPanel.refreshData();
      });
    }
  });

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose: () => pythonService.stop()
  });
}
```

## Step 5: Add Drop Zone CSS

Add to `apps/vscode/src/webview/web/map.css`:

```css
.drop-zone-active::after {
  content: 'Drop REP file to import';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 102, 204, 0.3);
  border: 3px dashed #0066cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  pointer-events: none;
}
```

## Testing

### Unit Test Example

```typescript
// apps/vscode/tests/unit/loadRepFile.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('loadRepFile', () => {
  it('should reject duplicate files', async () => {
    const mockService = {
      call: vi.fn()
        .mockResolvedValueOnce({ features: [{ type: 'Feature' }] }) // parse
        .mockResolvedValueOnce({ assets: [{ title: 'track.rep' }] }) // list_assets
    };

    await loadRepFile(mockService, '/path/to/track.rep', 'track.rep', '/catalog', 'plot');

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('already been imported')
    );
  });
});
```

### Integration Test

```typescript
// apps/vscode/tests/integration/repImport.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PythonService } from '../../src/services/pythonService';

describe('REP Import Integration', () => {
  let service: PythonService;

  beforeAll(async () => {
    service = new PythonService();
    await service.start('python');
  });

  afterAll(() => {
    service.stop();
  });

  it('should parse a valid REP file', async () => {
    const result = await service.call('io.parse_rep', {
      file_path: 'test-data/sample.rep'
    });

    expect(result.features).toHaveLength(2);
    expect(result.features[0].geometry.type).toBe('LineString');
  });
});
```

## Troubleshooting

### Python service won't start

1. Check Python path: `which python`
2. Verify debrief packages installed: `python -m debrief_io --version`
3. Check for import errors: `python -c "import debrief_io"`

### Drop events not firing

1. Verify webview has focus
2. Check browser devtools in webview (Cmd+Shift+P → "Developer: Open Webview Developer Tools")
3. Ensure dataTransfer contains file URIs

### Import succeeds but map doesn't update

1. Check MapPanel.refreshData() is called
2. Verify GeoJSON is reloaded from STAC item
3. Check console for Leaflet errors
