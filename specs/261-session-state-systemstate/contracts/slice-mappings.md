# Contract: Store-slice ↔ SystemState variant field mappings

**Feature**: `261-session-state-systemstate`
**Authoritative source for the migration scope.**

Pins the per-field mapping between the in-memory Zustand store slices and the on-plot-file `SystemState` variants (and the per-feature `visible` flag). Encoded as the single set of conversion functions in `services/session-state/src/system-state/mapping.ts` — never duplicated in `read.ts`/`write.ts`. Adding/removing a row requires a spec amendment.

> **These are NOT pure identity maps.** The store uses epoch numbers and a `FeatureSelection` object; the feature uses ISO strings and flat arrays. The conversions below are the contract.

---

## Temporal: `TemporalSlice` ↔ `state.temporal`

| Store key (`TemporalSlice.X`) | Type in store | Feature field | Type on feature | Verdict | Conversion |
|---|---|---|---|---|---|
| `timeRange.start` | epoch number | `start_time` | ISO-8601 | **Migrate** | `epochToISO` / `isoToEpoch` |
| `timeRange.end` | epoch number | `end_time` | ISO-8601 | **Migrate** | `epochToISO` / `isoToEpoch` |
| `currentTime` | epoch number \| null | `current_time` | ISO-8601 (optional) | **Migrate** | `null` ⇒ omit; else `epochToISO` |
| `timeFilter.start` | epoch number \| undefined | `filter_start_time` | ISO-8601 (optional) | **Migrate** | absent ⇒ omit; else `epochToISO` |
| `timeFilter.end` | epoch number \| undefined | `filter_end_time` | ISO-8601 (optional) | **Migrate** | absent ⇒ omit; else `epochToISO` |
| `displayMode` | enum | `display_mode` | `DisplayModeEnum` | **Migrate** | identity |
| `stepSize` | `{value,unit}` | `step_size` | `TimeStep` | **Migrate** | identity |
| `playbackRate` | number | `playback_rate` | float | **Migrate** | identity |
| `playbackState` | enum | — | — | **Ephemeral** | not persisted (→ `stopped` on load) |

`timeRange === null` ⇒ omit the whole `state.temporal` feature (no analytical window). On load, an absent `state.temporal` feature leaves the store at defaults (existing no-sidecar behaviour).

---

## Spatial: `SpatialSlice` ↔ `state.spatial`

| Store key (`SpatialSlice.X`) | Type | Feature field | Verdict | Conversion |
|---|---|---|---|---|
| `viewport` | `ViewportPolygon \| null` | `viewport` | **Migrate** | identity (same shape). `null` ⇒ omit `state.spatial` |
| `rotation` | number | `rotation` | **Migrate** | identity |
| `drawingMode` | enum \| null | — | **Ephemeral** | → `null` on load |
| `drawingPaletteIndex` | number | — | **Ephemeral** | → `0` on load |
| `viewportLocked` | boolean | — | **Ephemeral** | → `false` on load (spec 260 force-unlock) |

If `viewport` is null but `rotation` is non-default, the feature is still written (rotation is a meaningful view attribute); the spatial `rules:` block requires `viewport`, so when only rotation differs the helper writes the current `viewport` too (it will be non-null whenever a map has rendered). Practically `viewport === null` ⇒ omit; otherwise write both.

---

## Selection: `FeaturesSlice` ↔ `state.selection`

| Store key (`FeaturesSlice.X`) | Type | Feature field | Verdict | Conversion |
|---|---|---|---|---|
| `selection.featureIds` | string[] | `selected_ids` | **Migrate** | identity (selection-path strings pass through) |
| `selection.primary` | string \| null | `selected_primary` | **Migrate** | `null` ⇒ omit |
| `selection.timestamp` | `TimeInstant` | — | **Ephemeral** | regenerated (`createTimeInstant(Date.now())`) on load |
| `hiddenFeatureIds` | string[] | per-feature `properties.visible:false` | **Per-feature** | via `applyVisibilityToFeatureCollection` / `readHiddenFeatureIds` (NOT a SystemState field) |
| `featureCollectionUri` | string \| null | — | **Eliminated** | derived from the plot's own URI at load (self-reference) |
| `styleVersion` | number | — | **Ephemeral** | → `0` on load |

Empty `selected_ids: []` is meaningful (explicit no-selection) and round-trips as an empty array, not as an absent feature — but note: an empty selection ⇒ omit the `state.selection` feature entirely (absence and empty are equivalent for selection, since "nothing selected" is the default). The `state.selection` feature is written only when `featureIds.length > 0`.

---

## active_storyboard: storyboard slice ↔ `state.activestoryboard`

| Store key | Feature field | Verdict | Conversion |
|---|---|---|---|
| `activeStoryboardId` (string \| null) | `active_storyboard_id` | **Already #237** | identity; `null` ⇒ no feature. Helper delegates to `@debrief/components` `setActiveStoryboardSelection`/`getActiveStoryboardSelection` (R-011), unchanged wire shape (NG-002) |

---

## Visibility: `hiddenFeatureIds` ↔ per-feature `visible`

| Direction | Operation |
|---|---|
| save | for each feature, set `properties.visible = false` iff its id ∈ `hiddenFeatureIds`; otherwise omit/clear the flag |
| load | `hiddenFeatureIds = readHiddenFeatureIds(fc)` = ids of features with `properties.visible === false` |

Absent `visible` ⇒ visible. Toggling appends a `LogEntry` to that feature's own `provenance` via the host's `LogService` (R-012) — not by the pure helper.

---

## Ephemeral set (persisted nowhere; defaulted on load)

`playbackState` → `stopped`; `drawingMode` → `null`; `drawingPaletteIndex` → `0`; `viewportLocked` → `false`; `styleVersion` → `0`; `selection.timestamp` → regenerated; `featureCollectionUri` → derived from plot URI.

---

## Round-trip invariant (verified by R-006 tests)

```text
store value V at explicit save
  ──map→ write into features.geojson state.<type> feature (or per-feature visible)
  ──read→ SystemStateMap (+ hidden ids)
  ──map→ rehydrate store
  →  V'   where V' === V modulo:
          - float/ISO precision (≤ 1e-9 numeric; ISO-second timestamps — SC-001/SC-002)
          - regenerated selection.timestamp (intentional)
          - ephemeral fields reset to defaults (intentional)
```

For every key marked **Ephemeral** / **Eliminated**, the round-trip yields the default — that is the contract, not a loss.
