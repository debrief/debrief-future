# Data Model: Viewport Lock

**Date**: 2026-05-18
**Spec**: [spec.md](./spec.md)

This feature adds **one** field to the in-memory session-state model and **one** optional field to the MCP `setViewport` output. No LinkML schema changes — both additions are TypeScript-only runtime fields, deliberately excluded from the on-disk session contract.

---

## Entity: `SpatialSlice` (extended)

Lives at `services/session-state/src/types/spatial.ts`.

### Before

```typescript
export interface SpatialSlice {
  /** Visible map area as 4-corner polygon (FR-012) */
  viewport: ViewportPolygon | null;
  /** Map rotation in degrees 0-360 (FR-013) */
  rotation: number;
  /** Active drawing mode for shape creation (FR-093) — EPHEMERAL */
  drawingMode: DrawingMode;
  /** Index into the drawing colour palette — EPHEMERAL (FR-096) */
  drawingPaletteIndex: number;
}
```

### After

```typescript
export interface SpatialSlice {
  viewport: ViewportPolygon | null;
  rotation: number;
  drawingMode: DrawingMode;
  drawingPaletteIndex: number;
  /**
   * When true, the map's viewport (centre + zoom) is frozen — see
   * spec 260. Disables Leaflet's six interaction handlers and the
   * toolbar zoom/fit buttons; banner is rendered. EPHEMERAL — never
   * persisted into .debrief.json (excluded via Omit on
   * PersistentSessionState.spatial).
   */
  viewportLocked: boolean;
}

export const DEFAULT_SPATIAL_SLICE: SpatialSlice = {
  viewport: null,
  rotation: 0,
  drawingMode: null,
  drawingPaletteIndex: 0,
  viewportLocked: false,
};

export interface SpatialActions {
  // … existing …
  setViewportLocked: (locked: boolean) => void;
}
```

**Validation**: none — `boolean` requires no further constraints. The action signature is total.

**State transitions**: trivially `false ↔ true`. Both transitions are user-driven (panel button, banner, `L` shortcut) or system-driven (plot/session load forces `false`). There are no intermediate "locking…" or "unlocking…" states.

---

## Entity: `PersistentSessionState.spatial` (narrowed)

Lives at `services/session-state/src/types/index.ts`.

### Before

```typescript
export interface PersistentSessionState {
  schemaVersion: string;
  savedAt: string;
  temporal: Omit<TemporalSlice, 'playbackState'>;
  spatial: SpatialSlice;
  features: FeaturesSlice;
}
```

### After

```typescript
export interface PersistentSessionState {
  schemaVersion: string;
  savedAt: string;
  temporal: Omit<TemporalSlice, 'playbackState'>;
  spatial: Omit<SpatialSlice, 'viewportLocked' | 'drawingMode' | 'drawingPaletteIndex'>;
  features: FeaturesSlice;
}
```

**Rationale**: Constitution Article IV.5 — boundary types are derived via `Omit<>`, never re-listed. The `Omit` excludes **all three** ephemeral spatial fields (`viewportLocked`, plus the pre-existing `drawingMode` and `drawingPaletteIndex` that are today hand-reset inside `extractPersistentState`). Adding any future ephemeral spatial field is a one-line union edit; the compile-time guarantee is that `extractPersistentState`'s returned spatial object cannot include any of the three — if someone tries to put them back at the persistence boundary, `tsc` rejects.

This is a tail-cleanup of pre-Article-IV.5 debt riding along with this feature, applied per `/speckit.review` decision 2A. The two existing hand-reset lines at `services/session-state/src/persistence/save.ts:42-43` (`drawingMode: null` / `drawingPaletteIndex: 0`) are deleted alongside the type change. Safe because `load.ts:237-238` already defensively coalesces missing fields back to defaults on read.

### Load-path defaulting

`services/session-state/src/persistence/load.ts` already restores the SpatialSlice fields one-by-one; we add `viewportLocked: false` to that block (FR-011, FR-012) so a session loaded from any previous version of the saved-state schema lands in the unlocked state regardless.

---

## Entity: `SetViewportOutput` (extended)

Lives at `services/session-state/src/server/tools/setViewport.ts`.

### Before

```typescript
export interface SetViewportOutput {
  success: boolean;
  viewport?: ViewportPolygon;
  center?: Coordinate;
  error?: string;
}
```

### After

```typescript
export interface SetViewportOutput {
  success: boolean;
  viewport?: ViewportPolygon;
  center?: Coordinate;
  error?: string;
  /**
   * Machine-detectable error tag (FR-009). Present iff success === false
   * AND the cause is a known structural condition (currently only the
   * viewport lock).
   */
  errorCode?: 'VIEWPORT_LOCKED';
}
```

**Validation**: `errorCode` is optional and a string literal — no runtime check required.

**State transitions**:
- `setViewport(locked = false, valid input)` → `{ success: true, viewport, center }` (unchanged)
- `setViewport(locked = false, invalid input)` → `{ success: false, error: '...' }` (unchanged — no `errorCode`)
- `setViewport(locked = true, any input)` → `{ success: false, error: 'Viewport is locked — unlock to change view.', errorCode: 'VIEWPORT_LOCKED' }` (NEW reject branch — runs **before** validation, so the lock is the dominant signal)

---

## What is NOT in the data model

- **No LinkML schema changes.** `viewportLocked` does not appear in `@debrief/schemas#SpatialSlice` (the generated schema-equivalent of the slice). This is deliberate — the field is runtime-only and not part of the cross-host data contract.
- **No new Storyboard or Scene field.** The captured viewport on a scene is unchanged; the lock state is independent of any scene's properties.
- **No provenance entry** for lock toggles. UI state changes are not provenance-worthy per Article III.1's spirit.
- **No on-disk migration.** Older `.debrief.json` files load identically; the new `viewportLocked: false` default is applied uniformly.
