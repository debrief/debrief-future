/**
 * Unit tests for document state slice.
 * Feature: 024-document-session-state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore, type SessionStoreApi } from '../../../src/store/index.js';

describe('Document Slice', () => {
  let store: SessionStoreApi;

  beforeEach(() => {
    store = createSessionStore();
  });

  describe('default state', () => {
    it('should have dirty as false by default', () => {
      expect(store.getState().dirty).toBe(false);
    });

    it('should have null savePath by default', () => {
      expect(store.getState().savePath).toBeNull();
    });
  });

  describe('setDirty (FR-020)', () => {
    it('should set dirty to true', () => {
      store.getState().setDirty(true);
      expect(store.getState().dirty).toBe(true);
    });

    it('should set dirty to false', () => {
      store.getState().setDirty(true);
      store.getState().setDirty(false);
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('markDirty', () => {
    it('should mark document as dirty', () => {
      store.getState().markDirty();
      expect(store.getState().dirty).toBe(true);
    });
  });

  describe('markClean', () => {
    it('should mark document as clean', () => {
      store.getState().markDirty();
      store.getState().markClean();
      expect(store.getState().dirty).toBe(false);
    });
  });

  describe('setSavePath', () => {
    it('should set save path', () => {
      const path = '/path/to/session.json';
      store.getState().setSavePath(path);
      expect(store.getState().savePath).toBe(path);
    });

    it('should allow null save path', () => {
      store.getState().setSavePath('/some/path');
      store.getState().setSavePath(null);
      expect(store.getState().savePath).toBeNull();
    });
  });
});
