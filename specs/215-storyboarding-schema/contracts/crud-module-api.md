# Contract: `@debrief/components/storyboard` — public TypeScript API

**Feature**: 215-storyboarding-schema
**Status**: Language-neutral contract. Drives implementation + test
names in `shared/components/src/storyboard/`.

**Updated 2026-04-20** following post-plan review. Key deltas:
- **Mutation ops are async** (`Promise<{plot, …}>`) — Web Crypto's
  `subtle.digest` is async. Pure queries remain synchronous.
- **Structural sharing via `immer.produce`** — unmodified Features are
  reference-equal across input and output FeatureCollections.
- **Provenance** flows through the inherited
  `BaseFeatureProperties.provenance: LogEntry[]` slot, not a
  `HistoryEntry` array. Per-op encoding lives in `data-model.md §4`.
- **`computeFeatureSetHash` is async** with canonicalisation built in.

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
  LogEntry,
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
  actor: string;         // populates LogEntry.agent on the create entry
  now?: string;          // injectable clock (ISO-8601); defaults to new Date().toISOString()
  idOverride?: string;   // injectable ULID for deterministic tests
  activityIdOverride?: string;  // injectable UUID for deterministic tests
}

export async function createStoryboard(
  plot: Plot,
  input: CreateStoryboardInput,
): Promise<{ plot: Plot; storyboard: StoryboardFeature }>;

export interface RenameStoryboardInput {
  storyboardId: string;
  newName: string;
  actor: string;
  now?: string;
}

export async function renameStoryboard(
  plot: Plot,
  input: RenameStoryboardInput,
): Promise<{ plot: Plot; storyboard: StoryboardFeature }>;

export async function deleteStoryboard(
  plot: Plot,
  input: { storyboardId: string; actor: string; now?: string },
): Promise<{ plot: Plot; removedSceneIds: string[] }>;  // cascades — Scenes removed atomically
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
  visibleFeatureIds: string[];          // canonicalised (trim/dedupe/sort) before hashing
  thumbnailAssetRef: string;
  transitionDurationMs?: number;        // default 500
  actor: string;
  now?: string;
  idOverride?: string;
  activityIdOverride?: string;
}

export async function createScene(
  plot: Plot,
  input: CreateSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }>;

export interface UpdateScenePatch {
  title?: string;
  description?: string;
  viewport?: Viewport;
  timestamp?: string;
  visibleFeatureIds?: string[];         // triggers feature_set_hash recomputation
  thumbnailAssetRef?: string;
  transitionDurationMs?: number;
}

export async function updateScene(
  plot: Plot,
  input: {
    sceneId: string;
    patch: UpdateScenePatch;
    actor: string;
    now?: string;
  },
): Promise<{ plot: Plot; scene: SceneFeature }>;

export async function deleteScene(
  plot: Plot,
  input: { sceneId: string; actor: string; now?: string },
): Promise<{ plot: Plot }>;

export async function duplicateScene(
  plot: Plot,
  input: {
    sceneId: string;
    newTimestamp: string;               // MUST differ from source's
    actor: string;
    now?: string;
    idOverride?: string;
  },
): Promise<{ plot: Plot; scene: SceneFeature }>;

export interface CopySceneToOtherStoryboardInput {
  sceneId: string;
  destinationStoryboardId: string;
  newTimestamp?: string;                // defaults to source's (may collide — caller handles)
  deepCopyThumbnail: (sourceAssetRef: string, destStoryboardId: string) => Promise<string>;
  actor: string;
  now?: string;
  idOverride?: string;
}

export async function copySceneToOtherStoryboard(
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
  `bearing` submitted; empty string in `visibleFeatureIds` after trim.
- `ThumbnailDeepCopyFailed` — `deepCopyThumbnail` rejects; whole op
  rolled back (no partial write, input byte-identical post-call).

---

## 4. Queries (synchronous)

All query functions are **pure** and **synchronous**. They perform no
crypto, no I/O, and no mutation. Deep-equality of inputs before and
after any query call is a tested invariant (SC-006).

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
  storedHash: string;                   // scene.properties.feature_set_hash
  canonicalVisibleIds: string[];        // trim/dedupe/sort applied
  // Consumer awaits computeFeatureSetHash(canonicalVisibleIds) if it
  // wants to detect staleness. Kept sync to avoid forcing async on
  // every read. See research.md R11.
}

export function readSceneWithStaleness(
  plot: Plot,
  sceneId: string,
): StaleReadResult;
```

### Derived read-only accessors (from inherited `provenance[]`)

```ts
export function getCreatedAt(
  feature: StoryboardFeature | SceneFeature,
): string;  // = provenance[0].timestamp

export function getLastModifiedAt(
  feature: StoryboardFeature | SceneFeature,
): string;  // = provenance[provenance.length - 1].timestamp

export function getCreatedBy(
  feature: StoryboardFeature | SceneFeature,
): string | null;  // = provenance[0].agent ?? null

export function getLastModifiedBy(
  feature: StoryboardFeature | SceneFeature,
): string | null;  // = provenance[last].agent ?? null
```

---

## 5. Invariant helpers

```ts
export async function computeFeatureSetHash(
  visibleFeatureIds: string[],
): Promise<string>;
// Canonicalises (trim, reject empty → ReservedSlotViolation, dedupe,
// sort lexicographically), then SHA-256 hex (lowercase, 64 chars).
// Async because Web Crypto's subtle.digest is async.

export function canonicaliseVisibleFeatureIds(
  visibleFeatureIds: string[],
): string[];
// Sync helper exposed for consumers that want to inspect the canonical
// list without awaiting the hash (e.g. readSceneWithStaleness).

export function validatePlot(plot: Plot): void;
// Throws the first invariant violation encountered:
//   OrphanScene | DuplicateTimestamp | DuplicateStoryboardName | ReservedSlotViolation
// Side-effect-free. Synchronous. Intended for host-side save-time validation.
```

---

## 6. Migration hook (synchronous)

```ts
export type MigrationFn = (plot: Plot) => Plot;

export function runPlotOpenMigrations(
  plot: Plot,
  registry: ReadonlyMap<number, MigrationFn>,   // keyed by target schema_version
): Plot;

export const V1_MIGRATIONS: ReadonlyMap<number, MigrationFn>;
// Pre-built registry shipping with #215. v1 entry is a no-op passthrough.
```

Synchronous because v1 is a no-op. Future versions that require async
work (e.g. re-hashing legacy feature sets) will introduce an async
sibling `runPlotOpenMigrationsAsync`; the sync path stays for v1.

---

## 7. DTG formatter (synchronous)

```ts
export function formatDtg(isoInstant: string): string;
// Returns "DDHHmmZ MMM YY" (e.g. "201500Z APR 26"); on parse failure
// returns the input verbatim.
```

---

## 8. Provenance encoding helper (internal shape, exposed for tests)

```ts
export interface StoryboardCrudLogEntryInput {
  op:
    | "create" | "rename" | "describe" | "delete" | "restore"
    | "update-to-current" | "duplicate" | "copy-in"
    | "insert-middle" | "refresh-thumbnail";
  actor: string;
  now: string;
  summary: string;
  used: string[];       // source Feature ids (empty for "create")
  generated: string[];  // output Feature id(s)
  activityId: string;   // UUID v4 (or override for tests)
  rationale?: string;
}

export function buildStoryboardCrudLogEntry(
  input: StoryboardCrudLogEntryInput,
): LogEntry;
// Pure. Populates was_generated_by.tool = "storyboard-crud",
// was_generated_by.tool_version = "1.0.0",
// was_generated_by.parameters.op = input.op,
// agent = input.actor,
// execution_duration = "PT0S".
// Used internally by every mutation op and exposed for test assertions.
```

---

## 9. Error vocabulary

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

## 10. Non-API guarantees

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
  the shared `shared/components/src/utils/hash.ts` module (which in
  turn delegates to `globalThis.crypto.subtle.digest` — present in
  Node 20+ and every evergreen browser).
- **Structural sharing.** Every mutation is an `immer.produce(plot, …)`
  recipe; unmodified Features are reference-equal across input and
  output FeatureCollections (FR-MODULE-022, tested invariant).
- **Atomicity.** If any step inside a mutation throws, the input plot
  is byte-identical to its pre-call state (immer's produce discards
  the draft). Tested under injected mid-op failure (SC-005).
- **Append-only provenance.** Public ops never mutate or remove
  existing `LogEntry` records in `provenance[]` (FR-MODULE-020, tested
  invariant).
