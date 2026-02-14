/**
 * Type definitions for the ResultsPanel component.
 *
 * Feature: 095-results-bottom-panel
 */

/** Content type category for routing to the correct renderer. */
export type ResultArtifactType = 'dataset' | 'image' | 'other';

/** Identifies a unique tab (plot + file path combination). */
export interface TabIdentity {
  /** Unique tab identifier: `${plotItemPath}::${resultFilePath}` */
  id: string;
  /** STAC item path for the source plot */
  plotItemPath: string;
  /** Relative path to the result file within the STAC item's assets directory */
  resultFilePath: string;
}

/** Content payload discriminated by artifact type. */
export type TabContentPayload =
  | { artifactType: 'dataset'; spec: object | null; error?: string }
  | { artifactType: 'image'; dataUri: string }
  | { artifactType: 'other'; filename: string; mimeType: string; sizeBytes: number };

/** Represents a single open tab in the results panel. */
export interface ResultTab {
  /** Unique tab identifier: `${plotItemPath}::${resultFilePath}` */
  id: string;
  /** Display title for the tab */
  title: string;
  /** Human-readable plot name for disambiguation */
  plotTitle: string;
  /** Content type category */
  artifactType: ResultArtifactType;
  /** Content payload for rendering */
  content: TabContentPayload;
  /** Whether to show the plot prefix in the tab title */
  showPlotPrefix: boolean;
}

// ============================================================================
// Extension → Webview Messages
// ============================================================================

export interface ResultsAddTabMessage {
  type: 'results:addTab';
  tab: {
    id: string;
    title: string;
    plotTitle: string;
    artifactType: ResultArtifactType;
  };
  content: TabContentPayload;
  showPlotPrefix: boolean;
}

export interface ResultsUpdateContentMessage {
  type: 'results:updateContent';
  tabId: string;
  content: TabContentPayload;
}

export interface ResultsActivateTabMessage {
  type: 'results:activateTab';
  tabId: string;
}

export interface ResultsRemoveTabMessage {
  type: 'results:removeTab';
  tabId: string;
  newActiveTabId: string | null;
}

export interface ResultsUpdatePlotPrefixesMessage {
  type: 'results:updatePlotPrefixes';
  showPlotPrefix: boolean;
}

/** All messages from extension to results panel webview. */
export type ResultsExtensionToWebviewMessage =
  | ResultsAddTabMessage
  | ResultsUpdateContentMessage
  | ResultsActivateTabMessage
  | ResultsRemoveTabMessage
  | ResultsUpdatePlotPrefixesMessage;

// ============================================================================
// Webview → Extension Messages
// ============================================================================

export interface ResultsCloseTabMessage {
  type: 'results:closeTab';
  tabId: string;
}

export interface ResultsSelectTabMessage {
  type: 'results:selectTab';
  tabId: string;
}

export interface ResultsOpenExternalMessage {
  type: 'results:openExternal';
  tabId: string;
}

export interface ResultsWebviewReadyMessage {
  type: 'results:webviewReady';
}

/** All messages from results panel webview to extension. */
export type ResultsWebviewToExtensionMessage =
  | ResultsCloseTabMessage
  | ResultsSelectTabMessage
  | ResultsOpenExternalMessage
  | ResultsWebviewReadyMessage;

// ============================================================================
// Component Props
// ============================================================================

/** Props for the ResultsPanel React component. */
export interface ResultsPanelProps {
  /** Current open tabs */
  tabs: ResultTab[];
  /** ID of the currently active tab, or null if empty */
  activeTabId: string | null;
  /** Callback when a tab is selected */
  onSelectTab?: (tabId: string) => void;
  /** Callback when a tab's close button is clicked */
  onCloseTab?: (tabId: string) => void;
  /** Callback when "Open in VS Code" is clicked in fallback viewer */
  onOpenExternal?: (tabId: string) => void;
}

/** Props for the ResultTabBar component. */
export interface ResultTabBarProps {
  /** Ordered list of tabs */
  tabs: ResultTab[];
  /** ID of the currently active tab */
  activeTabId: string | null;
  /** Callback when a tab is clicked */
  onSelectTab?: (tabId: string) => void;
  /** Callback when a tab's close button is clicked */
  onCloseTab?: (tabId: string) => void;
}

/** Props for the ResultTabContent component. */
export interface ResultTabContentProps {
  /** Content payload to render */
  content: TabContentPayload;
  /** Callback when "Open in VS Code" is clicked in fallback viewer */
  onOpenExternal?: () => void;
}

/** Props for the ImageViewer component. */
export interface ImageViewerProps {
  /** Base64-encoded data URI for the image */
  dataUri: string;
}

/** Props for the FallbackViewer component. */
export interface FallbackViewerProps {
  /** Filename to display */
  filename: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Callback when "Open in VS Code" button is clicked */
  onOpenExternal?: () => void;
}
