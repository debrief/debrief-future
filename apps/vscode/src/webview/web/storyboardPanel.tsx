/**
 * Webview entrypoint for the Storyboard panel (Features 216 + 217).
 *
 * Mounts the presentational `<StoryboardPanel/>` from `@debrief/components`
 * and wires its event handlers to VS Code's `postMessage` channel.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StoryboardPanel, ThemeProvider } from '@debrief/components';
import type {
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  Theme,
} from '@debrief/components';

interface AcquiredVsCodeApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): AcquiredVsCodeApi;

interface ScenesMessage {
  type: 'scenes';
  scenes: SceneRowViewModel[];
  activeStoryboardName: string | null;
  activeStoryboardId: string | null;
}

interface CaptureInFlightMessage {
  type: 'captureInFlight';
  inFlight: boolean;
}

interface ThemeMessage {
  type: 'theme';
  theme: 'light' | 'dark' | 'vscode';
}

interface SnapshotMessage {
  type: 'snapshot';
  storyboards: readonly StoryboardOptionViewModel[];
  scenes: readonly SceneRowViewModel[];
  activeStoryboardId: string | null;
  activeStoryboardName: string | null;
  currentSceneId: string | null;
  transport: TransportViewModel;
}

type ExtensionMessage =
  | ScenesMessage
  | CaptureInFlightMessage
  | ThemeMessage
  | SnapshotMessage;

const vscode = acquireVsCodeApi();

function StoryboardPanelApp(): React.ReactElement {
  const [scenes, setScenes] = useState<readonly SceneRowViewModel[]>([]);
  const [activeStoryboardName, setActiveStoryboardName] = useState<string | null>(null);
  const [activeStoryboardId, setActiveStoryboardId] = useState<string | null>(null);
  const [storyboards, setStoryboards] = useState<readonly StoryboardOptionViewModel[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [transport, setTransport] = useState<TransportViewModel | undefined>(undefined);
  const [captureInFlight, setCaptureInFlight] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'vscode'>('vscode');

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>): void => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'scenes':
          setScenes(msg.scenes);
          setActiveStoryboardName(msg.activeStoryboardName);
          setActiveStoryboardId(msg.activeStoryboardId);
          break;
        case 'snapshot':
          setScenes(msg.scenes);
          setStoryboards(msg.storyboards);
          setActiveStoryboardName(msg.activeStoryboardName);
          setActiveStoryboardId(msg.activeStoryboardId);
          setCurrentSceneId(msg.currentSceneId);
          setTransport(msg.transport);
          break;
        case 'captureInFlight':
          setCaptureInFlight(msg.inFlight);
          break;
        case 'theme':
          setTheme(msg.theme);
          break;
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, []);

  const onCaptureClick = useCallback(() => {
    vscode.postMessage({ type: 'capture-clicked' });
  }, []);

  const onSceneRowClick = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'scene-row-clicked', sceneId });
  }, []);

  const onTransportForward = useCallback(() => {
    vscode.postMessage({ type: 'transport-forward-clicked' });
  }, []);

  const onTransportBackward = useCallback(() => {
    vscode.postMessage({ type: 'transport-backward-clicked' });
  }, []);

  const onActiveStoryboardChange = useCallback((storyboardId: string) => {
    vscode.postMessage({ type: 'active-storyboard-changed', storyboardId });
  }, []);

  const onCreateStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'create-storyboard-requested' });
  }, []);

  const onRenameStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'rename-storyboard-requested' });
  }, []);

  const onDeleteStoryboard = useCallback(() => {
    vscode.postMessage({ type: 'delete-storyboard-requested' });
  }, []);

  const themeConfig: Theme = { variant: theme };

  return (
    <ThemeProvider theme={themeConfig}>
      <StoryboardPanel
        scenes={scenes}
        activeStoryboardName={activeStoryboardName}
        captureInFlight={captureInFlight}
        onCaptureClick={onCaptureClick}
        onSceneRowClick={onSceneRowClick}
        storyboards={storyboards.length > 0 ? storyboards : undefined}
        activeStoryboardId={activeStoryboardId}
        currentSceneId={currentSceneId}
        transport={transport}
        onTransportForward={onTransportForward}
        onTransportBackward={onTransportBackward}
        onActiveStoryboardChange={onActiveStoryboardChange}
        onCreateStoryboard={onCreateStoryboard}
        onRenameStoryboard={onRenameStoryboard}
        onDeleteStoryboard={onDeleteStoryboard}
      />
    </ThemeProvider>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<StoryboardPanelApp />);
}
