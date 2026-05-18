/**
 * Storyboard CRUD error taxonomy (Feature 215, research.md R7; updated #259).
 *
 * All errors carry a stable `code` string — consumers MUST match on
 * `err.code`, not on `instanceof` — because bundler name-mangling can
 * rename class identifiers. The codes are enumerable via the
 * `StoryboardErrorCode` union for exhaustiveness checks.
 *
 * #259 changes: `DuplicateTimestampError` is removed (the underlying
 * constraint is relaxed — multiple Scenes may share a timestamp).
 * Four new errors are added to enforce the replacement invariants
 * around the new `creation_order` slot:
 *   - `DuplicateCreationOrderError`        (FC-I4)
 *   - `CreationOrderOutOfRangeError`       (reorder bounds)
 *   - `MissingCreationOrderError`          (FC-I5 — pre-#259 plot)
 *   - `UnsupportedSchemaVersionError`      (FC-V1 — pre-#259 plot)
 */

export type StoryboardErrorCode =
  | "OrphanScene"
  | "UnknownStoryboard"
  | "UnknownScene"
  | "ReservedSlotViolation"
  | "DuplicateStoryboardName"
  | "ThumbnailDeepCopyFailed"
  | "SchemaMigrationFailed"
  | "InvariantViolation"
  | "DuplicateCreationOrder"
  | "CreationOrderOutOfRange"
  | "MissingCreationOrder"
  | "UnsupportedSchemaVersion";

export abstract class StoryboardError extends Error {
  abstract readonly code: StoryboardErrorCode;
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

// ───────────────────────────────────────────────────────────────────
// #259 — new errors replacing DuplicateTimestampError
// ───────────────────────────────────────────────────────────────────

export class DuplicateCreationOrderError extends StoryboardError {
  readonly code = "DuplicateCreationOrder";
  constructor(
    readonly storyboardId: string,
    readonly creationOrder: number,
    readonly conflictingSceneIds: readonly [string, string],
  ) {
    super(
      `Duplicate creation_order=${creationOrder} in Storyboard ${storyboardId} (Scenes ${conflictingSceneIds[0]}, ${conflictingSceneIds[1]})`,
    );
    this.name = "DuplicateCreationOrderError";
  }
}

export class CreationOrderOutOfRangeError extends StoryboardError {
  readonly code = "CreationOrderOutOfRange";
  constructor(
    readonly storyboardId: string,
    readonly sceneId: string,
    readonly providedIndex: number,
    readonly tiedGroupSize: number,
  ) {
    super(
      `Position ${providedIndex} is out of range for tied group of size ${tiedGroupSize} (Scene ${sceneId} in Storyboard ${storyboardId})`,
    );
    this.name = "CreationOrderOutOfRangeError";
  }
}

export class MissingCreationOrderError extends StoryboardError {
  readonly code = "MissingCreationOrder";
  constructor(
    readonly storyboardId: string,
    readonly sceneId: string,
  ) {
    super(
      `Scene ${sceneId} in Storyboard ${storyboardId} is missing the required creation_order field (pre-#259 plot — no migration provided)`,
    );
    this.name = "MissingCreationOrderError";
  }
}

export class UnsupportedSchemaVersionError extends StoryboardError {
  readonly code = "UnsupportedSchemaVersion";
  constructor(
    readonly storyboardId: string,
    readonly foundVersion: number,
    readonly requiredMinimum: number = 2,
  ) {
    super(
      `Storyboard ${storyboardId} has schema_version=${foundVersion} but the reader requires >= ${requiredMinimum} (pre-#259 plot — no migration provided)`,
    );
    this.name = "UnsupportedSchemaVersionError";
  }
}
