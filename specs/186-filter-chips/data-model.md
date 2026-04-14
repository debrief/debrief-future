# Phase 1 Data Model: Filter Bar Platform Chips

**Feature**: `186-filter-chips`
**Date**: 2026-04-14

This feature introduces **no new persistence model or schema**. It extends the in-memory TypeScript types owned by the filter bar (`shared/components/src/FilterBar/types.ts`) and reuses upstream types from the filter engine (`shared/components/src/filter-engine/types.ts`) and the shared schemas package (`@debrief/schemas#PlatformRecord`).

The only externally-visible "model" change is the shape of `SavedFilterConfiguration.filterBarState` — covered by Decision 7 in `research.md`.

## Entities

### LozengeItem (extended)

Represents a single chip in the filter bar. Becomes a discriminated union over `shape`.

**Fields (simple variant — existing)**:
| Field | Type | Notes |
|-------|------|-------|
| `kind` | `'lozenge'` (literal) | Distinguishes from `OrContainerItem` |
| `shape` | `'simple'` | New — defaults to `'simple'` for backwards compatibility on restore |
| `id` | `string` | UUID from `crypto.randomUUID()` |
| `filterType` | `FilterType` (pre-existing enum of 11 values) | Unchanged |
| `value` | `string` | Unchanged |
| `negated?` | `boolean` | Unchanged |

**Fields (platform variant — NEW)**:
| Field | Type | Notes |
|-------|------|-------|
| `kind` | `'lozenge'` (literal) | Same outer discriminator |
| `shape` | `'platform'` | Inner discriminator |
| `id` | `string` | UUID from `crypto.randomUUID()` |
| `filterType` | `'platform'` (literal, NEW value added to `FilterType`) | Single filter-type value for the compound chip |
| `attributes` | `PlatformAttributes` (new — see below) | At least one entry required |
| `negated?` | `boolean` | Same semantics as simple chip |

**Validation rules**:
- `attributes` MUST contain at least one entry. Reducer MUST reject `ADD_LOZENGE` actions with an empty `attributes` map (no-op + surfaced as an editor-side validation guard before dispatch).
- Every key of `attributes` MUST be a valid `PlatformField`: `id | name | nationality | vessel_class | vessel_type | vessel_role | domain`.
- Every value of `attributes` MUST be a non-empty string.

**State transitions** (only reducer actions that change a platform lozenge):
- `ADD_PLATFORM_LOZENGE { attributes }` — creates a new platform lozenge with `shape: 'platform'` and the given attributes; appended to top-level `items`.
- `EDIT_PLATFORM_LOZENGE { id, attributes }` — replaces the `attributes` map on the lozenge with the given `id`; identity (UUID) and negation flag preserved.
- `TOGGLE_NEGATE { id }` — unchanged; works on both simple and platform chips.
- `REMOVE_LOZENGE { id }` — unchanged; works on both simple and platform chips.
- `MOVE_TO_CONTAINER`, `MOVE_TO_TOP_LEVEL`, `ADD_CHILD_PLATFORM_LOZENGE` — same lifecycle as simple chips; a platform chip inside an OR container is permitted.

### PlatformAttributes (NEW)

```ts
type PlatformAttributes = Partial<Record<PlatformField, string>>;
```

Where `PlatformField` is imported from the filter-engine types: `'id' | 'name' | 'nationality' | 'vessel_class' | 'vessel_type' | 'vessel_role' | 'domain'`.

**UI-scoped subset** (attributes the new editor exposes): `nationality`, `domain`, `vessel_role`, `vessel_type`, `vessel_class`. (Comparison on `id` or `name` is out of scope for the visual editor; the CQL2 round-trip still handles them as round-trip-lossy — see research.md Decision 3.)

**Validation rules**:
- Keys are validated statically by the TypeScript `Partial<Record<...>>` type.
- Values are sanitised to trim surrounding whitespace before storage.
- A `vessel_class` value is expected to be a full taxonomy path (e.g., `surface/warship/frigate/type23`); the editor supplies these via the existing `SearchableCascadingMenu`.

### FilterType (extended enum)

```ts
// Before:
type FilterType = "vessel-class" | "tag" | "author" | "duration" | "modified"
  | "title" | "filename" | "plot-contents" | "track-name" | "nationality" | "collection";

// After:
type FilterType = "vessel-class" | "tag" | "author" | "duration" | "modified"
  | "title" | "filename" | "plot-contents" | "track-name" | "nationality" | "collection"
  | "platform";  // NEW
```

The new `"platform"` value is recognised by:
- `FILTER_TYPE_OPTIONS` — adds an entry `{ type: 'platform', label: 'Platform', inputMethod: 'compound' }` (new `'compound'` `InputMethod`).
- `getFilterTypeLabel` — returns `"Platform"`.
- `ValueEditor` — dispatches to the new `PlatformValueEditor`.
- `useDistinctValues` — adds a `platform` sub-object (see below).

### DistinctValuesMap (extended)

```ts
// Before: Readonly<Record<FilterType, readonly string[]>>
// After: previous fields unchanged, plus:
type DistinctValuesMap = Readonly<{
  // ... existing entries unchanged
  'platform': Readonly<{
    nationality: readonly string[];
    domain: readonly string[];
    vessel_role: readonly string[];
    vessel_type: readonly string[];
    // vessel_class intentionally omitted — taxonomy is the source of truth
  }>;
}>;
```

**Derivation**: For each `PlatformField` the editor exposes, `computeDistinctValues` flattens across `items[*].platforms[*]`, filters out nulls and empties, de-duplicates, and sorts alphabetically (via `localeCompare`).

### ArrayFilterPredicate → platform lozenge mapping

Bijective mapping (for UI-representable shapes — see research.md Decision 3 for edge-case handling):

| UI state (`PlatformAttributes`) | Engine state (`ArrayFilterPredicate`) |
|---------------------------------|---------------------------------------|
| `{ nationality: 'GB' }` | `{ array: 'platforms', predicate: { kind: 'comparison', field: 'nationality', value: 'GB' } }` |
| `{ nationality: 'GB', domain: 'subsurface' }` | `{ array: 'platforms', predicate: { kind: 'and', children: [ {kind:'comparison', field:'nationality', value:'GB'}, {kind:'comparison', field:'domain', value:'subsurface'} ] } }` |
| `{ nationality: 'GB' }` + `negated: true` on the lozenge | Same as first row, plus `negated: true` on the `ArrayFilterPredicate` |

**Construction** (`toFilterExpression`):
1. For each platform lozenge `L` with non-empty `attributes`:
   - Build comparisons `[{ kind: 'comparison', field: k, value: v }, …]` for each entry of `L.attributes`.
   - If one comparison: use it directly. If more than one: wrap in `{ kind: 'and', children: [...] }`.
   - Emit `{ array: 'platforms', predicate, negated: L.negated ?? false }`.
2. Emit all such predicates into `FilterExpression.arrayFilters`.

**Reverse mapping** (deserialiser from CQL2 JSON):
1. Accept an `ArrayFilterPredicate` whose `predicate` is either a single `comparison` or an AND of `comparison`s.
2. Flatten all comparisons into a `PlatformAttributes` map (last-write-wins on duplicate fields — rare in practice).
3. Produce a platform lozenge with those attributes.
4. Anything else (OR sub-predicates, nested ANDs, non-platform fields) → deserialisation error, surfaced as a restore banner.

## Saved Filter Configuration (migration)

The on-disk/saved shape of `SavedFilterConfiguration.filterBarState` is the same `FilterBarState`. Because the `shape` field is new on `LozengeItem`:

- **On save**: all lozenges are written with their current `shape` field.
- **On restore**: any `kind: 'lozenge'` entry without a `shape` field is coerced to `shape: 'simple'` by the restore hook. No breakage for pre-feature saved filters.

No increment to `SavedFiltersCollection.version` is required. If a future change warrants it, this feature's behaviour migrates cleanly because `shape` is already present on every saved record written after merge.

## Out of Scope (explicit non-entities)

- No new backend model.
- No change to `debrief:platforms` on STAC items or to `PlatformRecord` in `@debrief/schemas`.
- No change to `FilterExpression`, `ArrayFilterPredicate`, `CompoundPredicate`, or any filter-engine type — these are consumed as-is.
- No new persistence layer — the chip state lives in the existing reducer and is saved through the existing `SavedFiltersStorage` interface.
