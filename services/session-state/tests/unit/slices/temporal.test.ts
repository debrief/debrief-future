/**
 * Unit tests for temporal state slice.
 * Feature: 024-document-session-state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';

describe('Temporal Slice', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('default state', () => {
    it('should have null currentTime by default', () => {
      expect(store.getState().currentTime).toBeNull();
    });

    it('should have null timeRange by default', () => {
      expect(store.getState().timeRange).toBeNull();
    });

    it('should have null timeFilter by default', () => {
      expect(store.getState().timeFilter).toBeNull();
    });

    it('should have default stepSize of 1 minute', () => {
      const { stepSize } = store.getState();
      expect(stepSize.value).toBe(1);
      expect(stepSize.unit).toBe('minute');
    });

    it('should have playbackRate of 1.0 by default', () => {
      expect(store.getState().playbackRate).toBe(1.0);
    });

    it('should have playbackState of stopped by default', () => {
      expect(store.getState().playbackState).toBe('stopped');
    });

    it('should have displayMode of normal by default', () => {
      expect(store.getState().displayMode).toBe('normal');
    });
  });

  describe('setCurrentTime', () => {
    it('should set current time', () => {
      store.getState().setCurrentTime(1706097600000);
      expect(store.getState().currentTime).toBe(1706097600000);
    });

    it('should allow setting null', () => {
      store.getState().setCurrentTime(1706097600000);
      store.getState().setCurrentTime(null);
      expect(store.getState().currentTime).toBeNull();
    });
  });

  describe('setTimeRange', () => {
    it('should set time range', () => {
      const range = { start: 1706000000000, end: 1706100000000 };
      store.getState().setTimeRange(range);
      expect(store.getState().timeRange).toEqual(range);
    });
  });

  describe('setTimeFilter', () => {
    it('should set time filter', () => {
      const filter = { start: 1706050000000, end: 1706090000000 };
      store.getState().setTimeFilter(filter);
      expect(store.getState().timeFilter).toEqual(filter);
    });

    it('should allow partial filter with missing start (unbounded)', () => {
      // Canonical TimeFilter (feature 203): missing/undefined means unbounded.
      // FR-021 requires consumers to use `!= null` checks that accept both
      // legacy null and canonical undefined.
      const filter = { end: 1706090000000 };
      store.getState().setTimeFilter(filter);
      expect(store.getState().timeFilter?.start == null).toBe(true);
      expect(store.getState().timeFilter?.end).not.toBeNull();
    });
  });

  describe('setStepSize', () => {
    it('should set step size', () => {
      store.getState().setStepSize({ value: 30, unit: 'second' });
      expect(store.getState().stepSize).toEqual({ value: 30, unit: 'second' });
    });
  });

  describe('setPlaybackRate (FR-009)', () => {
    it('should set valid playback rate', () => {
      store.getState().setPlaybackRate(2.0);
      expect(store.getState().playbackRate).toBe(2.0);
    });

    it('should allow minimum rate of 0.1', () => {
      store.getState().setPlaybackRate(0.1);
      expect(store.getState().playbackRate).toBe(0.1);
    });

    it('should allow maximum rate of 100', () => {
      store.getState().setPlaybackRate(100);
      expect(store.getState().playbackRate).toBe(100);
    });

    it('should reject rate below 0.1', () => {
      expect(() => store.getState().setPlaybackRate(0.05)).toThrow();
    });

    it('should reject rate above 100', () => {
      expect(() => store.getState().setPlaybackRate(101)).toThrow();
    });
  });

  describe('setPlaybackState (FR-010)', () => {
    it('should set playback state to playing', () => {
      store.getState().setPlaybackState('playing');
      expect(store.getState().playbackState).toBe('playing');
    });

    it('should set playback state to paused', () => {
      store.getState().setPlaybackState('paused');
      expect(store.getState().playbackState).toBe('paused');
    });

    it('should set playback state to stopped', () => {
      store.getState().setPlaybackState('playing');
      store.getState().setPlaybackState('stopped');
      expect(store.getState().playbackState).toBe('stopped');
    });
  });

  describe('setDisplayMode (FR-011)', () => {
    it('should set display mode to snailTrail', () => {
      store.getState().setDisplayMode('snailTrail');
      expect(store.getState().displayMode).toBe('snailTrail');
    });

    it('should set display mode to normal', () => {
      store.getState().setDisplayMode('snailTrail');
      store.getState().setDisplayMode('normal');
      expect(store.getState().displayMode).toBe('normal');
    });
  });

  describe('stepForward', () => {
    it('should step forward by stepSize', () => {
      store.getState().setCurrentTime(1706097600000);
      store.getState().setStepSize({ value: 1, unit: 'minute' });
      store.getState().stepForward();

      expect(store.getState().currentTime).toBe(1706097600000 + 60000);
    });

    it('should clamp to time range end', () => {
      const rangeEnd = 1706097600000 + 30000; // 30 seconds ahead
      store.getState().setCurrentTime(1706097600000);
      store.getState().setTimeRange({ start: 1706000000000, end: rangeEnd });
      store.getState().setStepSize({ value: 1, unit: 'minute' });
      store.getState().stepForward();

      expect(store.getState().currentTime).toBe(rangeEnd);
    });

    it('should do nothing if currentTime is null', () => {
      store.getState().stepForward();
      expect(store.getState().currentTime).toBeNull();
    });
  });

  describe('stepBackward', () => {
    it('should step backward by stepSize', () => {
      store.getState().setCurrentTime(1706097600000);
      store.getState().setStepSize({ value: 1, unit: 'minute' });
      store.getState().stepBackward();

      expect(store.getState().currentTime).toBe(1706097600000 - 60000);
    });

    it('should clamp to time range start', () => {
      const rangeStart = 1706097600000 - 30000; // 30 seconds before
      store.getState().setCurrentTime(1706097600000);
      store.getState().setTimeRange({ start: rangeStart, end: 1706200000000 });
      store.getState().setStepSize({ value: 1, unit: 'minute' });
      store.getState().stepBackward();

      expect(store.getState().currentTime).toBe(rangeStart);
    });
  });
});
