/**
 * TimeController Webview Entry Point
 *
 * This React component wraps the TimeController from @debrief/components
 * and handles communication with the VS Code extension.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TimeController } from '@debrief/components';
import type { PlaybackState, DisplayMode } from '@debrief/components';
import { Bootstrap } from './_bootstrap';

// VS Code API type
declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): TimeControllerState | undefined;
  setState(state: TimeControllerState): void;
};

// Message types for communication with extension
interface WebviewMessage {
  type: string;
  [key: string]: unknown;
}

interface TimeExtentMessage {
  type: 'updateTimeExtent';
  start: number;
  end: number;
  dataStart: number;
  dataEnd: number;
}

interface SetCurrentTimeMessage {
  type: 'setCurrentTime';
  time: number;
}

interface SetUIStateMessage {
  type: 'setUIState';
  uiState: 'empty' | 'loading' | 'ready';
}

type ExtensionMessage = TimeExtentMessage | SetCurrentTimeMessage | SetUIStateMessage;

// State to persist
interface TimeControllerState {
  currentTime?: number;
  speed?: number;
  displayMode?: DisplayMode;
}

// VS Code API instance
const vscode = acquireVsCodeApi();

/**
 * TimeController Webview App
 */
function TimeControllerApp(): React.ReactElement {
  const [timeExtent, setTimeExtent] = useState<[number, number] | null>(null);
  const [uiState, setUIState] = useState<'empty' | 'loading' | 'ready'>('empty');
  const [initialTime, setInitialTime] = useState<number | undefined>(undefined);
  const [initialSpeed, setInitialSpeed] = useState<number | undefined>(undefined);
  const [initialDisplayMode, setInitialDisplayMode] = useState<DisplayMode | undefined>(undefined);

  // Restore state on mount
  useEffect(() => {
    const savedState = vscode.getState();
    if (savedState) {
      if (savedState.currentTime !== undefined) {
        setInitialTime(savedState.currentTime);
      }
      if (savedState.speed !== undefined) {
        setInitialSpeed(savedState.speed);
      }
      if (savedState.displayMode !== undefined) {
        setInitialDisplayMode(savedState.displayMode);
      }
    }
  }, []);

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'updateTimeExtent':
          setTimeExtent([message.start, message.end]);
          setUIState('ready');
          break;

        case 'setCurrentTime':
          setInitialTime(message.time);
          break;

        case 'setUIState':
          setUIState(message.uiState);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle time change
  const handleTimeChange = (time: number): void => {
    // Persist state
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, currentTime: time });

    // Notify extension
    vscode.postMessage({
      type: 'timeChange',
      time,
    });
  };

  // Handle playback state change
  const handlePlaybackStateChange = (state: PlaybackState): void => {
    vscode.postMessage({
      type: 'playbackStateChange',
      state,
    });
  };

  // Handle display mode change
  const handleDisplayModeChange = (mode: DisplayMode): void => {
    // Persist state
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, displayMode: mode });

    // Notify extension
    vscode.postMessage({
      type: 'displayModeChange',
      mode,
    });
  };

  return (
    <div className="time-controller-webview">
      <TimeController
        timeExtent={timeExtent ?? undefined}
        uiState={uiState}
        initialTime={initialTime}
        initialSpeed={initialSpeed as 1 | 2 | 4 | 8 | undefined}
        initialDisplayMode={initialDisplayMode}
        onTimeChange={handleTimeChange}
        onPlaybackStateChange={handlePlaybackStateChange}
        onDisplayModeChange={handleDisplayModeChange}
      />
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Bootstrap>
        <TimeControllerApp />
      </Bootstrap>
    </React.StrictMode>
  );
}

// Notify extension that webview is ready
vscode.postMessage({ type: 'webviewReady' });
