/**
 * Catalog Overview Webview Entry Point
 *
 * Thin React wrapper that bridges the StacBrowser component
 * to the VS Code webview message protocol.
 *
 * Feature: 042-stac-catalog-overview-panel, 132-three-view-sync
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { StacBrowser } from '@debrief/components';
import type { CatalogOverviewItem, StacBrowserItem } from '@debrief/components';

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
  items: CatalogOverviewItem[];
}

/** Map CatalogOverviewItem to StacBrowserItem by adding empty extension fields. */
function toStacBrowserItem(item: CatalogOverviewItem): StacBrowserItem {
  return {
    ...item,
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
    collection: null,
    modified: null,
  };
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

  // Map items to StacBrowserItem format
  const browserItems = useMemo<StacBrowserItem[]>(() => {
    if (!catalogData) return [];
    return catalogData.items.map(toStacBrowserItem);
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
      items={browserItems}
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
