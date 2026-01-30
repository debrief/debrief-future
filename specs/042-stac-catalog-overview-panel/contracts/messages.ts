/**
 * Message contracts for the Catalog Overview Panel.
 *
 * Extension Host → Webview: load catalog data
 * Webview → Extension Host: user navigation actions
 */

// --- Extension Host → Webview ---

export interface CatalogOverviewItem {
  id: string;
  title: string;
  itemPath: string;
  bbox: [number, number, number, number] | null;
  datetime: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
}

export interface LoadCatalogOverviewMessage {
  type: 'loadCatalogOverview';
  catalog: {
    id: string;
    title: string;
    storePath: string;
    items: CatalogOverviewItem[];
  };
}

export type ExtensionToCatalogOverviewMessage = LoadCatalogOverviewMessage;

// --- Webview → Extension Host ---

export interface OverviewItemSelectedMessage {
  type: 'overviewItemSelected';
  itemPath: string;
  storePath: string;
}

export interface OverviewWebviewReadyMessage {
  type: 'overviewWebviewReady';
}

export type CatalogOverviewToExtensionMessage =
  | OverviewItemSelectedMessage
  | OverviewWebviewReadyMessage;
