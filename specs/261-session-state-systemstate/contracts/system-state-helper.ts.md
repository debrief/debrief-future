# Contract: Shared SystemState helper API

**Feature**: `261-session-state-systemstate`
**Module path**: `services/session-state/src/system-state/`
**Public barrel**: `services/session-state/src/system-state/index.ts`
**Re-exported from**: `@debrief/session-state` (so hosts import as `import { readSystemStateFromFeatureCollection, writeSystemStateIntoFeatureCollection } from '@debrief/session-state'`).

This contract pins the helper's public TypeScript surface. The internal modules (`read.ts`, `write.ts`, `mapping.ts`, `validate.ts`, `exhaustive.ts`) may be refactored freely as long as the public exports below maintain their signatures and observable behaviour.

---

## Type exports

```typescript
import type {
  FeatureCollection,
  Feature,
} from 'geojson';
import type {
  SystemStateProperties,
  SystemStateTypeEnum,
  LogEntry,
} from '@debrief/schemas';

/**
 * A typed map from state_type to the corresponding variant of SystemStateProperties.
 * Each key is independently present-or-absent; an absent key means the FeatureCollection
 * contained no SystemState feature with that state_type.
 */
export interface SystemStateMap {
  temporal?: Extract<SystemStateProperties, { state_type: 'temporal' }>;
  spatial?: Extract<SystemStateProperties, { state_type: 'spatial' }>;
  selection?: Extract<SystemStateProperties, { state_type: 'selection' }>;
  active_storyboard?: Extract<SystemStateProperties, { state_type: 'active_storyboard' }>;
}

/**
 * Discriminated context object passed to writeSystemStateIntoFeatureCollection().
 * The caller assembles this from current Zustand store state via the slice mappings
 * in mapping.ts. Each key is optional — only provided variants are written.
 */
export interface SystemStateWriteInput {
  temporal?: Omit<Extract<SystemStateProperties, { state_type: 'temporal' }>, 'kind' | 'state_type' | 'provenance'>;
  spatial?:  Omit<Extract<SystemStateProperties, { state_type: 'spatial' }>,  'kind' | 'state_type' | 'provenance'>;
  selection?: Omit<Extract<SystemStateProperties, { state_type: 'selection' }>, 'kind' | 'state_type' | 'provenance'>;
  active_storyboard?: Omit<Extract<SystemStateProperties, { state_type: 'active_storyboard' }>, 'kind' | 'state_type' | 'provenance'>;
}

/**
 * Identity of the calling host — required for provenance.
 */
export type SystemStateHost = 'vscode' | 'web-shell';

/**
 * Provenance enrichment supplied at write time. The helper fills `host`, `timestamp`,
 * `action`, and `version` itself; the caller supplies `agent` (from LogService).
 */
export interface SystemStateWriteContext {
  host: SystemStateHost;
  agent: string;            // typically from LogService.getAgent()
  packageVersion: string;   // typically @debrief/session-state package.json version
}

/**
 * Structured load error for callers to surface to users.
 * The helper throws this (subclass of Error) on Article XIV.4 strict-on-import violations.
 */
export class SystemStateLoadError extends Error {
  readonly kind:
    | 'multiple-features-with-same-state-type'
    | 'malformed-feature'
    | 'unknown-state-type'
    | 'missing-discriminator';
  readonly featureIds: string[];   // IDs of offending Features
  readonly details?: unknown;      // e.g. Zod error issues
  constructor(opts: {
    kind: SystemStateLoadError['kind'];
    featureIds: string[];
    details?: unknown;
    message: string;
  });
}
```

---

## Function exports

### `readSystemStateFromFeatureCollection`

```typescript
/**
 * Extract a SystemStateMap from a plot's FeatureCollection.
 *
 * Scans `fc.features` for Features whose `properties.kind === "SYSTEM"`. Each such
 * Feature is validated against the appropriate variant of SystemStateProperties via
 * Zod (or equivalent generated runtime validator).
 *
 * Strict on import (Article XIV.4):
 *   - Throws SystemStateLoadError on any malformed candidate.
 *   - Throws SystemStateLoadError on multiple candidates with the same state_type.
 *   - Does NOT silently skip or fall back.
 *
 * @returns SystemStateMap — keys for state_types found, undefined for those not found.
 * @throws  SystemStateLoadError when any SystemState-shaped Feature is malformed.
 */
export function readSystemStateFromFeatureCollection(
  fc: FeatureCollection
): SystemStateMap;
```

**Observable behaviour invariants**:
- Pure function. No I/O. No mutation of `fc`.
- Order-independent: shuffling `fc.features` produces an identical `SystemStateMap`.
- Returns `{}` (all keys undefined) when `fc` has no `properties.kind === "SYSTEM"` Features.
- Returns a `SystemStateMap` with exactly one populated key when `fc` has one well-formed SystemState Feature.

### `writeSystemStateIntoFeatureCollection`

```typescript
/**
 * Produce a new FeatureCollection with SystemState features upserted to match `input`.
 *
 * For each populated key in `input`:
 *   - If a Feature with the corresponding state_type exists in fc.features:
 *       UPDATE: replace its properties, preserving its `id`, append a LogEntry
 *               to its provenance.
 *   - Else:
 *       CREATE: insert a new Feature with a fresh ULID-based id and a single
 *               LogEntry in provenance.
 *
 * For each absent key in `input`:
 *   - LEAVE unchanged. (This function does NOT delete SystemState features.
 *     If a caller wants "wipe spatial state", they pass `input.spatial = undefined`
 *     — not the same as "spatial absent from input".)
 *
 * Returns a NEW FeatureCollection — does not mutate `fc`.
 *
 * @param fc       The source FeatureCollection.
 * @param input    The desired SystemState values to upsert.
 * @param ctx      Provenance context (host + agent + version).
 * @returns        A new FeatureCollection with upserted SystemState features.
 */
export function writeSystemStateIntoFeatureCollection(
  fc: FeatureCollection,
  input: SystemStateWriteInput,
  ctx: SystemStateWriteContext
): FeatureCollection;
```

**Observable behaviour invariants**:
- Pure function. No I/O. Returns a new FeatureCollection — `fc` is not mutated.
- Idempotent up to provenance — calling `write(fc, sameInput, ctx)` twice produces FeatureCollections whose only difference is two LogEntry appends to each upserted variant's provenance array.
- Cardinality preserved: post-write, FC contains at most one Feature per `state_type` (FR-003).
- Geographic features in `fc.features` are passed through untouched — only SystemState features are added/updated.

### `applyReconciliation` (per-slice helpers)

```typescript
/**
 * Per-slice reconciliation helpers. Given the SystemStateMap value (possibly undefined)
 * for a variant AND the sidecar's corresponding slice, return the hydrated Zustand
 * slice shape with the FR-007 reconciliation rule applied: SystemState wins for
 * migrated fields, sidecar wins for non-migrated fields.
 *
 * These are pure mapping functions, individually unit-testable. They make the
 * "what counts as migrated" decision explicit per field — and that decision is
 * pinned by the const `MIGRATION_SCOPE` in mapping.ts.
 */
export function applyTemporalReconciliation(
  fromPlot: SystemStateMap['temporal'] | undefined,
  fromSidecar: SidecarTemporalSlice | undefined
): HydratedTemporalSlice;

export function applySpatialReconciliation(
  fromPlot: SystemStateMap['spatial'] | undefined,
  fromSidecar: SidecarSpatialSlice | undefined
): HydratedSpatialSlice;

export function applySelectionReconciliation(
  fromPlot: SystemStateMap['selection'] | undefined,
  fromSidecar: SidecarFeaturesSlice | undefined
): HydratedFeaturesSlice;
```

The `SidecarXxxSlice` and `HydratedXxxSlice` types are derived from the existing slice interfaces in `services/session-state/src/store/slices/` via the boundary-types-derived rule (Article IV.5).

### `prepareSidecarForSave` (drop-migrated-keys helper)

```typescript
/**
 * Given the current Zustand store slice values, return the shape that the sidecar
 * should be written with — i.e. the slice values with migrated keys omitted.
 *
 * The set of "migrated keys" comes from MIGRATION_SCOPE in mapping.ts — the single
 * source of truth for what moves and what stays.
 */
export function prepareSidecarForSave(args: {
  temporal: TemporalSlice;
  spatial: SpatialSlice;
  features: FeaturesSlice;
}): {
  temporal: PartialOmit<TemporalSlice, MigratedTemporalKeys>;
  spatial: PartialOmit<SpatialSlice, MigratedSpatialKeys>;
  features: PartialOmit<FeaturesSlice, MigratedSelectionKeys>;
};
```

---

## Compile-time exhaustiveness guards

```typescript
// exhaustive.ts — fails the build if LinkML adds a new SystemStateTypeEnum value and
// any of the helper modules hasn't been updated to handle it.

import type { SystemStateTypeEnum } from '@debrief/schemas';

type HandledStateTypes = 'temporal' | 'spatial' | 'selection' | 'active_storyboard';
type UnhandledStateTypes = Exclude<SystemStateTypeEnum, HandledStateTypes>;
type _ExhaustivenessGuard = [UnhandledStateTypes] extends [never] ? true : never;
const _assertExhaustive: _ExhaustivenessGuard = true;
```

This is Article IV.5's exhaustiveness mechanism applied to the helper.

---

## What the helper does NOT do (out-of-scope clarifications)

- **Does not perform I/O.** Reading the plot file and the sidecar, writing them back — those happen in `load.ts` / `save.ts`. The helper is a pure transformation layer.
- **Does not own the writer abstraction.** The host's existing `setFeatureCollection` (web-shell) or VS Code STAC writer is the persistence boundary. The helper produces the desired FeatureCollection; the caller hands it to the writer.
- **Does not validate non-SystemState features.** Tracks, points, etc. are passed through untouched. Their validation is upstream of this work.
- **Does not delete SystemState features.** There is no `delete` API. Writes are upserts only. Out of scope; can be added later if "reset SystemState" becomes a user-visible command.
- **Does not migrate sidecar versions.** The `SessionFile` version bump (R-004) is in `load.ts` / `save.ts`, not the helper.

---

## Testing expectations

| Module | Coverage target |
|---|---|
| `read.ts` | Every error path in `SystemStateLoadError.kind` enum hit at least once. Round-trip with `write.ts` passes for all four variants. |
| `write.ts` | Idempotent (modulo provenance) — verified. Cardinality invariant — verified. No mutation of input `fc` — verified by deep-equality after call. |
| `mapping.ts` | Each `MIGRATION_SCOPE` field-level mapping verified with a fixture pair (pre / post). |
| `validate.ts` | Every variant accepts a happy-path fixture; rejects a "wrong field" fixture; rejects a "wrong state_type" fixture. |
| `exhaustive.ts` | Compile test — type-only file. Verified by running `tsc --noEmit`. No runtime assertion needed beyond the constant declaration. |

All test files live in `services/session-state/src/system-state/__tests__/`.
