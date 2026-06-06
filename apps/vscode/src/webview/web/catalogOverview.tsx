/**
 * Catalog Overview Webview Entry Point
 *
 * Thin React wrapper that bridges the StacBrowser component
 * to the VS Code webview message protocol.
 *
 * Feature: 042-stac-catalog-overview-panel, 132-three-view-sync
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  StacBrowser,
  parseTaxonomy,
  createPostMessageLLMClient,
} from '@debrief/components';
import type {
  CatalogOverviewItem,
  StacBrowserItem,
  RawTaxonomy,
  LLMClient,
  EnumBundle,
} from '@debrief/components';
import rawTaxonomy from '../../../../../shared/schemas/fixtures/stac-browser/vessel-taxonomy.json';
// #191 T050 — the NL pipeline needs an enum bundle to build the prompt. The
// bundle is shipped as a static JSON asset under `shared/data/` and bundled
// into the webview by esbuild at compile time.
import rawEnumBundle from '../../../../../shared/data/enum-bundle.json';
import { Bootstrap } from './_bootstrap';

// VS Code API
declare function acquireVsCodeApi(): {
  postMessage(message: Record<string, unknown>): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
};

const vscode = acquireVsCodeApi();
const VESSEL_TAXONOMY = parseTaxonomy((rawTaxonomy as RawTaxonomy).taxonomy);
const NL_ENUMS = rawEnumBundle as unknown as EnumBundle;

// #191 T050 — NL config snapshot shape, as pushed from the extension host.
interface NlConfigSnapshot {
  readonly enabled: boolean;
  readonly model: string;
  readonly hasApiKey: boolean;
  readonly callCeiling: number;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
}

function subscribeToWindowMessages(handler: (msg: unknown) => void): () => void {
  const listener = (event: MessageEvent): void => {
    handler(event.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

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
  // #191 T051 — NL-search config state. The extension host pushes `nlConfig`
  // snapshots on activation + on every settings/secret change. We only
  // enable the NL client when BOTH `enabled` and `hasApiKey` are true.
  const [nlConfig, setNlConfig] = useState<NlConfigSnapshot | null>(null);

  // Construct the post-message client once per mount — disposed on unmount
  // (review Decision 4). The client lives in a ref so component re-renders
  // don't recreate it.
  const llmClientRef = useRef<LLMClient | null>(null);
  if (llmClientRef.current === null) {
    llmClientRef.current = createPostMessageLLMClient({
      postMessage: (msg) => vscode.postMessage(msg as Record<string, unknown>),
      subscribe: subscribeToWindowMessages,
      uuid: () => {
        // Webviews running in VS Code may or may not have crypto.randomUUID.
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return `nl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      },
    });
  }

  // Dispose (abort pending + let the subscription go) on unmount.
  useEffect(() => {
    const client = llmClientRef.current;
    return () => {
      client?.abort();
    };
  }, []);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'loadCatalogOverview':
          setCatalogData(message.catalog);
          break;

        case 'nlConfig':
          // #191 T051 — host-pushed config snapshot.
          setNlConfig(message.config as NlConfigSnapshot);
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

  // #191 T082 — host wiring for the NL failure-banner recovery buttons.
  // `retry` is handled inside FilterBar (re-submits the last phrase); here
  // we route `open-settings`, `reload`, and `help` through VS Code commands
  // by posting a message back to the extension host, which maps them to
  // the matching `vscode.commands.executeCommand` (`help` resolves via
  // `vscode.env.openExternal` — #198 Decision 4).
  // Declared before the early return so hook order stays stable across renders.
  const handleNlBannerAction = useCallback(
    (action: 'open-settings' | 'retry' | 'reload' | 'help') => {
      vscode.postMessage({ type: 'nlBannerAction', action });
    },
    [],
  );

  if (!catalogData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-editor-foreground, #ccc)' }}>
        Loading catalog overview…
      </div>
    );
  }

  // #191 T051 — gate the NL client at the call site. Only pass it when the
  // host reports enabled + key present. This keeps the literal QuickSearch
  // path active for any analyst who hasn't opted in.
  const shouldUseLlmClient =
    nlConfig !== null && nlConfig.enabled && nlConfig.hasApiKey;
  const effectiveLlmClient = shouldUseLlmClient ? llmClientRef.current ?? undefined : undefined;
  const liveModeLabel =
    shouldUseLlmClient && nlConfig
      ? `Live · Anthropic · ${nlConfig.model}`
      : undefined;

  return (
    <StacBrowser
      items={browserItems}
      taxonomy={VESSEL_TAXONOMY}
      onItemSelect={handleItemSelect}
      llmClient={effectiveLlmClient}
      nlEnums={effectiveLlmClient ? NL_ENUMS : undefined}
      liveModeLabel={liveModeLabel}
      onNlBannerAction={handleNlBannerAction}
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
