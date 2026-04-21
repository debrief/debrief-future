/**
 * Typed message contracts for the Storyboard panel webview (Feature 216).
 *
 * All payloads are JSON-safe; no raw filesystem paths cross the boundary
 * (Article X). Discriminated unions keep extension / webview code
 * strictly typed (Article XV).
 */

import type { SceneRowViewModel } from '@debrief/components';

/** Webview → Extension. */
export type StoryboardPanelMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'capture-clicked' }
  | { readonly type: 'scene-row-clicked'; readonly sceneId: string }
  | {
      readonly type: 'log';
      readonly level: 'debug' | 'warn' | 'error';
      readonly message: string;
    };

/** Extension → Webview. */
export type ExtensionToStoryboardPanelMessage =
  | {
      readonly type: 'scenes';
      readonly scenes: SceneRowViewModel[];
      readonly activeStoryboardName: string | null;
      readonly activeStoryboardId: string | null;
    }
  | {
      readonly type: 'captureInFlight';
      readonly inFlight: boolean;
    }
  | {
      readonly type: 'theme';
      readonly theme: 'light' | 'dark' | 'vscode';
    };
