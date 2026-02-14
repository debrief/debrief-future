/**
 * ResultsPanel Webview Entry Point
 *
 * Bridges VS Code webview API to the ResultsPanel React component.
 * Handles message passing between extension host and React component.
 *
 * Feature: 095-results-bottom-panel
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ResultsPanel } from '@debrief/components';
import type { ResultTab, TabContentPayload, ResultArtifactType } from '@debrief/components';

// Extension → Webview message types
type ExtensionMessage =
  | {
      type: 'results:addTab';
      tab: { id: string; title: string; plotTitle: string; artifactType: ResultArtifactType };
      content: TabContentPayload;
      showPlotPrefix: boolean;
    }
  | { type: 'results:updateContent'; tabId: string; content: TabContentPayload }
  | { type: 'results:activateTab'; tabId: string }
  | { type: 'results:removeTab'; tabId: string; newActiveTabId: string | null }
  | { type: 'results:updatePlotPrefixes'; showPlotPrefix: boolean };

// VS Code API type
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

function ResultsPanelApp(): React.ReactElement {
  const [tabs, setTabs] = useState<ResultTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;

      switch (msg.type) {
        case 'results:addTab': {
          const newTab: ResultTab = {
            id: msg.tab.id,
            title: msg.tab.title,
            plotTitle: msg.tab.plotTitle,
            artifactType: msg.tab.artifactType,
            content: msg.content,
            showPlotPrefix: msg.showPlotPrefix,
          };
          setTabs((prev) => [...prev, newTab]);
          setActiveTabId(msg.tab.id);
          break;
        }

        case 'results:updateContent': {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.id === msg.tabId ? { ...tab, content: msg.content } : tab
            )
          );
          break;
        }

        case 'results:activateTab':
          setActiveTabId(msg.tabId);
          break;

        case 'results:removeTab': {
          setTabs((prev) => prev.filter((tab) => tab.id !== msg.tabId));
          setActiveTabId(msg.newActiveTabId);
          break;
        }

        case 'results:updatePlotPrefixes':
          setTabs((prev) =>
            prev.map((tab) => ({ ...tab, showPlotPrefix: msg.showPlotPrefix }))
          );
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    vscode.postMessage({ type: 'results:selectTab', tabId });
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    vscode.postMessage({ type: 'results:closeTab', tabId });
  }, []);

  const handleOpenExternal = useCallback((tabId: string) => {
    vscode.postMessage({ type: 'results:openExternal', tabId });
  }, []);

  return (
    <ResultsPanel
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={handleSelectTab}
      onCloseTab={handleCloseTab}
      onOpenExternal={handleOpenExternal}
    />
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ResultsPanelApp />
    </React.StrictMode>
  );
}

// Notify extension that webview is ready
vscode.postMessage({ type: 'results:webviewReady' });
