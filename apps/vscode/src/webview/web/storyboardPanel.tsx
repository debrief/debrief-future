/**
 * Webview entrypoint for the Storyboard panel (Feature 216).
 *
 * Mounts the presentational `<StoryboardPanel/>` from `@debrief/components`
 * and wires its event handlers to VS Code's `postMessage` channel.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StoryboardPanel, ThemeProvider } from '@debrief/components';
import type { SceneRowViewModel, Theme } from '@debrief/components';

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

type ExtensionMessage = ScenesMessage | CaptureInFlightMessage | ThemeMessage;

const vscode = acquireVsCodeApi();

function StoryboardPanelApp(): React.ReactElement {
  const [scenes, setScenes] = useState<SceneRowViewModel[]>([]);
  const [activeStoryboardName, setActiveStoryboardName] = useState<string | null>(null);
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

  const themeConfig: Theme = { variant: theme };

  return (
    <ThemeProvider theme={themeConfig}>
      <StoryboardPanel
        scenes={scenes}
        activeStoryboardName={activeStoryboardName}
        captureInFlight={captureInFlight}
        onCaptureClick={onCaptureClick}
        onSceneRowClick={onSceneRowClick}
      />
    </ThemeProvider>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<StoryboardPanelApp />);
}
