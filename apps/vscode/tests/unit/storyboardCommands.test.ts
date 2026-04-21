/**
 * @vitest-environment node
 *
 * Unit tests for US1 command handlers (Feature 217, T330).
 *
 * The handlers are thin dispatchers — each looks up the active
 * document URI, returns early if null, then delegates to the
 * `StoryboardPlaybackService`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { registerStoryboardTransportCommands } from '../../src/commands/storyboardTransport';
import {
  registerStoryboardManagementCommands,
  validateStoryboardName,
} from '../../src/commands/storyboardManagement';
import type { StoryboardOptionViewModel } from '@debrief/components';

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

// ─── Phase 4 / US2 — Management commands (T430-T432) ───────────────────

function opt(
  storyboardId: string,
  name = storyboardId.toUpperCase(),
  sceneCount = 1,
): StoryboardOptionViewModel {
  return {
    storyboardId,
    name,
    sceneCount,
    lastModifiedIso: '2026-04-20T14:00:00.000Z',
  };
}

function makeManagementService(): {
  createStoryboard: ReturnType<typeof vi.fn>;
  renameStoryboard: ReturnType<typeof vi.fn>;
  deleteStoryboard: ReturnType<typeof vi.fn>;
  getSnapshot: ReturnType<typeof vi.fn>;
  snapshot: {
    storyboards: StoryboardOptionViewModel[];
    activeStoryboardId: string | null;
    scenes: Array<{ sceneId: string }>;
  };
} {
  const snapshot = {
    storyboards: [opt('sb-a', 'Alpha'), opt('sb-b', 'Bravo')],
    activeStoryboardId: 'sb-a' as string | null,
    scenes: [{ sceneId: 's1' }, { sceneId: 's2' }, { sceneId: 's3' }],
  };
  return {
    createStoryboard: vi.fn(() => Promise.resolve()),
    renameStoryboard: vi.fn(() => Promise.resolve()),
    deleteStoryboard: vi.fn(() => Promise.resolve()),
    getSnapshot: vi.fn(() => snapshot),
    snapshot,
  };
}

describe('validateStoryboardName', () => {
  it('returns null for a valid name', () => {
    expect(
      validateStoryboardName('Valid', [opt('sb-x', 'Other')], undefined),
    ).toBeNull();
  });

  it('returns an error for an empty / whitespace-only name', () => {
    expect(validateStoryboardName('', [])).toMatch(/empty/i);
    expect(validateStoryboardName('   ', [])).toMatch(/empty/i);
  });

  it('returns an error for names longer than 120 characters', () => {
    const tooLong = 'a'.repeat(121);
    expect(validateStoryboardName(tooLong, [])).toMatch(/long/i);
  });

  it('returns an error when candidate collides with an existing name', () => {
    expect(
      validateStoryboardName('Alpha', [opt('sb-a', 'Alpha')], undefined),
    ).toMatch(/already exists/i);
  });

  it('allows a no-op rename (same name, ignoreId matches)', () => {
    expect(
      validateStoryboardName('Alpha', [opt('sb-a', 'Alpha')], 'sb-a'),
    ).toBeNull();
  });

  it('blocks rename if the new name collides with a different Storyboard', () => {
    expect(
      validateStoryboardName(
        'Bravo',
        [opt('sb-a', 'Alpha'), opt('sb-b', 'Bravo')],
        'sb-a',
      ),
    ).toMatch(/already exists/i);
  });

  it('trims whitespace before collision check', () => {
    expect(
      validateStoryboardName('  Alpha  ', [opt('sb-a', 'Alpha')], undefined),
    ).toMatch(/already exists/i);
  });
});

describe('registerStoryboardManagementCommands', () => {
  let registered: RegisteredCommands;
  let showInputBoxSpy: ReturnType<typeof vi.fn>;
  let showWarningMessageSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registered = {};
    vi.spyOn(vscode.commands, 'registerCommand').mockImplementation(
      (commandId: string, callback: (...args: unknown[]) => unknown) => {
        registered[commandId] = callback;
        return { dispose: (): void => undefined } as vscode.Disposable;
      },
    );
    // The mock exports `window.showInputBox` as a `vi.fn()`; mockReset
    // (configured in vitest.config.ts) wipes it between tests, so we
    // need to reinstall a mock implementation on each test.
    showInputBoxSpy = vi.fn() as unknown as ReturnType<typeof vi.fn>;
    showWarningMessageSpy = vi.fn() as unknown as ReturnType<typeof vi.fn>;
    (vscode.window as unknown as { showInputBox: unknown }).showInputBox =
      showInputBoxSpy;
    (vscode.window as unknown as { showWarningMessage: unknown }).showWarningMessage =
      showWarningMessageSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers create/rename/delete commands', () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    expect(registered['debrief.storyboard.create']).toBeTypeOf('function');
    expect(registered['debrief.storyboard.rename']).toBeTypeOf('function');
    expect(registered['debrief.storyboard.delete']).toBeTypeOf('function');
  });

  // ── Create ────────────────────────────────────────────────────────

  it('create: calls showInputBox with validateStoryboardName, invokes service on non-empty name', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showInputBoxSpy.mockResolvedValue('Bravo');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.create'] as () => Promise<void>)();
    expect(showInputBoxSpy).toHaveBeenCalledTimes(1);
    const options = showInputBoxSpy.mock.calls[0]![0] as vscode.InputBoxOptions;
    expect(typeof options.validateInput).toBe('function');
    // Confirm the supplied validator blocks duplicates.
    const validator = options.validateInput as (v: string) => string | null;
    expect(validator('Alpha')).toMatch(/already exists/i);
    expect(service.createStoryboard).toHaveBeenCalledWith(
      'stac://plot.json',
      'Bravo',
    );
  });

  it('create: user cancel (undefined return) → no service call', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showInputBoxSpy.mockResolvedValue(undefined);
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.create'] as () => Promise<void>)();
    expect(service.createStoryboard).not.toHaveBeenCalled();
  });

  it('create: whitespace-only input → no service call', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showInputBoxSpy.mockResolvedValue('   ');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.create'] as () => Promise<void>)();
    expect(service.createStoryboard).not.toHaveBeenCalled();
  });

  it('create: returns silently when documentUri is null', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager(null);
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.create'] as () => Promise<void>)();
    expect(showInputBoxSpy).not.toHaveBeenCalled();
    expect(service.createStoryboard).not.toHaveBeenCalled();
  });

  // ── Rename ────────────────────────────────────────────────────────

  it('rename: pre-populates with current name, invokes service on changed name', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showInputBoxSpy.mockResolvedValue('Alpha-Prime');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.rename'] as () => Promise<void>)();
    const options = showInputBoxSpy.mock.calls[0]![0] as vscode.InputBoxOptions;
    expect(options.value).toBe('Alpha');
    expect(service.renameStoryboard).toHaveBeenCalledWith(
      'stac://plot.json',
      'sb-a',
      'Alpha-Prime',
    );
  });

  it('rename: no-op when new name is unchanged', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showInputBoxSpy.mockResolvedValue('Alpha');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.rename'] as () => Promise<void>)();
    expect(service.renameStoryboard).not.toHaveBeenCalled();
  });

  it('rename: validator permits the existing name (ignoreId = activeStoryboardId)', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showInputBoxSpy.mockResolvedValue('Alpha-Prime');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.rename'] as () => Promise<void>)();
    const options = showInputBoxSpy.mock.calls[0]![0] as vscode.InputBoxOptions;
    const validator = options.validateInput as (v: string) => string | null;
    expect(validator('Alpha')).toBeNull(); // allowed — self
    expect(validator('Bravo')).toMatch(/already exists/i); // blocked — other
  });

  it('rename: returns silently when no active Storyboard', async () => {
    const service = makeManagementService();
    service.snapshot.activeStoryboardId = null;
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.rename'] as () => Promise<void>)();
    expect(showInputBoxSpy).not.toHaveBeenCalled();
    expect(service.renameStoryboard).not.toHaveBeenCalled();
  });

  // ── Delete ────────────────────────────────────────────────────────

  it('delete: non-empty Storyboard prompts showWarningMessage with Scene count', async () => {
    const service = makeManagementService();
    // 3 scenes in the snapshot
    const sm = makeSessionManager('stac://plot.json');
    showWarningMessageSpy.mockResolvedValue('Delete');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.delete'] as () => Promise<void>)();
    expect(showWarningMessageSpy).toHaveBeenCalledTimes(1);
    const [msg, options] = showWarningMessageSpy.mock.calls[0]!;
    expect(msg as string).toMatch(/3 scene/i);
    expect((options as { modal?: boolean }).modal).toBe(true);
    expect(service.deleteStoryboard).toHaveBeenCalledWith(
      'stac://plot.json',
      'sb-a',
    );
  });

  it('delete: empty Storyboard skips confirmation and calls service directly', async () => {
    const service = makeManagementService();
    service.snapshot.scenes = [];
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.delete'] as () => Promise<void>)();
    expect(showWarningMessageSpy).not.toHaveBeenCalled();
    expect(service.deleteStoryboard).toHaveBeenCalledWith(
      'stac://plot.json',
      'sb-a',
    );
  });

  it('delete: Cancel choice leaves state unchanged', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showWarningMessageSpy.mockResolvedValue('Cancel');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.delete'] as () => Promise<void>)();
    expect(service.deleteStoryboard).not.toHaveBeenCalled();
  });

  it('delete: undefined (dismissed modal) leaves state unchanged', async () => {
    const service = makeManagementService();
    const sm = makeSessionManager('stac://plot.json');
    showWarningMessageSpy.mockResolvedValue(undefined);
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.delete'] as () => Promise<void>)();
    expect(service.deleteStoryboard).not.toHaveBeenCalled();
  });

  it('delete: returns silently when no active Storyboard', async () => {
    const service = makeManagementService();
    service.snapshot.activeStoryboardId = null;
    const sm = makeSessionManager('stac://plot.json');
    registerStoryboardManagementCommands(
      makeContext(),
      service as unknown as Parameters<typeof registerStoryboardManagementCommands>[1],
      sm as unknown as Parameters<typeof registerStoryboardManagementCommands>[2],
    );
    await (registered['debrief.storyboard.delete'] as () => Promise<void>)();
    expect(showWarningMessageSpy).not.toHaveBeenCalled();
    expect(service.deleteStoryboard).not.toHaveBeenCalled();
  });
});
