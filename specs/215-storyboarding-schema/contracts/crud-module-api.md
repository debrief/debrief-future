# Contract: `@debrief/components/storyboard` — public TypeScript API

**Feature**: 215-storyboarding-schema
**Status**: Language-neutral contract. Drives implementation + test
names in `shared/components/src/storyboard/`.

All signatures are TypeScript strict-mode. No function returns `any`.
All functions are **pure**: they never mutate their inputs — they
return a new `FeatureCollection` (or, for queries, a plain value) and
leave every input byte-identical. Mutation is the caller's
responsibility (swap the reference).

---

## 1. Imported types (from `@debrief/schemas`)

```ts
import type {
  StoryboardFeature,
  SceneFeature,
  StoryboardProperties,
  SceneProperties,
  Viewport,
  HistoryEntry,
} from "@debrief/schemas";

import type { FeatureCollection } from "geojson";
```

For brevity, `Plot = FeatureCollection` below; any `Feature` members
that are not Storyboards or Scenes pass through unchanged.

---

## 2. CRUD — Storyboards

```ts
export interface CreateStoryboardInput {
  name: string;
  description?: string;
  actor: string;         // populates created_by / last_modified_by
  now?: string;          // injectable clock (ISO-8601); defaults to new Date().toISOString()
  idOverride?: string;   // injectable ULID for deterministic tests
}

export function createStoryboard(
  plot: Plot,
  input: CreateStoryboardInput,
): { plot: Plot; storyboard: StoryboardFeature };

export interface RenameStoryboardInput {
  storyboardId: string;
  newName: string;
  actor: string;
  now?: string;
}

export function renameStoryboard(
  plot: Plot,
  input: RenameStoryboardInput,
): { plot: Plot; storyboard: StoryboardFeature };

export function deleteStoryboard(
  plot: Plot,
  input: { storyboardId: string; actor: string; now?: string },
): { plot: Plot; removedSceneIds: string[] };  // cascades — Scenes removed atomically
```

**Errors**:
- `DuplicateStoryboardName` — create/rename collides with an existing
  Storyboard name in the same plot.
- `UnknownStoryboard` — rename/delete target not in the plot.

---

## 3. CRUD — Scenes

```ts
export interface CreateSceneInput {
  storyboardId: string;
  title?: string;                       // default: DTG(timestamp); fallback ISO-8601
  description?: string;
  viewport: Viewport;                   // bearing MUST be 0 in v1
  timestamp: string;                    // ISO-8601 instant
  visibleFeatureIds: string[];
  thumbnailAssetRef: string;
  transitionDurationMs?: number;        // default 500
  actor: string;
  now?: string;
  idOverride?: string;
}

export function createScene(
  plot: Plot,
  input: CreateSceneInput,
): { plot: Plot; scene: SceneFeature };

export interface UpdateScenePatch {
  title?: string;
  description?: string;
  viewport?: Viewport;
  timestamp?: string;
  visibleFeatureIds?: string[];         // triggers feature_set_hash recomputation
  thumbnailAssetRef?: string;
  transitionDurationMs?: number;
}

export function updateScene(
  plot: Plot,
  input: {
    sceneId: string;
    patch: UpdateScenePatch;
    actor: string;
    now?: string;
  },
): { plot: Plot; scene: SceneFeature };

export function deleteScene(
  plot: Plot,
  input: { sceneId: string; actor: string; now?: string },
): { plot: Plot };

export function duplicateScene(
  plot: Plot,
  input: {
    sceneId: string;
    newTimestamp: string;               // MUST differ from source's
    actor: string;
    now?: string;
    idOverride?: string;
  },
): { plot: Plot; scene: SceneFeature };

export interface CopySceneToOtherStoryboardInput {
  sceneId: string;
  destinationStoryboardId: string;
  newTimestamp?: string;                // defaults to source's (may collide — caller handles)
  deepCopyThumbnail: (sourceAssetRef: string, destStoryboardId: string) => Promise<string>;
  actor: string;
  now?: string;
  idOverride?: string;
}

export function copySceneToOtherStoryboard(
  plot: Plot,
  input: CopySceneToOtherStoryboardInput,
): Promise<{ plot: Plot; scene: SceneFeature }>;
```

**Errors**:
- `UnknownStoryboard` — `storyboardId` / `destinationStoryboardId` not
  in the plot.
- `UnknownScene` — `sceneId` not in the plot.
- `DuplicateTimestamp` — new/updated/duplicated timestamp collides
  within the target Storyboard.
- `OrphanScene` — validator detects the `storyboard_id` is missing
  (should be impossible via these APIs but guarded).
- `ReservedSlotViolation` — non-null `time_range` or non-zero
  `bearing` submitted.
- `ThumbnailDeepCopyFailed` — `deepCopyThumbnail` rejects; whole op
  rolled back (no partial write).

---

## 4. Queries

```ts
export function listScenesOrdered(
  plot: Plot,
  storyboardId: string,
): SceneFeature[];  // ascending timestamp

export function getActiveStoryboardDefault(
  plot: Plot,
): StoryboardFeature | null;  // first by name ascending; null if no Storyboard present

export function getStoryboard(
  plot: Plot,
  storyboardId: string,
): StoryboardFeature | null;

export function getScene(
  plot: Plot,
  sceneId: string,
): SceneFeature | null;

export type MissingDataClassification =
  | { kind: "ok" }
  | { kind: "missing-features"; missingIds: string[] }
  | { kind: "out-of-range" };

export function detectMissingDataForScene(
  scene: SceneFeature,
  plotFeatures: ReadonlyArray<GeoJSON.Feature>,
  plotTimeRange: { start: string; end: string },
): MissingDataClassification;
// Pure. MUST NOT mutate any input. Deep-equal the inputs before/after
// in tests (SC-006).

export interface StaleReadResult {
  scene: SceneFeature;
  stale: boolean;   // true if recomputed hash ≠ stored hash
}

export function readSceneWithStaleness(
  plot: Plot,
  sceneId: string,
): StaleReadResult;
```

---

## 5. Invariant helpers

```ts
export function computeFeatureSetHash(
  visibleFeatureIds: string[],
): string;  // SHA-256 hex, lowercase

export function validatePlot(plot: Plot): void;
// Throws the first invariant violation encountered:
//   OrphanScene | DuplicateTimestamp | DuplicateStoryboardName | ReservedSlotViolation
// Side-effect-free. Intended for host-side save-time validation.
```

---

## 6. Migration hook

```ts
export type MigrationFn = (plot: Plot) => Plot;

export function runPlotOpenMigrations(
  plot: Plot,
  registry: ReadonlyMap<number, MigrationFn>,   // keyed by target schema_version
): Plot;

export const V1_MIGRATIONS: ReadonlyMap<number, MigrationFn>;
// Pre-built registry shipping with #215. v1 entry is a no-op passthrough.
```

---

## 7. DTG formatter

```ts
export function formatDtg(isoInstant: string): string;
// Returns "DDHHmmZ MMM YY" (e.g. "041500Z APR 26"); on parse failure
// returns the input verbatim.
```

---

## 8. Error vocabulary

```ts
export abstract class StoryboardError extends Error {
  abstract readonly code: StoryboardErrorCode;
}

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

export class DuplicateTimestampError extends StoryboardError {
  readonly code = "DuplicateTimestamp";
  constructor(
    readonly timestamp: string,
    readonly conflictingSceneId: string,
  ) { super(`Scene at ${timestamp} already exists (id=${conflictingSceneId})`); }
}

// …one subclass per code above, carrying its named fields.
```

Consumer code MUST match on `err.code`, not on `instanceof`
(bundler name-mangling safety).

---

## 9. Non-API guarantees

- **No global state.** Module has no singletons, no module-level
  caches, no side channels.
- **No network.** Any function that needs a thumbnail deep copy takes
  the deep-copier as a parameter (`deepCopyThumbnail` in
  `CopySceneToOtherStoryboardInput`) — the module itself never
  performs I/O.
- **No UI imports.** The core path (`index.ts` and every file it
  transitively imports) does not import from `react`, `vscode`,
  `leaflet`, `react-leaflet`, or any `@debrief/components` visual
  component.
- **Strict types.** Public API contains zero `any` and zero `unknown`
  on return types.
- **Browser + Node compatible.** Every function runs unchanged in both
  environments; SHA-256 uses the platform-native crypto primitive via
  a thin shim (`node:crypto` in Node, `crypto.subtle` in browser).
