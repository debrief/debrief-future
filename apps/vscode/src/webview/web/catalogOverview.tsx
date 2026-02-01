/**
 * Catalog Overview Webview Entry Point
 *
 * Thin React wrapper that bridges the CatalogOverview component
 * to the VS Code webview message protocol.
 *
 * Feature: 042-stac-catalog-overview-panel
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { CatalogOverview } from '@debrief/components';
import type { CatalogOverviewItem } from '@debrief/components';

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

function CatalogOverviewApp(): React.ReactElement {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(0.6);

  // Restore persisted state
  useEffect(() => {
    const saved = vscode.getState();
    if (saved?.splitRatio !== undefined) {
      setSplitRatio(saved.splitRatio as number);
    }
  }, []);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'loadCatalogOverview':
          setCatalogData(message.catalog);
          break;
        case 'setSplitRatio':
          setSplitRatio(message.ratio);
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

  // Handle split ratio change
  const handleSplitRatioChange = useCallback((ratio: number) => {
    setSplitRatio(ratio);
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, splitRatio: ratio });
  }, []);

  if (!catalogData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-editor-foreground, #ccc)' }}>
        Loading catalog overview…
      </div>
    );
  }

  return (
    <CatalogOverview
      items={catalogData.items}
      onItemSelect={handleItemSelect}
      initialSplitRatio={splitRatio}
      onSplitRatioChange={handleSplitRatioChange}
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
