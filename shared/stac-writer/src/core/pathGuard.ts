/**
 * Path validation helpers — prevent path traversal, absolute paths, and
 * control-char injection. Used by both adaptors before any backend write.
 *
 * Rules (per data-model.md "Path validation"):
 *   1. Reject empty / whitespace.
 *   2. Reject absolute paths (leading slash, drive letter, scheme).
 *   3. Reject `..` segments (path traversal).
 *   4. Reject control-character or NUL bytes.
 *
 * Symlink-escape detection is fs-only and lives in `stacWriterFs`.
 */

import { StacWriterError } from '../errors.js';

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function containsControlChar(input: string): boolean {
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

export function pathGuard(ctx: string, candidate: string): void {
  if (typeof candidate !== 'string') {
    throw new StacWriterError(
      'path-rejected',
      `${ctx}: path must be a string`,
      { path: String(candidate) },
    );
  }

  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    throw new StacWriterError(
      'path-rejected',
      `${ctx}: path is empty`,
      { path: candidate },
    );
  }

  if (
    trimmed.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(trimmed) ||
    /^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed)
  ) {
    throw new StacWriterError(
      'path-rejected',
      `${ctx}: absolute paths are not allowed`,
      { path: candidate },
    );
  }

  const segments = trimmed.split(/[/\\]/);
  for (const seg of segments) {
    if (seg === '..') {
      throw new StacWriterError(
        'path-rejected',
        `${ctx}: path traversal (..) is not allowed`,
        { path: candidate },
      );
    }
  }

  if (containsControlChar(trimmed)) {
    throw new StacWriterError(
      'path-rejected',
      `${ctx}: path contains control characters`,
      { path: candidate },
    );
  }
}

export function validateSceneId(sceneId: string): void {
  if (!ULID_REGEX.test(sceneId)) {
    throw new StacWriterError(
      'validation-failed',
      `sceneId is not a valid ULID: ${sceneId}`,
    );
  }
}
