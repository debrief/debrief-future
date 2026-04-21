/**
 * @vitest-environment node
 *
 * Unit tests for US1 command handlers (Feature 217, T330).
 *
 * The handlers are thin dispatchers — each looks up the active
 * document URI, returns early if null, then delegates to the
 * `StoryboardPlaybackService`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerStoryboardTransportCommands } from '../../src/commands/storyboardTransport';

interface RegisteredCommands {
  [commandId: string]: (...args: unknown[]) => unknown;
}

function makeContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

function makeSessionManager(activeUri: string | null): {
  getActiveDocumentUri: () => string | null;
} {
  return { getActiveDocumentUri: () => activeUri };
}

function makeService(): {
  forward: ReturnType<typeof vi.fn>;
  backward: ReturnType<typeof vi.fn>;
  goToScene: ReturnType<typeof vi.fn>;
  resolveHardBlockByJumpingPast: ReturnType<typeof vi.fn>;
} {
  return {
    forward: vi.fn(() => Promise.resolve()),
    backward: vi.fn(() => Promise.resolve()),
    goToScene: vi.fn(() => Promise.resolve()),
    resolveHardBlockByJumpingPast: vi.fn(() => Promise.resolve()),
  };
}

describe('registerStoryboardTransportCommands', () => {
  let registered: RegisteredCommands;

  beforeEach(() => {
    registered = {};
    vi.spyOn(vscode.commands, 'registerCommand').mockImplementation(
      (commandId: string, callback: (...args: unknown[]) => unknown) => {
        registered[commandId] = callback;
        return { dispose: (): void => undefined } as vscode.Disposable;
      },
    );
  });

  it('registers forward/backward/clickScene/jumpPast commands', () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    expect(registered['debrief.storyboard.forward']).toBeTypeOf('function');
    expect(registered['debrief.storyboard.backward']).toBeTypeOf('function');
    expect(registered['debrief.storyboard.clickScene']).toBeTypeOf('function');
    expect(registered['debrief.storyboard.jumpPast']).toBeTypeOf('function');
  });

  it('forward delegates to service.forward(documentUri)', async () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.forward'] as () => Promise<void>)();
    expect(service.forward).toHaveBeenCalledWith('stac://plot.json');
  });

  it('forward returns silently when documentUri is null', async () => {
    const service = makeService();
    const sm = makeSessionManager(null);
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.forward'] as () => Promise<void>)();
    expect(service.forward).not.toHaveBeenCalled();
  });

  it('backward delegates to service.backward(documentUri)', async () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot-2.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.backward'] as () => Promise<void>)();
    expect(service.backward).toHaveBeenCalledWith('stac://plot-2.json');
  });

  it('clickScene delegates to service.goToScene(documentUri, sceneId)', async () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.clickScene'] as (
      sceneId: string,
    ) => Promise<void>)('scene-xyz');
    expect(service.goToScene).toHaveBeenCalledWith('stac://plot.json', 'scene-xyz');
  });

  it('clickScene is no-op if sceneId argument is not a string', async () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.clickScene'] as (
      sceneId: unknown,
    ) => Promise<void>)(undefined);
    expect(service.goToScene).not.toHaveBeenCalled();
  });

  it('jumpPast delegates to service.resolveHardBlockByJumpingPast', async () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.jumpPast'] as (
      payload: unknown,
    ) => Promise<void>)({
      blockedSceneId: 'scene-3',
      direction: 'forward',
    });
    expect(service.resolveHardBlockByJumpingPast).toHaveBeenCalledWith(
      'stac://plot.json',
      'scene-3',
      'forward',
    );
  });

  it('jumpPast is no-op when payload is malformed', async () => {
    const service = makeService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardTransportCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardTransportCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardTransportCommands>[2],
    );
    await (registered['debrief.storyboard.jumpPast'] as (
      payload: unknown,
    ) => Promise<void>)({ notABlockedSceneId: true });
    expect(service.resolveHardBlockByJumpingPast).not.toHaveBeenCalled();
  });
});
