/**
 * Storyboard CRUD error taxonomy (Feature 215, research.md R7).
 *
 * All errors carry a stable `code` string — consumers MUST match on
 * `err.code`, not on `instanceof` — because bundler name-mangling can
 * rename class identifiers. The codes are enumerable via the
 * `StoryboardErrorCode` union for exhaustiveness checks.
 */

export type StoryboardErrorCode =
  | "DuplicateTimestamp"
  | "OrphanScene"
  | "UnknownStoryboard"
  | "UnknownScene"
  | "ReservedSlotViolation"
  | "DuplicateStoryboardName"
  | "ThumbnailDeepCopyFailed"
  | "SchemaMigrationFailed"
  | "InvariantViolation";

export abstract class StoryboardError extends Error {
  abstract readonly code: StoryboardErrorCode;
}

export class DuplicateTimestampError extends StoryboardError {
  readonly code = "DuplicateTimestamp";
  constructor(
    readonly timestamp: string,
    readonly conflictingSceneId: string,
  ) {
    super(
      `Scene at ${timestamp} already exists (id=${conflictingSceneId})`,
    );
    this.name = "DuplicateTimestampError";
  }
}

export class OrphanSceneError extends StoryboardError {
  readonly code = "OrphanScene";
  constructor(
    readonly sceneId: string,
    readonly storyboardId: string,
  ) {
    super(
      `Scene ${sceneId} references unknown Storyboard ${storyboardId}`,
    );
    this.name = "OrphanSceneError";
  }
}

export class UnknownStoryboardError extends StoryboardError {
  readonly code = "UnknownStoryboard";
  constructor(readonly storyboardId: string) {
    super(`No Storyboard with id=${storyboardId} in the plot`);
    this.name = "UnknownStoryboardError";
  }
}

export class UnknownSceneError extends StoryboardError {
  readonly code = "UnknownScene";
  constructor(readonly sceneId: string) {
    super(`No Scene with id=${sceneId} in the plot`);
    this.name = "UnknownSceneError";
  }
}

export class ReservedSlotViolationError extends StoryboardError {
  readonly code = "ReservedSlotViolation";
  constructor(
    readonly field: string,
    readonly value: unknown,
  ) {
    super(
      `Reserved slot violation: field=${field} value=${JSON.stringify(value)}`,
    );
    this.name = "ReservedSlotViolationError";
  }
}

export class DuplicateStoryboardNameError extends StoryboardError {
  readonly code = "DuplicateStoryboardName";
  constructor(
    readonly name: string,
    readonly conflictingStoryboardId: string,
  ) {
    super(
      `Storyboard name "${name}" already taken (id=${conflictingStoryboardId})`,
    );
    this.name = "DuplicateStoryboardNameError";
  }
}

export class ThumbnailDeepCopyFailedError extends StoryboardError {
  readonly code = "ThumbnailDeepCopyFailed";
  constructor(readonly cause: unknown) {
    super(
      `Thumbnail deep-copy failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = "ThumbnailDeepCopyFailedError";
  }
}

export class SchemaMigrationFailedError extends StoryboardError {
  readonly code = "SchemaMigrationFailed";
  constructor(
    readonly fromVersion: number,
    readonly toVersion: number,
    readonly cause: unknown,
  ) {
    super(
      `Schema migration v${fromVersion} -> v${toVersion} failed: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = "SchemaMigrationFailedError";
  }
}

export class InvariantViolationError extends StoryboardError {
  readonly code = "InvariantViolation";
  constructor(readonly detail: string) {
    super(`Storyboard module invariant violated: ${detail}`);
    this.name = "InvariantViolationError";
  }
}
