# Contract: Shared SystemState helper API

**Feature**: `261-session-state-systemstate`
**Module**: `services/session-state/src/system-state/`
**Public barrel**: `services/session-state/src/system-state/index.ts`
**Re-exported from**: `@debrief/session-state`

Pins the helper's public TypeScript surface. Internal modules (`read`, `write`, `visibility`, `mapping`, `validate`, `errors`, `exhaustive`) may be refactored freely as long as these exports keep their signatures and observable behaviour. The helper is **pure** — no I/O, no mutation of inputs.

> **Typing note (R-003)**: the generated `SystemStateProperties` is a flat interface (`kind: string`, `state_type: string`). The per-variant value types below are produced by `z.infer` of the Zod schemas in `validate.ts` — they are NOT `Extract<SystemStateProperties, …>` (which resolves to `never` against the flat interface). The Zod schemas are structurally checked against the generated interface so drift fails the build.

---

## Types

```typescript
import type { FeatureCollection } from 'geojson';
import type { LogEntry } from '@debrief/schemas';

export type SystemStateType =
  | 'temporal' | 'spatial' | 'selection' | 'active_storyboard';

// z.infer outputs — fully validated, fully typed per variant.
export type TemporalVariant = {
  kind: 'SYSTEM'; state_type: 'temporal';
  start_time: string; end_time: string;
  current_time?: string;
  filter_start_time?: string; filter_end_time?: string;
  display_mode?: 'full' | 'trail';
  step_size?: { value: number; unit: 'millisecond'|'second'|'minute'|'hour'|'day' };
  playback_rate?: number;
};
export type SpatialVariant = {
  kind: 'SYSTEM'; state_type: 'spatial';
  viewport: ViewportPolygon; rotation?: number;
};
export type SelectionVariant = {
  kind: 'SYSTEM'; state_type: 'selection';
  selected_ids: string[]; selected_primary?: string;
};
export type ActiveStoryboardVariant = {
  kind: 'SYSTEM'; state_type: 'active_storyboard';
  active_storyboard_id: string;
};

export interface SystemStateMap {
  temporal?: TemporalVariant;
  spatial?: SpatialVariant;
  selection?: SelectionVariant;
  active_storyboard?: ActiveStoryboardVariant;
}

/** Variant payloads to write — kind/state_type are supplied by the helper. */
export interface SystemStateWriteInput {
  temporal?: Omit<TemporalVariant, 'kind' | 'state_type'>;
  spatial?: Omit<SpatialVariant, 'kind' | 'state_type'>;
  selection?: Omit<SelectionVariant, 'kind' | 'state_type'>;
  active_storyboard?: Omit<ActiveStoryboardVariant, 'kind' | 'state_type'>;
}

export type SystemStateTool = 'vscode-extension' | 'web-shell-session-state';

export class SystemStateLoadError extends Error {
  readonly kind:
    | 'multiple-features-with-same-state-type'
    | 'malformed-feature'
    | 'unknown-state-type'
    | 'missing-discriminator'
    | 'cross-field-invariant';
  readonly featureIds: string[];
  readonly details?: unknown;
  constructor(opts: { kind: SystemStateLoadError['kind']; featureIds: string[]; details?: unknown; message: string });
}
```

---

## Functions

### `readSystemStateFromFeatureCollection`

```typescript
export function readSystemStateFromFeatureCollection(fc: FeatureCollection): SystemStateMap;
```

Scans `fc.features` for `properties.kind === "SYSTEM"`, validates each via the Zod variant schema, runs cross-field invariants, returns the map.

**Invariants**:
- Pure; no I/O; no mutation of `fc`; order-independent.
- `{}` when no SYSTEM features.
- Throws `SystemStateLoadError` on: malformed feature (`malformed-feature`), unknown `state_type` (`unknown-state-type`), missing discriminator (`missing-discriminator`), two features with the same `state_type` (`multiple-features-with-same-state-type`), or temporal cross-field violation (`cross-field-invariant`).
- Absence of a variant is **not** an error.

### `writeSystemStateIntoFeatureCollection`

```typescript
export function writeSystemStateIntoFeatureCollection(
  fc: FeatureCollection,
  input: SystemStateWriteInput,
): FeatureCollection;
```

For each populated key in `input`, upsert the `state.<type>` Feature (replace `properties` in place if it exists by id/state_type, else insert with id `state.<type>` and empty-Point geometry). Absent keys are left unchanged (no delete API). Returns a **new** FeatureCollection (geographic features passed through untouched).

**Invariants**:
- Pure; returns a new FC; `fc` not mutated.
- Cardinality preserved: ≤1 feature per `state_type` post-write.
- **No `provenance` written** on `state.*` features (FR-013).
- No `ctx`/provenance parameter (contrast prior #261 contract) — view features are lean.

### Visibility helpers

```typescript
/** Feature ids carrying properties.visible === false. */
export function readHiddenFeatureIds(fc: FeatureCollection): string[];

/** Return a new FC with properties.visible set to false on `hiddenIds`,
 *  and the flag cleared/omitted on all others. Pure. */
export function applyVisibilityToFeatureCollection(
  fc: FeatureCollection,
  hiddenIds: string[],
): FeatureCollection;
```

(Provenance for visibility transitions is appended by the **host** action via the existing `LogService`, not by this pure helper — R-012.)

### Reconciliation (store ↔ variant) — `mapping.ts`

```typescript
import type { TemporalSlice, SpatialSlice, FeaturesSlice } from '../store/...';

// Variant → store-slice fragment, applying epoch↔ISO and FeatureSelection conversions (R-006).
export function temporalVariantToSlice(v: TemporalVariant | undefined): Partial<TemporalSlice>;
export function spatialVariantToSlice(v: SpatialVariant | undefined): Partial<SpatialSlice>;
export function selectionVariantToSlice(v: SelectionVariant | undefined): Partial<Pick<FeaturesSlice, 'selection'>>;

// Store-slice → write-input fragment (inverse conversions). null/empty ⇒ omit the variant.
export function temporalSliceToInput(s: TemporalSlice): SystemStateWriteInput['temporal'] | undefined;
export function spatialSliceToInput(s: SpatialSlice): SystemStateWriteInput['spatial'] | undefined;
export function selectionSliceToInput(s: FeaturesSlice): SystemStateWriteInput['selection'] | undefined;
```

The conversions are the single source for "what migrates"; `read.ts`/`write.ts` never duplicate field lists. Epoch↔ISO uses the existing `epochToISO`/`isoToEpoch`/`timeRangeToISO`/`timeRangeFromISO`. Selection maps `FeatureSelection.featureIds ↔ selected_ids`, `FeatureSelection.primary ↔ selected_primary`; `timestamp` is regenerated on read.

### active_storyboard delegation (R-011)

```typescript
// The helper owns temporal/spatial/selection. For active_storyboard it delegates
// to the existing #237 logic in @debrief/components to avoid disturbing
// storyboard-playback internals — same wire shape (NG-002).
```

### Exhaustiveness guard — `exhaustive.ts`

```typescript
import type { SystemStateTypeEnum } from '@debrief/schemas';
type Handled = 'temporal' | 'spatial' | 'selection' | 'active_storyboard';
type _Guard = [Exclude<`${SystemStateTypeEnum}`, Handled>] extends [never] ? true : never;
const _assert: _Guard = true;
```

Adding a LinkML variant fails `tsc` until the helper handles it.

---

## Cross-field validation (`validate.ts`)

| Invariant | Variant | On violation |
|---|---|---|
| `current_time ∈ [start_time, end_time]` (when present) | temporal | `SystemStateLoadError(kind='cross-field-invariant')`, feature id + values |
| `start_time ≤ end_time` | temporal | `SystemStateLoadError(kind='cross-field-invariant')` |

No silent clamping (Article XIV.4). Hosts surface the message.

## What the helper does NOT do

- No I/O (read/write the plot file ↔ host load/save commands).
- No persistence-writer ownership (the host's FC write does that).
- No validation of non-SYSTEM features (passed through).
- No delete of SystemState features (upsert only).
- No dirty-flag management (host concern — FR-019/FR-020/FR-021).
- No visibility provenance (host action via `LogService`).

## Testing expectations

| Module | Coverage |
|---|---|
| `read.ts` | every `SystemStateLoadError.kind` hit; round-trip with `write.ts` for all variants |
| `write.ts` | no input mutation (deep-equal after call); cardinality ≤1/type; no provenance on `state.*` |
| `visibility.ts` | absent=visible; hidden round-trip; clearing on reveal |
| `mapping.ts` | epoch↔ISO bit-equality (tolerance per SC-001); FeatureSelection split; null/empty ⇒ omit |
| `validate.ts` | each variant accepts happy fixture, rejects wrong-shape, cross-field fires |
| `exhaustive.ts` | type-only; verified by `tsc --noEmit` |
