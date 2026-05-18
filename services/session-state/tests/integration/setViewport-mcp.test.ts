/**
 * Spec 260 — end-to-end MCP integration test for the viewport-lock reject
 * branch on `session.setViewport` (T039).
 *
 * Where `tests/unit/server/setViewport-locked.test.ts` exercises the
 * `setViewport` function in isolation, this test drives the actual MCP
 * HTTP transport via supertest, asserting that the envelope a remote
 * caller observes carries `errorCode: 'VIEWPORT_LOCKED'` at the
 * JSON-RPC level. Mirror of the existing `mcp.test.ts` setup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/server/index.js';
import { createSessionStore, type SessionStoreApi } from '../../src/store/index.js';

const VALID_FOUR_CORNERS = [
  { longitude: -5, latitude: 55 },
  { longitude: 5, latitude: 55 },
  { longitude: 5, latitude: 50 },
  { longitude: -5, latitude: 50 },
];

describe('MCP integration — session.setViewport reject-while-locked (spec 260)', () => {
  let store: SessionStoreApi;
  let app: Express;

  beforeEach(() => {
    store = createSessionStore();
    app = createApp(store);
  });

  it('returns errorCode VIEWPORT_LOCKED over the JSON-RPC envelope when locked', async () => {
    store.getState().setViewportLocked(true);

    const response = await request(app)
      .post('/mcp')
      .send({
        tool: 'session.setViewport',
        input: { coordinates: VALID_FOUR_CORNERS },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('VIEWPORT_LOCKED');
    expect(response.body.error).toMatch(/locked/i);
    // Viewport unchanged.
    expect(store.getState().viewport).toBeNull();
  });

  it('processes the same call normally when unlocked (FR-010 — no regression)', async () => {
    expect(store.getState().viewportLocked).toBe(false);

    const response = await request(app)
      .post('/mcp')
      .send({
        tool: 'session.setViewport',
        input: { coordinates: VALID_FOUR_CORNERS },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.errorCode).toBeUndefined();
    expect(response.body.viewport.coordinates).toEqual(VALID_FOUR_CORNERS);
  });

  it('locks rejection wins over invalid-coordinate validation diagnostics', async () => {
    store.getState().setViewportLocked(true);
    const invalidCorners = [
      { longitude: 999, latitude: 999 },
      ...VALID_FOUR_CORNERS.slice(1),
    ];

    const response = await request(app)
      .post('/mcp')
      .send({
        tool: 'session.setViewport',
        input: { coordinates: invalidCorners },
      });

    expect(response.status).toBe(200);
    // Locked is the dominant signal — caller MUST see VIEWPORT_LOCKED,
    // not a coincidental "your coordinates are also invalid" error.
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('VIEWPORT_LOCKED');
  });
});
