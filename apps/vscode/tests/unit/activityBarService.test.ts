import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import type { ExtensionContext, WorkspaceConfiguration } from 'vscode';
import { ActivityBarService, PinnedViewlet } from '../../src/services/activityBarService';

describe('ActivityBarService', () => {
  let mockContext: ExtensionContext;
  let mockGlobalState: Map<string, unknown>;
  let mockConfig: Record<string, unknown>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    mockGlobalState = new Map();
    mockUpdate = vi.fn().mockResolvedValue(undefined);
    mockConfig = {
      'debrief.hideActivities.enabled': true,
      'debrief.hideActivities.viewIds': [
        'workbench.view.search',
        'workbench.view.scm',
        'workbench.view.debug',
        'workbench.view.extensions',
        'workbench.view.testing',
      ],
      'workbench.activity.pinnedViewlets2': [
        { id: 'workbench.view.explorer', pinned: true, visible: true, order: 0 },
        { id: 'workbench.view.search', pinned: true, visible: true, order: 1 },
        { id: 'workbench.view.scm', pinned: true, visible: true, order: 2 },
        { id: 'workbench.view.debug', pinned: true, visible: true, order: 3 },
        { id: 'workbench.view.extensions', pinned: true, visible: true, order: 4 },
        { id: 'workbench.view.testing', pinned: true, visible: true, order: 5 },
        { id: 'workbench.views.service.debrief', pinned: true, visible: true, order: 6 },
      ],
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

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      return {
        get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined => {
          const fullKey = section ? `${section}.${key}` : key;
          const value = mockConfig[fullKey];
          return (value !== undefined ? value : defaultValue) as T | undefined;
        }),
        update: mockUpdate,
      } as unknown as vscode.WorkspaceConfiguration;
    });
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
      mockConfig['debrief.hideActivities.enabled'] = false;
      const service = new ActivityBarService(mockContext);
      expect(service.isEnabled()).toBe(false);
    });

    it('defaults to true when setting is not configured', () => {
      delete mockConfig['debrief.hideActivities.enabled'];
      const service = new ActivityBarService(mockContext);
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('getTargetViewIds', () => {
    it('returns the default list of view IDs to hide', () => {
      const service = new ActivityBarService(mockContext);
      const viewIds = service.getTargetViewIds();

      expect(viewIds).toContain('workbench.view.search');
      expect(viewIds).toContain('workbench.view.scm');
      expect(viewIds).toContain('workbench.view.debug');
      expect(viewIds).toContain('workbench.view.extensions');
      expect(viewIds).toContain('workbench.view.testing');
      expect(viewIds).toHaveLength(5);
    });

    it('returns custom view IDs when configured', () => {
      mockConfig['debrief.hideActivities.viewIds'] = ['workbench.view.search'];
      const service = new ActivityBarService(mockContext);
      const viewIds = service.getTargetViewIds();

      expect(viewIds).toEqual(['workbench.view.search']);
    });
  });

  describe('applyDefaults', () => {
    it('hides target activities on first run', async () => {
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(mockUpdate).toHaveBeenCalledWith(
        'activity.pinnedViewlets2',
        expect.arrayContaining([
          expect.objectContaining({ id: 'workbench.view.explorer', visible: true }),
          expect.objectContaining({ id: 'workbench.view.search', visible: false }),
          expect.objectContaining({ id: 'workbench.view.scm', visible: false }),
          expect.objectContaining({ id: 'workbench.view.debug', visible: false }),
          expect.objectContaining({ id: 'workbench.view.extensions', visible: false }),
          expect.objectContaining({ id: 'workbench.view.testing', visible: false }),
          expect.objectContaining({ id: 'workbench.views.service.debrief', visible: true }),
        ]),
        vscode.ConfigurationTarget.Global
      );
    });

    it('does not hide activities when feature is disabled', async () => {
      mockConfig['debrief.hideActivities.enabled'] = false;
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does not re-hide on subsequent activations', async () => {
      mockGlobalState.set('hideActivities.initialized', true);
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('sets initialization state after first run', async () => {
      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      expect(mockGlobalState.get('hideActivities.initialized')).toBe(true);
    });
  });

  describe('protected views', () => {
    it('never hides Explorer view even if in target list', async () => {
      mockConfig['debrief.hideActivities.viewIds'] = [
        'workbench.view.explorer',
        'workbench.view.search',
      ];

      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      const updateCall = mockUpdate.mock.calls[0];
      const modifiedViewlets = updateCall[1] as PinnedViewlet[];
      const explorer = modifiedViewlets.find((v) => v.id === 'workbench.view.explorer');

      expect(explorer?.visible).toBe(true);
    });

    it('never hides Debrief view even if in target list', async () => {
      mockConfig['debrief.hideActivities.viewIds'] = [
        'workbench.views.service.debrief',
        'workbench.view.search',
      ];

      const service = new ActivityBarService(mockContext);
      await service.applyDefaults();

      const updateCall = mockUpdate.mock.calls[0];
      const modifiedViewlets = updateCall[1] as PinnedViewlet[];
      const debrief = modifiedViewlets.find((v) => v.id === 'workbench.views.service.debrief');

      expect(debrief?.visible).toBe(true);
    });
  });

  describe('detectUserOverrides', () => {
    it('detects when user has re-enabled a hidden activity', () => {
      const snapshot: PinnedViewlet[] = [
        { id: 'workbench.view.search', pinned: true, visible: false, order: 1 },
      ];
      mockGlobalState.set('hideActivities.lastSnapshot', JSON.stringify(snapshot));
      mockConfig['workbench.activity.pinnedViewlets2'] = [
        { id: 'workbench.view.search', pinned: true, visible: true, order: 1 },
      ];

      const service = new ActivityBarService(mockContext);
      const overrides = service.detectUserOverrides();

      expect(overrides).toContain('workbench.view.search');
    });

    it('returns empty array when no overrides detected', () => {
      const snapshot: PinnedViewlet[] = [
        { id: 'workbench.view.search', pinned: true, visible: false, order: 1 },
      ];
      mockGlobalState.set('hideActivities.lastSnapshot', JSON.stringify(snapshot));
      mockConfig['workbench.activity.pinnedViewlets2'] = [
        { id: 'workbench.view.search', pinned: true, visible: false, order: 1 },
      ];

      const service = new ActivityBarService(mockContext);
      const overrides = service.detectUserOverrides();

      expect(overrides).toEqual([]);
    });

    it('returns empty array when no snapshot exists', () => {
      const service = new ActivityBarService(mockContext);
      const overrides = service.detectUserOverrides();

      expect(overrides).toEqual([]);
    });
  });

  describe('restoreDefaults', () => {
    it('sets all activities to visible', async () => {
      mockConfig['workbench.activity.pinnedViewlets2'] = [
        { id: 'workbench.view.search', pinned: true, visible: false, order: 1 },
        { id: 'workbench.view.scm', pinned: true, visible: false, order: 2 },
      ];

      const service = new ActivityBarService(mockContext);
      await service.restoreDefaults();

      expect(mockUpdate).toHaveBeenCalledWith(
        'activity.pinnedViewlets2',
        [
          { id: 'workbench.view.search', pinned: true, visible: true, order: 1 },
          { id: 'workbench.view.scm', pinned: true, visible: true, order: 2 },
        ],
        vscode.ConfigurationTarget.Global
      );
    });

    it('clears initialization state', async () => {
      mockGlobalState.set('hideActivities.initialized', true);
      mockConfig['workbench.activity.pinnedViewlets2'] = [];

      const service = new ActivityBarService(mockContext);
      await service.restoreDefaults();

      expect(mockGlobalState.get('hideActivities.initialized')).toBe(false);
    });

    it('clears snapshot state', async () => {
      mockGlobalState.set('hideActivities.lastSnapshot', '[]');
      mockConfig['workbench.activity.pinnedViewlets2'] = [];

      const service = new ActivityBarService(mockContext);
      await service.restoreDefaults();

      expect(mockGlobalState.get('hideActivities.lastSnapshot')).toBeUndefined();
    });

    it('allows feature to re-apply after restore when re-enabled', async () => {
      mockConfig['workbench.activity.pinnedViewlets2'] = [];

      const service = new ActivityBarService(mockContext);
      await service.restoreDefaults();

      // Now simulate extension reactivation with full viewlets list
      mockConfig['workbench.activity.pinnedViewlets2'] = [
        { id: 'workbench.view.explorer', pinned: true, visible: true, order: 0 },
        { id: 'workbench.view.search', pinned: true, visible: true, order: 1 },
      ];

      await service.applyDefaults();

      // Should have been called twice: once for restore, once for re-apply
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
