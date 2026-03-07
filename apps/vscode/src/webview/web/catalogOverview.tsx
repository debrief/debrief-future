/**
 * Catalog Overview Webview Entry Point
 *
 * Thin React wrapper that bridges the CatalogOverview component
 * to the VS Code webview message protocol.
 *
 * Feature: 042-stac-catalog-overview-panel
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { StacBrowserItem } from '@debrief/components';
import { createRoot } from 'react-dom/client';
import { StacBrowser } from '@debrief/components';

// VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: Record<string, unknown>): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
};

const vscode = acquireVsCodeApi();

interface CatalogData {
  id: string;
  title: string;
  storePath: string;
  items: StacBrowserItem[];
}

function CatalogOverviewApp(): React.ReactElement {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'loadCatalogOverview':
          setCatalogData(message.catalog);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback((itemPath: string) => {
    if (!catalogData) return;
    vscode.postMessage({
      type: 'overviewItemSelected',
      itemPath,
      storePath: catalogData.storePath,
    });
  }, [catalogData]);

  if (!catalogData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-editor-foreground, #ccc)' }}>
        Loading catalog overview…
      </div>
    );
  }

  return (
    <StacBrowser
      items={catalogData.items}
      taxonomy={[]}
      onItemSelect={handleItemSelect}
    />
  );
}

// Mount
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <CatalogOverviewApp />
    </React.StrictMode>
  );
}

// Notify extension that webview is ready
vscode.postMessage({ type: 'overviewWebviewReady' });
