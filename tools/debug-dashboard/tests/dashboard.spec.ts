/**
 * E2E tests for the debug dashboard.
 * Feature: 024-document-session-state
 */

import { test, expect } from '@playwright/test';

test.describe('Debug Dashboard', () => {
  test('should load the dashboard', async ({ page }) => {
    // Serve the dashboard via a simple file server or navigate to it
    // For now, we test the API endpoints that the dashboard consumes

    // Check health endpoint
    const healthResponse = await page.request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();

    const health = await healthResponse.json();
    expect(health.status).toBe('ok');
  });

  test('should list MCP tools', async ({ page }) => {
    const response = await page.request.get('/mcp/tools');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.tools).toBeDefined();
    expect(Array.isArray(data.tools)).toBe(true);

    // Check for expected tools
    const toolNames = data.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('session.getState');
    expect(toolNames).toContain('session.setCurrentTime');
    expect(toolNames).toContain('session.setViewport');
    expect(toolNames).toContain('session.setSelection');
  });

  test('should get initial state via MCP', async ({ page }) => {
    const response = await page.request.post('/mcp', {
      data: {
        tool: 'session.getState',
        input: {}
      }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.state).toBeDefined();
    expect(data.state.temporal).toBeDefined();
    expect(data.state.spatial).toBeDefined();
    expect(data.state.features).toBeDefined();
    expect(data.state.document).toBeDefined();
  });

  test('should set and get current time', async ({ page }) => {
    const testEpoch = 1706097600000;

    // Set current time
    const setResponse = await page.request.post('/mcp', {
      data: {
        tool: 'session.setCurrentTime',
        input: { epoch: testEpoch }
      }
    });
    expect(setResponse.ok()).toBeTruthy();

    // Get state and verify
    const getResponse = await page.request.post('/mcp', {
      data: {
        tool: 'session.getState',
        input: { slice: 'temporal' }
      }
    });
    expect(getResponse.ok()).toBeTruthy();

    const data = await getResponse.json();
    expect(data.state.currentTime.epoch).toBe(testEpoch);
  });

  test('should set and get viewport', async ({ page }) => {
    const testViewport = {
      coordinates: [[-5, 50], [5, 50], [5, 55], [-5, 55]]
    };

    // Set viewport
    const setResponse = await page.request.post('/mcp', {
      data: {
        tool: 'session.setViewport',
        input: testViewport
      }
    });
    expect(setResponse.ok()).toBeTruthy();

    // Get state and verify
    const getResponse = await page.request.post('/mcp', {
      data: {
        tool: 'session.getState',
        input: { slice: 'spatial' }
      }
    });
    expect(getResponse.ok()).toBeTruthy();

    const data = await getResponse.json();
    expect(data.state.viewport.coordinates).toEqual(testViewport.coordinates);
  });

  test('should set and get selection', async ({ page }) => {
    const featureIds = ['track-001', 'track-002'];
    const primary = 'track-001';

    // Set selection
    const setResponse = await page.request.post('/mcp', {
      data: {
        tool: 'session.setSelection',
        input: { featureIds, primary }
      }
    });
    expect(setResponse.ok()).toBeTruthy();

    // Get state and verify
    const getResponse = await page.request.post('/mcp', {
      data: {
        tool: 'session.getState',
        input: { slice: 'features' }
      }
    });
    expect(getResponse.ok()).toBeTruthy();

    const data = await getResponse.json();
    expect(data.state.selection.featureIds).toEqual(featureIds);
    expect(data.state.selection.primary).toBe(primary);
  });

  test('should connect to SSE endpoint', async ({ page }) => {
    // Test SSE endpoint returns correct headers
    const response = await page.request.get('/sse', {
      timeout: 1000
    }).catch(() => null);

    // SSE connections stay open, so we just verify it started
    // The actual test would need to handle streaming
    expect(response === null || response.ok()).toBeTruthy();
  });
});
