/**
 * Performance tests for state updates (SC-001).
 * Feature: 024-document-session-state
 *
 * Verifies that UI components reflect state changes within 100ms.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSessionStore,
  type SessionStoreApi,
  subscribeToCurrentTime,
  } from '../../src/index.js';

describe('Performance Requirements (SC-001)', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('state update latency', () => {
    it('should notify subscribers within 100ms of state change', async () => {
      const listener = vi.fn();
      let notificationTime: number | null = null;

      subscribeToCurrentTime(store, () => {
        notificationTime = performance.now();
        listener();
      });

      const startTime = performance.now();
      const time = Date.now();
      store.getState().setCurrentTime(time);
      const endTime = notificationTime ?? performance.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(100);
      expect(listener).toHaveBeenCalled();
    });

    it('should handle rapid state updates efficiently', () => {
      const listener = vi.fn();
      subscribeToCurrentTime(store, listener);

      const startTime = performance.now();

      // Simulate rapid updates (100 changes)
      for (let i = 0; i < 100; i++) {
        const time = Date.now() + i * 1000;
        store.getState().setCurrentTime(time);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All 100 updates should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // 1 second for 100 updates
      expect(listener).toHaveBeenCalledTimes(100);
    });

    it('should not block on multiple subscribers', () => {
      const listeners = Array.from({ length: 10 }, () => vi.fn());

      listeners.forEach((listener) => {
        subscribeToCurrentTime(store, listener);
      });

      const startTime = performance.now();
      const time = Date.now();
      store.getState().setCurrentTime(time);
      const endTime = performance.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(100);

      // All listeners should be notified
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalled();
      });
    });

    it('should maintain performance with deep state reads', () => {
      const listener = vi.fn();

      // Subscribe to deeply nested state
      store.subscribe(
        (state) => ({
          currentTime: state.currentTime,
          selection: state.selection,
          viewport: state.viewport,
          dirty: state.dirty,
        }),
        listener
      );

      const startTime = performance.now();
      const time = Date.now();
      store.getState().setCurrentTime(time);
      const endTime = performance.now();

      const latency = endTime - startTime;
      expect(latency).toBeLessThan(100);
    });
  });

  describe('synchronous updates', () => {
    it('should update state synchronously', () => {
      const time1 = 1000;
      const time2 = 2000;

      store.getState().setCurrentTime(time1);
      expect(store.getState().currentTime).toEqual(time1);

      store.getState().setCurrentTime(time2);
      expect(store.getState().currentTime).toEqual(time2);
    });

    it('should notify subscribers synchronously', () => {
      let callOrder: string[] = [];

      subscribeToCurrentTime(store, () => {
        callOrder.push('subscriber');
      });

      callOrder.push('before');
      store.getState().setCurrentTime(Date.now());
      callOrder.push('after');

      // Subscriber should be called synchronously between before and after
      expect(callOrder).toEqual(['before', 'subscriber', 'after']);
    });
  });
});
