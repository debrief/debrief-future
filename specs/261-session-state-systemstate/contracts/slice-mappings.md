# Contract: Slice ↔ SystemState variant field mappings

**Feature**: `261-session-state-systemstate`
**Authoritative source for the migration scope**.

This contract pins the **per-field** mapping between Zustand store slices (in-memory) and `SystemStateProperties` variants (on-plot-file). It is the canonical source the spec's "Per-slice migration scope" table refers to. The implementation MUST encode this mapping as a single typed constant in `services/session-state/src/system-state/mapping.ts` — never duplicate it in `read.ts` / `write.ts`. Adding or removing a row here requires a spec amendment.

---

## `temporal` slice ↔ `temporal` SystemState variant

| Zustand store key (`TemporalSlice.X`) | SystemStateProperties field | Verdict | Notes |
|---|---|---|---|
| `timeRange.start` (ISO-8601 string) | `start_time` (datetime) | **Migrate** | Plot-shared analytical window. |
| `timeRange.end` (ISO-8601 string) | `end_time` (datetime) | **Migrate** | Plot-shared analytical window. |
| `currentTime` (ISO-8601 string \| null) | `current_time` (datetime) | **Migrate** | Q2=B: plot-shared playhead. Null on Zustand side → absent on SystemState side. |
| `timeFilter` (object) | — | Stay in sidecar | Per-machine filter UI state. |
| `stepSize` (number) | — | Stay in sidecar | Per-machine playback granularity. |
| `playbackRate` (number) | — | Stay in sidecar | Per-machine playback speed. |
| `playbackState` (`'playing' \| 'paused' \| 'stopped'`) | — | Stay in sidecar | Per-machine transport state. |
| `displayMode` (enum) | — | Stay in sidecar | Per-machine viewport mode. |

**MIGRATION_SCOPE.temporal**:
```typescript
const TEMPORAL_MIGRATION_SCOPE = {
  storeToVariant: {
    'timeRange.start': 'start_time',
    'timeRange.end':   'end_time',
    'currentTime':     'current_time',
  },
  staysInSidecar: [
    'timeFilter', 'stepSize', 'playbackRate', 'playbackState', 'displayMode',
  ],
} as const;
```

---

## `spatial` slice ↔ `spatial` SystemState variant

Post-review (1B), the LinkML schema's `SystemStateProperties.spatial` variant carries a `viewport: ViewportPolygon` field whose shape is **identical** to `SpatialSlice.viewport`. The mapping is therefore an identity — no transformation, no derivation, no risk of round-trip drift.

| Zustand store key (`SpatialSlice.X`) | SystemStateProperties field | Verdict | Notes |
|---|---|---|---|
| `viewport` (`ViewportPolygon \| null`) | `viewport` (`ViewportPolygon`) | **Migrate** (identity) | Plot-shared map view. Same shape on both sides — no conversion. `null` on the slice maps to "no SystemState/spatial feature written" (and vice versa on load). |
| `rotation` (number) | — | Stay in sidecar | Per-machine map rotation; no schema home. |
| `drawingMode` (enum) | — | Stay in sidecar | Per-machine editor state. |
| `drawingPaletteIndex` (number) | — | Stay in sidecar | Per-machine editor state. |
| `viewportLocked` (boolean) | — | Stay in sidecar | Per-machine UI lock state. |

**MIGRATION_SCOPE.spatial**:
```typescript
const SPATIAL_MIGRATION_SCOPE = {
  storeToVariant: {
    'viewport': 'viewport',   // identity — same ViewportPolygon shape on both sides
  },
  staysInSidecar: [
    'rotation', 'drawingMode', 'drawingPaletteIndex', 'viewportLocked',
  ],
} as const;
```

**Why identity, not bbox/zoom/center**: Resolves a pre-existing Article II.1 violation in the LinkML schema, where `ViewportPolygon` and the old `bbox`/`zoom`/`center` parallel fields modelled the same concept. The schema is now the single source of truth for "what a saved viewport is shaped like", and the helper does not need a spatial-shape conversion function. See `linkml-delta.md` and `research.md` § R-010 for rationale.

---

## `features` slice ↔ `selection` SystemState variant

The `features` slice in `services/session-state/src/store/slices/features.ts` carries multiple concerns; only the `selection` portion migrates.

| Zustand store key (`FeaturesSlice.X`) | SystemStateProperties field | Verdict | Notes |
|---|---|---|---|
| `selection` (`string[]`) | `selected_ids` (`string[]`) | **Migrate** | Q1=B: plot-shared selection. Empty array maps to empty array (explicit no-selection); migrates as such. |
| `hiddenFeatureIds` (`string[]`) | — | Stay in sidecar | Per-machine visibility state. |
| `styleVersion` (number) | — | Stay in sidecar | Per-machine style cache marker. |
| `featureCollectionUri` (string) | — | Stay in sidecar | Per-machine URI binding (the actual plot file location varies per host). |

**MIGRATION_SCOPE.selection**:
```typescript
const SELECTION_MIGRATION_SCOPE = {
  storeToVariant: {
    'selection': 'selected_ids',
  },
  staysInSidecar: [
    'hiddenFeatureIds', 'styleVersion', 'featureCollectionUri',
  ],
} as const;
```

---

## `active_storyboard` slice ↔ `active_storyboard` SystemState variant

The `active_storyboard` variant is consumed by the **storyboard slice** (separate from the three sidecar slices above). #237 already ships this end-to-end in web-shell.

| Storyboard slice key | SystemStateProperties field | Verdict | Notes |
|---|---|---|---|
| `activeStoryboardId` (`string \| null`) | `active_storyboard_id` (`string`) | **Already migrated by #237.** | Wire shape unchanged by this work (NG-004). Read/write path is consolidated into the shared helper (FR-011/FR-012). |

**MIGRATION_SCOPE.active_storyboard**:
```typescript
const ACTIVE_STORYBOARD_MIGRATION_SCOPE = {
  storeToVariant: {
    'activeStoryboardId': 'active_storyboard_id',
  },
  staysInSidecar: [],
} as const;
```

The `staysInSidecar: []` is intentional — no part of the storyboard selection is sidecar-persisted today, and none becomes so post-migration.

---

## Type-level expression

The four `MIGRATION_SCOPE` constants are combined into one typed structure in `mapping.ts`:

```typescript
export const MIGRATION_SCOPE = {
  temporal:           TEMPORAL_MIGRATION_SCOPE,
  spatial:            SPATIAL_MIGRATION_SCOPE,
  selection:          SELECTION_MIGRATION_SCOPE,
  active_storyboard:  ACTIVE_STORYBOARD_MIGRATION_SCOPE,
} as const;

export type MigratedTemporalKeys =
  keyof (typeof MIGRATION_SCOPE)['temporal']['storeToVariant'];
// 'timeRange.start' | 'timeRange.end' | 'currentTime'

// …same pattern for spatial / selection.
```

These `MigratedXxxKeys` derived types feed the `PartialOmit<>` boundary-derivation in `data-model.md` § Entity 5, satisfying Article IV.5 (no hand-rewritten subset types).

---

## Round-trip invariant

For every migrated key in this contract, the following round-trip MUST hold (verified by R-006 tests):

```text
store value V at save time
  ──save→ written into plot file's SystemState feature
  ──load→ read back into SystemStateMap
  ──reconcile→ rehydrated into Zustand store
  →  value V (bit-equal modulo float-precision tolerance per SC-001)
```

For every key marked "Stay in sidecar", the round-trip operates entirely through the sidecar (no SystemState feature involvement) and is governed by the existing pre-migration round-trip tests in `services/session-state/src/persistence/__tests__/` (unchanged).
