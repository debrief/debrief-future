/**
 * Error taxonomy for `sceneThumbnailService` (Feature 216).
 *
 * Each code carries the underlying fs / JSON `cause` for diagnostics.
 * Consumers translate every code into the `thumbnail-failed` reject branch
 * at the capture-command layer; the specific code is routed to the Debrief
 * output channel, not surfaced to the end user.
 */

export type SceneThumbnailErrorCode =
  | 'stac-item-not-found'
  | 'item-json-unreadable'
  | 'item-json-malformed'
  | 'empty-png'
  | 'invalid-scene-id'
  | 'write-failed'
  | 'rename-failed'
  | 'unknown-scene';

export class SceneThumbnailError extends Error {
  public readonly code: SceneThumbnailErrorCode;
  public override readonly cause?: unknown;

  constructor(
    code: SceneThumbnailErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'SceneThumbnailError';
    this.code = code;
    this.cause = cause;
  }
}
