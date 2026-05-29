/**
 * Unit tests for SessionManager
 *
 * Feature: 029-session-state-vscode
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager, type PlotSessionData } from '../../src/services/sessionManager';
import type { Plot, TrackViewModel, ReferenceLocationViewModel } from '../../src/types/plot';

type Track = TrackViewModel;
type ReferenceLocation = ReferenceLocationViewModel;

/**
 * Create mock plot data for testing.
 */
function createMockPlotData(overrides?: Partial<PlotSessionData>): PlotSessionData {
  const plot: Plot = {
    id: 'test-plot-1',
    title: 'Test Plot',
    datetime: '2024-01-15T10:00:00Z',
    itemPath: '/test/plot.json',
    catalogId: 'test-catalog',
    bbox: [-10, -10, 10, 10],
    timeExtent: ['2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z'],
    trackCount: 2,
    locationCount: 1,
  };

  const tracks: Track[] = [
    {
      id: 'track-1',
      name: 'Alpha',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      positions: [{ time: '2024-01-15T10:00:00Z' }, { time: '2024-01-15T11:00:00Z' }],
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T11:00:00Z',
      visible: true,
      selected: false,
    },
    {
      id: 'track-2',
      name: 'Bravo',
      geometry: { type: 'LineString', coordinates: [[0, 0], [2, 2]] },
      positions: [{ time: '2024-01-15T10:30:00Z' }, { time: '2024-01-15T12:00:00Z' }],
      startTime: '2024-01-15T10:30:00Z',
      endTime: '2024-01-15T12:00:00Z',
      visible: true,
      selected: false,
    },
  ];

  const locations: ReferenceLocation[] = [
    {
      id: 'loc-1',
      name: 'Waypoint Alpha',
      geometry: { type: 'Point', coordinates: [0, 0] },
      visible: true,
      selected: false,
    },
  ];

  return {
    plot,
    tracks,
    locations,
    featureCollectionUri: 'stac://store/catalog/test-plot-1',
    ...overrides,
  };
}

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a new session for a document', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      const session = sessionManager.createSession(uri, data);

      expect(session).toBeDefined();
      expect(sessionManager.hasSession(uri)).toBe(true);
      expect(sessionManager.getSessionCount()).toBe(1);
    });

    it('should initialize time range from plot extent', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      const session = sessionManager.createSession(uri, data);
      const state = session.getState();

      expect(state.timeRange).not.toBeNull();
      // Epoch refactor (Review Decision 5C): timeRange uses plain epoch ms
      expect(state.timeRange?.start).toBe(new Date('2024-01-15T10:00:00Z').getTime());
      expect(state.timeRange?.end).toBe(new Date('2024-01-15T12:00:00Z').getTime());
    });

    it('should set current time to start of range', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      const session = sessionManager.createSession(uri, data);
      const state = session.getState();

      expect(state.currentTime).not.toBeNull();
      // Epoch refactor (Review Decision 5C): currentTime is plain epoch ms
      expect(state.currentTime).toBe(new Date('2024-01-15T10:00:00Z').getTime());
    });

    it('should set feature collection URI', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData({
        featureCollectionUri: 'stac://custom/uri',
      });

      const session = sessionManager.createSession(uri, data);
      const state = session.getState();

      expect(state.featureCollectionUri).toBe('stac://custom/uri');
    });

    it('should return existing session if already created', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      const session1 = sessionManager.createSession(uri, data);
      const session2 = sessionManager.createSession(uri, data);

      expect(session1).toBe(session2);
      expect(sessionManager.getSessionCount()).toBe(1);
    });

    it('should set as active if no active document', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      sessionManager.createSession(uri, data);

      expect(sessionManager.getActiveDocumentUri()).toBe(uri);
    });
  });

  describe('getActiveSession', () => {
    it('should return null when no sessions exist', () => {
      expect(sessionManager.getActiveSession()).toBeNull();
    });

    it('should return the active session', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      const session = sessionManager.createSession(uri, data);

      expect(sessionManager.getActiveSession()).toBe(session);
    });
  });

  describe('getSession', () => {
    it('should return undefined for unknown URI', () => {
      expect(sessionManager.getSession('unknown-uri')).toBeUndefined();
    });

    it('should return session for known URI', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      const session = sessionManager.createSession(uri, data);

      expect(sessionManager.getSession(uri)).toBe(session);
    });
  });

  describe('setActiveDocument', () => {
    it('should update active document', () => {
      const uri1 = 'stac://store/catalog/plot-1';
      const uri2 = 'stac://store/catalog/plot-2';
      const data = createMockPlotData();

      sessionManager.createSession(uri1, data);
      sessionManager.createSession(uri2, createMockPlotData());

      sessionManager.setActiveDocument(uri2);

      expect(sessionManager.getActiveDocumentUri()).toBe(uri2);
    });

    it('should emit onActiveSessionChange event', () => {
      const uri1 = 'stac://store/catalog/plot-1';
      const uri2 = 'stac://store/catalog/plot-2';
      const data = createMockPlotData();

      const session1 = sessionManager.createSession(uri1, data);
      const session2 = sessionManager.createSession(uri2, createMockPlotData());

      const listener = vi.fn();
      sessionManager.onActiveSessionChange(listener);

      // Set to session 2
      sessionManager.setActiveDocument(uri2);

      expect(listener).toHaveBeenCalledWith(session2);
    });

    it('should not emit event when setting same document', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      sessionManager.createSession(uri, data);

      const listener = vi.fn();
      sessionManager.onActiveSessionChange(listener);

      sessionManager.setActiveDocument(uri);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit null when setting to null', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      sessionManager.createSession(uri, data);

      const listener = vi.fn();
      sessionManager.onActiveSessionChange(listener);

      sessionManager.setActiveDocument(null);

      expect(listener).toHaveBeenCalledWith(null);
      expect(sessionManager.getActiveDocumentUri()).toBeNull();
    });
  });

  describe('disposeSession', () => {
    it('should remove session from cache', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      sessionManager.createSession(uri, data);
      sessionManager.disposeSession(uri);

      expect(sessionManager.hasSession(uri)).toBe(false);
      expect(sessionManager.getSessionCount()).toBe(0);
    });

    it('should clear active if disposing active session', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      sessionManager.createSession(uri, data);
      sessionManager.disposeSession(uri);

      expect(sessionManager.getActiveDocumentUri()).toBeNull();
    });

    it('should emit null session on dispose of active', () => {
      const uri = 'stac://store/catalog/plot-1';
      const data = createMockPlotData();

      sessionManager.createSession(uri, data);

      const listener = vi.fn();
      sessionManager.onActiveSessionChange(listener);

      sessionManager.disposeSession(uri);

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should not affect other sessions', () => {
      const uri1 = 'stac://store/catalog/plot-1';
      const uri2 = 'stac://store/catalog/plot-2';

      sessionManager.createSession(uri1, createMockPlotData());
      sessionManager.createSession(uri2, createMockPlotData());

      sessionManager.setActiveDocument(uri2);
      sessionManager.disposeSession(uri1);

      expect(sessionManager.hasSession(uri2)).toBe(true);
      expect(sessionManager.getActiveDocumentUri()).toBe(uri2);
    });

    it('should do nothing for unknown URI', () => {
      sessionManager.disposeSession('unknown-uri');
      expect(sessionManager.getSessionCount()).toBe(0);
    });
  });

  describe('getSessionUris', () => {
    it('should return empty array when no sessions', () => {
      expect(sessionManager.getSessionUris()).toEqual([]);
    });

    it('should return all session URIs', () => {
      const uri1 = 'stac://store/catalog/plot-1';
      const uri2 = 'stac://store/catalog/plot-2';

      sessionManager.createSession(uri1, createMockPlotData());
      sessionManager.createSession(uri2, createMockPlotData());

      const uris = sessionManager.getSessionUris();

      expect(uris).toContain(uri1);
      expect(uris).toContain(uri2);
      expect(uris.length).toBe(2);
    });
  });

  describe('dispose', () => {
    it('should clear all sessions', () => {
      sessionManager.createSession('uri1', createMockPlotData());
      sessionManager.createSession('uri2', createMockPlotData());

      sessionManager.dispose();

      expect(sessionManager.getSessionCount()).toBe(0);
      expect(sessionManager.getActiveDocumentUri()).toBeNull();
    });
  });

  describe('multi-document switching', () => {
    it('should preserve session state when switching documents', () => {
      const uri1 = 'stac://store/catalog/plot-1';
      const uri2 = 'stac://store/catalog/plot-2';

      const session1 = sessionManager.createSession(uri1, createMockPlotData());
      const session2 = sessionManager.createSession(uri2, createMockPlotData());

      // Modify session1 state
      session1.getState().setSelection(['track-1'], 'track-1');

      // Switch to session2
      sessionManager.setActiveDocument(uri2);

      // Modify session2 state
      session2.getState().setSelection(['track-2'], 'track-2');

      // Switch back to session1
      sessionManager.setActiveDocument(uri1);

      // Verify session1 still has its state
      const state1 = session1.getState();
      expect(state1.selection.featureIds).toContain('track-1');

      // Verify session2 still has its state
      const state2 = session2.getState();
      expect(state2.selection.featureIds).toContain('track-2');
    });
  });

  describe('disposeAllSessions', () => {
    it('should remove all sessions', () => {
      sessionManager.createSession('uri1', createMockPlotData());
      sessionManager.createSession('uri2', createMockPlotData());

      sessionManager.disposeAllSessions();

      expect(sessionManager.getSessionCount()).toBe(0);
      expect(sessionManager.hasSession('uri1')).toBe(false);
      expect(sessionManager.hasSession('uri2')).toBe(false);
    });

    it('should clear active document', () => {
      sessionManager.createSession('uri1', createMockPlotData());

      sessionManager.disposeAllSessions();

      expect(sessionManager.getActiveDocumentUri()).toBeNull();
      expect(sessionManager.getActiveSession()).toBeNull();
    });

    it('should emit null session change event', () => {
      sessionManager.createSession('uri1', createMockPlotData());

      const listener = vi.fn();
      sessionManager.onActiveSessionChange(listener);

      sessionManager.disposeAllSessions();

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should not emit event if no active document', () => {
      // Create then dispose the session first
      sessionManager.createSession('uri1', createMockPlotData());
      sessionManager.setActiveDocument(null);

      const listener = vi.fn();
      sessionManager.onActiveSessionChange(listener);

      sessionManager.disposeAllSessions();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('MCP server management', () => {
    it('should have default MCP port of 3001', () => {
      expect(sessionManager.getMcpPort()).toBe(3001);
    });

    it('should update MCP port via setMcpPort', () => {
      sessionManager.setMcpPort(4000);
      expect(sessionManager.getMcpPort()).toBe(4000);
    });

    it('should report server not running initially', () => {
      expect(sessionManager.isMcpServerRunning()).toBe(false);
    });

    // Note: Full MCP server tests require actual HTTP server
    // which would need integration tests. Unit tests here
    // verify the interface exists and basic state management works.
  });

  describe('dirty session tracking (Feature: 029 - T057/T058)', () => {
    it('should return false for hasDirtySessions when no sessions', () => {
      expect(sessionManager.hasDirtySessions()).toBe(false);
    });

    it('should return false for hasDirtySessions when all sessions are clean', () => {
      const session = sessionManager.createSession('uri1', createMockPlotData());
      // Sessions start clean after creation
      session.getState().markClean();

      expect(sessionManager.hasDirtySessions()).toBe(false);
    });

    it('should return true for hasDirtySessions when session is modified', () => {
      const session = sessionManager.createSession('uri1', createMockPlotData());
      // Feature 261 (FR-021): a content edit marks dirty (view-state
      // changes like setSelection are exploration and do not — FR-019).
      session.getState().markDirty();

      expect(sessionManager.hasDirtySessions()).toBe(true);
    });

    it('should return 0 for getDirtySessionCount when no sessions', () => {
      expect(sessionManager.getDirtySessionCount()).toBe(0);
    });

    it('should count dirty sessions correctly', () => {
      const session1 = sessionManager.createSession('uri1', createMockPlotData());
      const session2 = sessionManager.createSession('uri2', createMockPlotData());

      // Make both clean first
      session1.getState().markClean();
      session2.getState().markClean();

      // Make only session1 dirty (content edit — FR-021)
      session1.getState().markDirty();

      expect(sessionManager.getDirtySessionCount()).toBe(1);

      // Make session2 dirty too (content edit — FR-021)
      session2.getState().markDirty();

      expect(sessionManager.getDirtySessionCount()).toBe(2);
    });

    it('should update dirty count when session is marked clean', () => {
      const session = sessionManager.createSession('uri1', createMockPlotData());
      session.getState().markDirty();

      expect(sessionManager.getDirtySessionCount()).toBe(1);

      session.getState().markClean();

      expect(sessionManager.getDirtySessionCount()).toBe(0);
    });
  });
});
