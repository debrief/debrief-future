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
import { StacBrowser, parseTaxonomy } from '@debrief/components';
import type { CatalogOverviewItem, StacBrowserItem, RawTaxonomy } from '@debrief/components';
import rawTaxonomy from '../../../../../shared/schemas/fixtures/stac-browser/vessel-taxonomy.json';
import { Bootstrap } from './_bootstrap';

// VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: Record<string, unknown>): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
};

const vscode = acquireVsCodeApi();
const VESSEL_TAXONOMY = parseTaxonomy((rawTaxonomy as RawTaxonomy).taxonomy);

interface CatalogData {
  id: string;
  title: string;
  storePath: string;
  items: CatalogOverviewItem[];
}

/** Map CatalogOverviewItem to StacBrowserItem using extension fields when available. */
function toStacBrowserItem(item: CatalogOverviewItem): StacBrowserItem {
  return {
    ...item,
    platforms: item.platforms ?? [],
    tags: item.tags ?? [],
    featureTags: item.featureTags ?? [],
    author: null,
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
      taxonomy={VESSEL_TAXONOMY}
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
      <Bootstrap>
        <CatalogOverviewApp />
      </Bootstrap>
    </React.StrictMode>
  );
}

// Notify extension that webview is ready
vscode.postMessage({ type: 'overviewWebviewReady' });
