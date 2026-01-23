import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import type { ExtensionContext, WorkspaceConfiguration } from 'vscode';
import { ActivityBarService } from '../../src/services/activityBarService';

describe('ActivityBarService', () => {
  let mockContext: ExtensionContext;
  let mockGlobalState: Map<string, unknown>;
  let mockConfig: Record<string, unknown>;

  beforeEach(() => {
    mockGlobalState = new Map();
    mockConfig = {
      'hideActivities.enabled': true,
    };

    mockContext = {
      globalState: {
        get: vi.fn((key: string, defaultValue?: unknown) => {
          return mockGlobalState.has(key) ? mockGlobalState.get(key) : defaultValue;
        }),
        update: vi.fn((key: string, value: unknown) => {
          mockGlobalState.set(key, value);
          return Promise.resolve();
        }),
      },
    } as unknown as ExtensionContext;

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((_section?: string) => {
      return {
        get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined => {
          const value = mockConfig[key];
          return (value !== undefined ? value : defaultValue) as T | undefined;
        }),
        update: vi.fn(),
        has: vi.fn(),
        inspect: vi.fn(),
      } as unknown as WorkspaceConfiguration;
    });

    // Mock window.showInformationMessage
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('returns true when hideActivities.enabled is true', () => {
      const service = new ActivityBarService(mockContext);
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when hideActivities.enabled is false', () => {
      mockConfig['hideActivities.enabled'] = false;
      const service = new ActivityBarService(mockContext);
      expect(service.isEnabled()).toBe(false);
    });

    it('defaults to true when setting is not configured', () => {
      delete mockConfig['hideActivities.enabled'];
      const service = new ActivityBarService(mockContext);
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('applyDefaults', () => {
    it('shows prompt on first activation', async () => {
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('focused analysis'),
        'Learn More',
        'Got It'
      );
    });

    it('does not show prompt when feature is disabled', async () => {
      mockConfig['hideActivities.enabled'] = false;
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('does not show prompt on subsequent activations', async () => {
      mockGlobalState.set('hideActivities.prompted', true);
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('does not show prompt if user dismissed it', async () => {
      mockGlobalState.set('hideActivities.dismissed', true);
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('sets prompted state after showing prompt', async () => {
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(mockGlobalState.get('hideActivities.prompted')).toBe(true);
    });

    it('opens docs when user clicks Learn More', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Learn More' as unknown as undefined);
      vi.mocked(vscode.env.openExternal).mockResolvedValue(true);

      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(vscode.env.openExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          scheme: 'https',
        })
      );
    });

    it('sets dismissed state when user clicks Got It', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Got It' as unknown as undefined);

      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(mockGlobalState.get('hideActivities.dismissed')).toBe(true);
    });
  });

  describe('restoreDefaults', () => {
    it('shows instructions message', async () => {
      const service = new ActivityBarService(mockContext);
      await service.restoreDefaults();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Right-click the activity bar'),
        'Learn More'
      );
    });

    it('opens docs when user clicks Learn More', async () => {
      vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Learn More' as unknown as undefined);
      vi.mocked(vscode.env.openExternal).mockResolvedValue(true);

      const service = new ActivityBarService(mockContext);
      await service.restoreDefaults();

      expect(vscode.env.openExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          scheme: 'https',
        })
      );
    });
  });
});
