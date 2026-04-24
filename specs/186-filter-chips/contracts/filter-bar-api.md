# Contract: FilterBar Public API (after #186)

**Applies to**: `@debrief/components` — `shared/components/src/FilterBar/`
**Scope**: Public surface exposed by the FilterBar package after the platform-chip feature lands. All breaking changes are additive to existing discriminated unions and enum types.

## Exported changes

### 1. `FilterType` enum — one new value

```ts
// File: shared/components/src/filter-engine/types.ts
export type FilterType =
  | "vessel-class"
  | "tag"
  | "author"
  | "duration"
  | "modified"
  | "title"
  | "filename"
  | "plot-contents"
  | "track-name"
  | "nationality"
  | "collection"
  | "platform"; // NEW
```

### 2. `InputMethod` enum — one new value

```ts
// File: shared/components/src/FilterBar/types.ts
export type InputMethod =
  | 'hierarchical'
  | 'flat-dropdown'
  | 'free-text'
  | 'bucket'
  | 'typeahead'
  | 'compound'; // NEW — used by the platform editor
```

### 3. `LozengeItem` — discriminated union

```ts
// File: shared/components/src/FilterBar/types.ts

export type SimpleLozengeItem = {
  readonly kind: 'lozenge';
  readonly shape: 'simple';           // NEW discriminator
  readonly id: string;
  readonly filterType: Exclude<FilterType, 'platform'>;
  readonly value: string;
  readonly negated?: boolean;
};

export type PlatformLozengeItem = {   // NEW
  readonly kind: 'lozenge';
  readonly shape: 'platform';
  readonly id: string;
  readonly filterType: 'platform';
  readonly attributes: PlatformAttributes;
  readonly negated?: boolean;
};

export type LozengeItem = SimpleLozengeItem | PlatformLozengeItem;

export type PlatformAttributes = Partial<Record<PlatformField, string>>;
```

**Invariant**: `PlatformLozengeItem.attributes` has at least one populated entry. Producers MUST enforce this before dispatching an action; consumers MAY assume it at read time.

### 4. `FilterBarAction` — two new action types

```ts
// File: shared/components/src/FilterBar/types.ts
export type FilterBarAction =
  // ... existing 10 actions unchanged
  | { type: 'ADD_PLATFORM_LOZENGE'; attributes: PlatformAttributes }           // NEW
  | { type: 'EDIT_PLATFORM_LOZENGE'; id: string; attributes: PlatformAttributes } // NEW
  | { type: 'ADD_CHILD_PLATFORM_LOZENGE'; containerId: string; attributes: PlatformAttributes }; // NEW
```

The existing `ADD_LOZENGE`, `EDIT_LOZENGE`, `ADD_CHILD_LOZENGE` actions are preserved unchanged for simple lozenges.

### 5. `UseFilterBarReturn` — three new helpers

```ts
// File: shared/components/src/FilterBar/useFilterBar.ts
export interface UseFilterBarReturn {
  // ... existing members unchanged
  readonly addPlatformLozenge: (attributes: PlatformAttributes) => void;   // NEW
  readonly editPlatformLozenge: (id: string, attributes: PlatformAttributes) => void; // NEW
  readonly addChildPlatformLozenge: (containerId: string, attributes: PlatformAttributes) => void; // NEW
}
```

### 6. `DistinctValuesMap` — platform sub-object

```ts
// File: shared/components/src/FilterBar/useDistinctValues.ts
export type DistinctValuesMap = Readonly<Record<Exclude<FilterType, 'platform'>, readonly string[]> & {
  readonly 'platform': Readonly<{
    readonly nationality: readonly string[];
    readonly domain: readonly string[];
    readonly vessel_role: readonly string[];
    readonly vessel_type: readonly string[];
  }>;
}>;
```

### 7. `PlatformValueEditor` — new component

```ts
// File: shared/components/src/FilterBar/PlatformValueEditor.tsx

export interface PlatformValueEditorProps {
  readonly initialAttributes: PlatformAttributes;
  readonly availableValues: Readonly<{
    readonly nationality: readonly string[];
    readonly domain: readonly string[];
    readonly vessel_role: readonly string[];
    readonly vessel_type: readonly string[];
  }>;
  readonly taxonomy: readonly VesselTaxonomyNode[];
  readonly taxonomyCounts?: ReadonlyMap<string, number>;
  readonly onConfirm: (attributes: PlatformAttributes) => void;
  readonly onCancel: () => void;
}

export const PlatformValueEditor: React.FC<PlatformValueEditorProps>;
```

Behaviour:
- Renders a popover with a picker per exposed attribute plus confirm/cancel buttons.
- Confirm is disabled until at least one attribute has a value.
- Pre-fills pickers from `initialAttributes`.
- Clearing a picker removes that attribute from the confirmed map.
- Closes on click-outside (calls `onCancel`) and on Escape (calls `onCancel`).

### 8. `FilterBar` props — unchanged

No new props are added to `FilterBarProps`. The new chip type works entirely through existing `initialFilterState` and `savedFiltersStorage`.

## Consumers that MUST be updated

1. `Lozenge.tsx` — narrow on `item.shape`; render platform label from `item.attributes` via `Decision 5` (research.md).
2. `OrContainer.tsx` — rendering already treats children as `LozengeItem`; must widen to the new union.
3. `FilterBar.tsx` — add a branch in `handleSelectType` (or parallel state) so selecting `'platform'` opens `PlatformValueEditor` instead of `ValueEditor`.
4. `ValueEditor.tsx` — either dispatch to `PlatformValueEditor` for `'platform'` or keep the two editors independent (preferred — simpler type narrowing).
5. `FilterTypeMenu.tsx` — no explicit change needed; it pulls from `FILTER_TYPE_OPTIONS`.
6. `useFilterBar.ts` — reducer cases for `ADD_PLATFORM_LOZENGE`, `EDIT_PLATFORM_LOZENGE`, `ADD_CHILD_PLATFORM_LOZENGE`, plus three new helper callbacks and updated `toFilterExpression` (produces `arrayFilters` entries).

## Backwards compatibility

- Consumers that read `LozengeItem.value` MUST first narrow by `shape === 'simple'`. The TypeScript compiler enforces this; existing code that calls `.filter(i => i.kind === 'lozenge')` then reads `i.value` will fail type-checking until it adds a `shape` narrow. This is acceptable and caught at compile time.
- Saved filter payloads written before this feature that contain only simple lozenges deserialise correctly via the `shape: 'simple'` coercion in `useSavedFilters.ts`.
