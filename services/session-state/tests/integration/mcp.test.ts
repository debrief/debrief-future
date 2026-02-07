/**
 * MCP tool integration tests.
 * Feature: 024-document-session-state
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/index.js';
import { createSessionStore, type SessionStoreApi } from '../../src/store/index.js';
import type { Express } from 'express';

describe('MCP Integration', () => {
  let store: SessionStoreApi;
  let app: Express;

  beforeEach(() => {
    store = createSessionStore();
    app = createApp(store);
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /mcp/tools', () => {
    it('should list available tools', async () => {
      const response = await request(app).get('/mcp/tools');

      expect(response.status).toBe(200);
      expect(response.body.tools).toBeDefined();
      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.tools.some((t: { name: string }) => t.name === 'session.getState')).toBe(true);
    });
  });

  describe('POST /mcp - session.getState', () => {
    it('should return full state', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.getState', input: {} });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.state).toBeDefined();
      expect(response.body.state.temporal).toBeDefined();
      expect(response.body.state.spatial).toBeDefined();
      expect(response.body.state.features).toBeDefined();
      expect(response.body.state.document).toBeDefined();
    });

    it('should return specific slice', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.getState', input: { slice: 'temporal' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.state.playbackState).toBeDefined();
      expect(response.body.state.displayMode).toBeDefined();
    });
  });

  describe('POST /mcp - session.setCurrentTime', () => {
    it('should set time with epoch', async () => {
      const epoch = 1706097600000;

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setCurrentTime', input: { epoch } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.currentTime.epoch).toBe(epoch);
      expect(response.body.currentTime.iso).toBeDefined();

      // Verify store was updated
      expect(store.getState().currentTime?.epoch).toBe(epoch);
    });

    it('should set time with ISO string', async () => {
      const iso = '2024-01-24T12:00:00.000Z';

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setCurrentTime', input: { iso } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.currentTime.iso).toBe(iso);
    });

    it('should fail without epoch or iso', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setCurrentTime', input: {} });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /mcp - session.setViewport', () => {
    it('should set viewport', async () => {
      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [-5, 55],
        [5, 55],
        [5, 50],
        [-5, 50],
      ];

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setViewport', input: { coordinates } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.viewport.coordinates).toEqual(coordinates);
      expect(response.body.center).toEqual([0, 52.5]);
    });

    it('should reject invalid coordinates', async () => {
      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [-200, 55], // Invalid longitude
        [5, 55],
        [5, 50],
        [-5, 50],
      ];

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setViewport', input: { coordinates } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /mcp - session.setSelection', () => {
    it('should set selection', async () => {
      const featureIds = ['track-001', 'track-002'];

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setSelection', input: { featureIds } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.selection.featureIds).toEqual(featureIds);
      expect(response.body.selection.primary).toBe('track-001');
    });

    it('should clear selection', async () => {
      // First set a selection
      store.getState().setSelection(['track-001']);

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setSelection', input: { clear: true } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.selection.featureIds).toEqual([]);
    });
  });

  describe('POST /mcp - session.setHiddenFeatures', () => {
    it('should set hidden features', async () => {
      const featureIds = ['track-003', 'track-004'];

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setHiddenFeatures', input: { featureIds } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.hiddenFeatureIds).toEqual(featureIds);
    });

    it('should add to hidden features', async () => {
      store.getState().setHiddenFeatures(['track-001']);

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setHiddenFeatures', input: { add: ['track-002'] } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.hiddenFeatureIds).toContain('track-001');
      expect(response.body.hiddenFeatureIds).toContain('track-002');
    });

    it('should remove from hidden features', async () => {
      store.getState().setHiddenFeatures(['track-001', 'track-002']);

      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setHiddenFeatures', input: { remove: ['track-001'] } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.hiddenFeatureIds).not.toContain('track-001');
      expect(response.body.hiddenFeatureIds).toContain('track-002');
    });
  });

  describe('POST /mcp - session.setPlaybackRate', () => {
    it('should set playback rate', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setPlaybackRate', input: { rate: 2.5 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.playbackRate).toBe(2.5);

      // Verify store was updated
      expect(store.getState().playbackRate).toBe(2.5);
    });

    it('should reject rate below minimum', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setPlaybackRate', input: { rate: 0.05 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('0.1');
    });

    it('should reject rate above maximum', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setPlaybackRate', input: { rate: 150 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('100');
    });
  });

  describe('POST /mcp - session.setRotation', () => {
    it('should set rotation', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setRotation', input: { rotation: 45 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rotation).toBe(45);

      // Verify store was updated
      expect(store.getState().rotation).toBe(45);
    });

    it('should normalize rotation to 0-360 range', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setRotation', input: { rotation: 450 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rotation).toBe(90); // 450 % 360 = 90
    });

    it('should handle negative rotation', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'session.setRotation', input: { rotation: -90 } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rotation).toBe(270); // -90 normalized to 270
    });
  });

  describe('error handling', () => {
    it('should handle missing tool name', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ input: {} });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing tool name');
    });

    it('should handle unknown tool', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ tool: 'unknown.tool', input: {} });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unknown tool');
    });
  });
});
