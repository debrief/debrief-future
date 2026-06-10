/**
 * Unit tests for thumbnailSizePreference.ts
 *
 * Decision #5: typed versioned persistence, narrow on read, fallback 'small'.
 * Decision #11: localStorage cleared globally in beforeEach/afterEach (setup.ts).
 *
 * Feature: 281-ui-review-p1-p2-fixes
 */

import { describe, it, expect } from 'vitest';
import { readThumbnailSize, writeThumbnailSize } from './thumbnailSizePreference';

const STORAGE_KEY = 'debrief-catalog-thumbnail-size-v1';

describe('thumbnailSizePreference', () => {
  describe('readThumbnailSize', () => {
    it('returns "small" when nothing is stored (default fallback)', () => {
      expect(readThumbnailSize()).toBe('small');
    });

    it('returns "small" when stored value is "small"', () => {
      localStorage.setItem(STORAGE_KEY, 'small');
      expect(readThumbnailSize()).toBe('small');
    });

    it('returns "medium" when stored value is "medium"', () => {
      localStorage.setItem(STORAGE_KEY, 'medium');
      expect(readThumbnailSize()).toBe('medium');
    });

    it('returns "large" when stored value is "large"', () => {
      localStorage.setItem(STORAGE_KEY, 'large');
      expect(readThumbnailSize()).toBe('large');
    });

    it('falls back to "small" for an unknown value ("xl")', () => {
      localStorage.setItem(STORAGE_KEY, 'xl');
      expect(readThumbnailSize()).toBe('small');
    });

    it('falls back to "small" for empty string', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(readThumbnailSize()).toBe('small');
    });

    it('falls back to "small" for a numeric string', () => {
      localStorage.setItem(STORAGE_KEY, '2');
      expect(readThumbnailSize()).toBe('small');
    });

    it('falls back to "small" for a JSON number (not a valid size)', () => {
      localStorage.setItem(STORAGE_KEY, '42');
      expect(readThumbnailSize()).toBe('small');
    });

    it('accepts a JSON-encoded valid string ("medium")', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify('medium'));
      expect(readThumbnailSize()).toBe('medium');
    });

    it('falls back to "small" for JSON-encoded unknown value', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify('extra-large'));
      expect(readThumbnailSize()).toBe('small');
    });
  });

  describe('writeThumbnailSize', () => {
    it('persists "small" and reads it back', () => {
      writeThumbnailSize('small');
      expect(readThumbnailSize()).toBe('small');
    });

    it('persists "medium" and reads it back', () => {
      writeThumbnailSize('medium');
      expect(readThumbnailSize()).toBe('medium');
    });

    it('persists "large" and reads it back', () => {
      writeThumbnailSize('large');
      expect(readThumbnailSize()).toBe('large');
    });

    it('uses the versioned key (debrief-catalog-thumbnail-size-v1)', () => {
      writeThumbnailSize('large');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('large');
    });

    it('overwrites a previous value', () => {
      writeThumbnailSize('medium');
      writeThumbnailSize('large');
      expect(readThumbnailSize()).toBe('large');
    });
  });
});
