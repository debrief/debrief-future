/**
 * Server-Sent Events endpoint for real-time state updates.
 * Feature: 024-document-session-state
 */

import type { Request, Response } from 'express';
import type { SessionStoreApi } from '../store/index.js';

/**
 * SSE event types.
 */
export type SSEEventType =
  | 'state-sync'
  | 'temporal.currentTime'
  | 'temporal.timeRange'
  | 'temporal.playbackState'
  | 'temporal.playbackRate'
  | 'temporal.displayMode'
  | 'spatial.viewport'
  | 'spatial.rotation'
  | 'features.selection'
  | 'features.hiddenFeatureIds'
  | 'document.dirty'
  | 'error';

/**
 * Connected SSE clients.
 */
const clients = new Set<Response>();

/**
 * Send an SSE event to all connected clients.
 */
export function broadcast(event: SSEEventType, data: unknown): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(message);
    } catch {
      // Client disconnected, remove from set
      clients.delete(client);
    }
  });
}

/**
 * Create SSE endpoint handler.
 */
export function createSSEHandler(store: SessionStoreApi) {
  // Set up store subscription to broadcast changes
  let eventId = 0;

  // Use subscribeWithSelector's signature: subscribe(selector, callback)
  // Identity selector to listen to all state changes
  store.subscribe(
    (state) => state,
    (state, prevState) => {
      eventId++;

    // Check which fields changed and broadcast
    if (state.currentTime !== prevState.currentTime) {
      broadcast('temporal.currentTime', {
        type: 'field-update',
        slice: 'temporal',
        field: 'currentTime',
        value: state.currentTime,
        previousValue: prevState.currentTime,
        timestamp: Date.now(),
      });
    }

    if (state.timeRange !== prevState.timeRange) {
      broadcast('temporal.timeRange', {
        type: 'field-update',
        slice: 'temporal',
        field: 'timeRange',
        value: state.timeRange,
        timestamp: Date.now(),
      });
    }

    if (state.playbackState !== prevState.playbackState) {
      broadcast('temporal.playbackState', {
        type: 'field-update',
        slice: 'temporal',
        field: 'playbackState',
        value: state.playbackState,
        timestamp: Date.now(),
      });
    }

    if (state.playbackRate !== prevState.playbackRate) {
      broadcast('temporal.playbackRate', {
        type: 'field-update',
        slice: 'temporal',
        field: 'playbackRate',
        value: state.playbackRate,
        timestamp: Date.now(),
      });
    }

    if (state.displayMode !== prevState.displayMode) {
      broadcast('temporal.displayMode', {
        type: 'field-update',
        slice: 'temporal',
        field: 'displayMode',
        value: state.displayMode,
        timestamp: Date.now(),
      });
    }

    if (state.viewport !== prevState.viewport) {
      broadcast('spatial.viewport', {
        type: 'field-update',
        slice: 'spatial',
        field: 'viewport',
        value: state.viewport,
        timestamp: Date.now(),
      });
    }

    if (state.rotation !== prevState.rotation) {
      broadcast('spatial.rotation', {
        type: 'field-update',
        slice: 'spatial',
        field: 'rotation',
        value: state.rotation,
        timestamp: Date.now(),
      });
    }

    if (state.selection !== prevState.selection) {
      broadcast('features.selection', {
        type: 'field-update',
        slice: 'features',
        field: 'selection',
        value: state.selection,
        timestamp: Date.now(),
      });
    }

    if (state.hiddenFeatureIds !== prevState.hiddenFeatureIds) {
      broadcast('features.hiddenFeatureIds', {
        type: 'field-update',
        slice: 'features',
        field: 'hiddenFeatureIds',
        value: state.hiddenFeatureIds,
        timestamp: Date.now(),
      });
    }

    if (state.dirty !== prevState.dirty) {
      broadcast('document.dirty', {
        type: 'field-update',
        slice: 'document',
        field: 'dirty',
        value: state.dirty,
        timestamp: Date.now(),
      });
    }
    }
  );

  return (req: Request, res: Response): void => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Add client to set
    clients.add(res);

    // Send initial state
    const state = store.getState();
    const fullState = {
      temporal: {
        currentTime: state.currentTime,
        timeRange: state.timeRange,
        timeFilter: state.timeFilter,
        stepSize: state.stepSize,
        playbackRate: state.playbackRate,
        playbackState: state.playbackState,
        displayMode: state.displayMode,
      },
      spatial: {
        viewport: state.viewport,
        rotation: state.rotation,
        drawingMode: state.drawingMode,
      },
      features: {
        featureCollectionUri: state.featureCollectionUri,
        selection: state.selection,
        hiddenFeatureIds: state.hiddenFeatureIds,
      },
      document: {
        dirty: state.dirty,
        savePath: state.savePath,
      },
    };

    res.write(
      `event: state-sync\ndata: ${JSON.stringify({
        type: 'full-state',
        state: fullState,
        timestamp: Date.now(),
      })}\n\n`
    );

    // Handle client disconnect
    req.on('close', () => {
      clients.delete(res);
    });
  };
}

/**
 * Get count of connected SSE clients.
 */
export function getClientCount(): number {
  return clients.size;
}
