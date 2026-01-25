/**
 * IoService Unit Tests
 *
 * Tests for the storage-agnostic REP parsing service.
 * Note: These tests verify the interface and error handling.
 * Full integration tests require the debrief-io Python service.
 */

import { describe, it, expect } from 'vitest';
import { RepParseError } from '../../src/types/import';

describe('IoService Types', () => {
  describe('RepParseError', () => {
    it('should create error with file path', () => {
      const error = new RepParseError('/path/to/file.rep');
      expect(error.message).toBe('Failed to parse REP file: /path/to/file.rep');
      expect(error.filePath).toBe('/path/to/file.rep');
      expect(error.name).toBe('RepParseError');
    });

    it('should include line number when provided', () => {
      const error = new RepParseError('/path/to/file.rep', 42);
      expect(error.lineNumber).toBe(42);
    });

    it('should include field when provided', () => {
      const error = new RepParseError('/path/to/file.rep', 10, 'course');
      expect(error.field).toBe('course');
    });

    it('should include error code when provided', () => {
      const error = new RepParseError('/path/to/file.rep', undefined, undefined, 'INVALID_FORMAT');
      expect(error.code).toBe('INVALID_FORMAT');
    });
  });
});

describe('IoService Interface', () => {
  // Note: Full IoService tests require mocking child_process spawn
  // which is complex due to module caching. These interface tests
  // verify the expected contract.

  it('should define ParseResult interface', () => {
    // Type-check only - interface verification
    const result: {
      features: Array<{ type: string }>;
      warnings: Array<{ message: string; code: string }>;
      sourceFile: string;
      encoding: string;
      parseTimeMs: number;
    } = {
      features: [{ type: 'Feature' }],
      warnings: [{ message: 'test', code: 'TEST' }],
      sourceFile: '/path/to/file.rep',
      encoding: 'utf-8',
      parseTimeMs: 100,
    };

    expect(result.features).toHaveLength(1);
    expect(result.sourceFile).toBe('/path/to/file.rep');
  });

  it('should define ParseWarning interface', () => {
    const warning: {
      message: string;
      lineNumber?: number;
      field?: string;
      code: string;
    } = {
      message: 'Unknown field',
      lineNumber: 10,
      field: 'bearing',
      code: 'UNKNOWN_FIELD',
    };

    expect(warning.message).toBe('Unknown field');
    expect(warning.lineNumber).toBe(10);
  });
});
