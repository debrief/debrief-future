/**
 * US1 transport command handlers (Feature 217).
 *
 * Registers:
 *   - `debrief.storyboard.forward`    — advance one scene
 *   - `debrief.storyboard.backward`   — retreat one scene
 *   - `debrief.storyboard.clickScene` — row / rectangle click dispatch
 *   - `debrief.storyboard.jumpPast`   — resolver arm of the hard-block modal
 *
 * `.editScene` is intentionally NOT registered here — the "Open for
 * editing" modal action calls `showInformationMessage` inline from
 * `StoryboardPlaybackService.resolveHardBlockByOpeningForEditing`
 * (tasks.md T332). The scene-edit surface proper arrives in #218.
 */

import * as vscode from 'vscode';
import type { StoryboardPlaybackService } from '../services/storyboardPlayback';

/**
 * Narrow SessionManager surface needed by the transport handlers —
 * keeps the command module testable without pulling in the full
 * SessionManager constructor graph.
 */
export interface TransportSessionManager {
  getActiveDocumentUri(): string | null;
}

/**
 * Narrow service surface — only the methods the transport handlers
 * touch (tests can pass a simpler shape).
 */
export interface TransportPlaybackService {
  forward(documentUri: string): Promise<void>;
  backward(documentUri: string): Promise<void>;
  goToScene(documentUri: string, sceneId: string): Promise<void>;
  resolveHardBlockByJumpingPast(
    documentUri: string,
    blockedSceneId: string,
    direction: 'forward' | 'backward',
  ): Promise<void>;
}

export function registerStoryboardTransportCommands(
  context: vscode.ExtensionContext,
  service: TransportPlaybackService | StoryboardPlaybackService,
  sessionManager: TransportSessionManager,
): vscode.Disposable {
  const disposables: vscode.Disposable[] = [
    vscode.commands.registerCommand('debrief.storyboard.forward', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      await service.forward(documentUri);
    }),

    vscode.commands.registerCommand('debrief.storyboard.backward', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) return;
      await service.backward(documentUri);
    }),

    vscode.commands.registerCommand('debrief.storyboard.clickScene', async (sceneId: unknown) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri || typeof sceneId !== 'string') return;
      await service.goToScene(documentUri, sceneId);
    }),

    vscode.commands.registerCommand(
      'debrief.storyboard.jumpPast',
      async (payload: unknown) => {
        const documentUri = sessionManager.getActiveDocumentUri();
        if (!documentUri) return;
        if (!isJumpPastPayload(payload)) return;
        await service.resolveHardBlockByJumpingPast(
          documentUri,
          payload.blockedSceneId,
          payload.direction,
        );
      },
    ),
  ];

  const composite = {
    dispose(): void {
      for (const d of disposables) d.dispose();
    },
  };
  context.subscriptions.push(composite);
  return composite;
}

interface JumpPastPayload {
  readonly blockedSceneId: string;
  readonly direction: 'forward' | 'backward';
}

function isJumpPastPayload(value: unknown): value is JumpPastPayload {
  if (value === null || typeof value !== 'object') return false;
  const v = value as { blockedSceneId?: unknown; direction?: unknown };
  if (typeof v.blockedSceneId !== 'string') return false;
  if (v.direction !== 'forward' && v.direction !== 'backward') return false;
  return true;
}
