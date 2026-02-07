/**
 * Error Messages Unit Tests
 *
 * Tests for consistent, user-friendly error message formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  formatErrorMessage,
  ImportMessages,
  type ErrorCode,
  type ErrorContext,
} from '../src/errorMessages.js';

describe('formatErrorMessage', () => {
  describe('INVALID_FORMAT', () => {
    it('should format basic invalid format error', () => {
      const result = formatErrorMessage('INVALID_FORMAT', {
        fileName: 'boat1.rep',
      });
      expect(result).toBe(
        'Invalid REP format in "boat1.rep". Check file format and try again.'
      );
    });

    it('should include line number when provided', () => {
      const result = formatErrorMessage('INVALID_FORMAT', {
        fileName: 'boat1.rep',
        lineNumber: 42,
      });
      expect(result).toContain('at line 42');
    });

    it('should include field when provided', () => {
      const result = formatErrorMessage('INVALID_FORMAT', {
        fileName: 'boat1.rep',
        lineNumber: 42,
        field: 'course',
      });
      expect(result).toContain('(field: course)');
    });
  });

  describe('PARSE_FAILED', () => {
    it('should format basic parse error', () => {
      const result = formatErrorMessage('PARSE_FAILED', {
        fileName: 'data.rep',
      });
      expect(result).toBe('Failed to parse "data.rep"');
    });

    it('should include line number when provided', () => {
      const result = formatErrorMessage('PARSE_FAILED', {
        fileName: 'data.rep',
        lineNumber: 15,
      });
      expect(result).toContain('at line 15');
    });

    it('should include cause when provided', () => {
      const result = formatErrorMessage('PARSE_FAILED', {
        fileName: 'data.rep',
        cause: 'unexpected EOF',
      });
      expect(result).toContain(': unexpected EOF');
    });
  });

  describe('STORAGE_ERROR', () => {
    it('should format storage error with recovery suggestion', () => {
      const result = formatErrorMessage('STORAGE_ERROR', {
        fileName: 'track.rep',
      });
      expect(result).toContain('Failed to store "track.rep"');
      expect(result).toContain('Check disk space and folder permissions');
    });

    it('should include item path when provided', () => {
      const result = formatErrorMessage('STORAGE_ERROR', {
        fileName: 'track.rep',
        itemPath: 'exercise-alpha',
      });
      expect(result).toContain('to plot "exercise-alpha"');
    });
  });

  describe('FILE_NOT_FOUND', () => {
    it('should format file not found with path context', () => {
      const result = formatErrorMessage('FILE_NOT_FOUND', {
        filePath: '/data/tracks/missing.rep',
      });
      expect(result).toBe(
        'File not found: "/data/tracks/missing.rep". The file may have been moved or deleted.'
      );
    });
  });

  describe('DUPLICATE_IMPORT', () => {
    it('should format duplicate import warning', () => {
      const result = formatErrorMessage('DUPLICATE_IMPORT', {
        fileName: 'boat1.rep',
        itemPath: 'exercise-alpha',
      });
      expect(result).toBe('"boat1.rep" has already been imported to this plot');
    });
  });

  describe('SERVICE_UNAVAILABLE', () => {
    it('should format service unavailable with install hint', () => {
      const result = formatErrorMessage('SERVICE_UNAVAILABLE');
      expect(result).toContain('debrief-io Python package');
    });
  });

  describe('UNKNOWN', () => {
    it('should format unknown error with cause', () => {
      const result = formatErrorMessage('UNKNOWN', {
        cause: 'network timeout',
      });
      expect(result).toBe('Import failed: network timeout');
    });

    it('should handle missing cause', () => {
      const result = formatErrorMessage('UNKNOWN');
      expect(result).toBe('Import failed: Unknown error');
    });
  });

  describe('fileName extraction', () => {
    it('should extract fileName from filePath', () => {
      const result = formatErrorMessage('INVALID_FORMAT', {
        filePath: '/long/path/to/boat1.rep',
      });
      expect(result).toContain('"boat1.rep"');
    });

    it('should prefer explicit fileName over filePath', () => {
      const result = formatErrorMessage('INVALID_FORMAT', {
        filePath: '/long/path/to/boat1.rep',
        fileName: 'custom.rep',
      });
      expect(result).toContain('"custom.rep"');
    });
  });
});

describe('ImportMessages', () => {
  describe('success messages', () => {
    it('should format import success with correct pluralization', () => {
      expect(ImportMessages.importSuccess(1, 'boat1.rep')).toBe(
        'Imported 1 feature from boat1.rep'
      );
      expect(ImportMessages.importSuccess(5, 'boat1.rep')).toBe(
        'Imported 5 features from boat1.rep'
      );
    });
  });

  describe('warning messages', () => {
    it('should format no features warning', () => {
      expect(ImportMessages.noFeatures('empty.rep')).toBe(
        'No features found in empty.rep'
      );
    });

    it('should format parse warnings with correct pluralization', () => {
      expect(ImportMessages.parseWarnings(1, 'unknown field')).toBe(
        'Parsed with 1 warning: unknown field'
      );
      expect(ImportMessages.parseWarnings(3, 'multiple issues')).toBe(
        'Parsed with 3 warnings: multiple issues'
      );
    });

    it('should format duplicate found', () => {
      expect(ImportMessages.duplicateFound('boat1.rep')).toBe(
        'File "boat1.rep" has already been imported to this plot.'
      );
    });
  });

  describe('validation messages', () => {
    it('should have onlyRepFiles message', () => {
      expect(ImportMessages.onlyRepFiles).toBe('Only .rep files can be imported.');
    });

    it('should have singleFileOnly message', () => {
      expect(ImportMessages.singleFileOnly).toContain('single file');
    });

    it('should have noStoresAvailable message', () => {
      expect(ImportMessages.noStoresAvailable).toContain('Add a store');
    });

    it('should have noPlotsAvailable message', () => {
      expect(ImportMessages.noPlotsAvailable).toContain('Create a plot');
    });
  });

  describe('progress messages', () => {
    it('should have all progress stage messages', () => {
      expect(ImportMessages.checkingDuplicates).toBeDefined();
      expect(ImportMessages.parsingFile).toBeDefined();
      expect(ImportMessages.storingAsset).toBeDefined();
      expect(ImportMessages.storingFeatures).toBeDefined();
    });
  });
});
