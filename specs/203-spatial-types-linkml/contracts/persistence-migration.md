# Persistence Migration Contract

Target: session-state rehydration path (`services/session-state/src/persistence/`).

## Detection predicate

A persisted value is treated as a legacy tuple-form coordinate iff:

```typescript
function isLegacyCoordinateTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}
```

## Conversion

```typescript
function migrateCoordinate(value: [number, number]): Coordinate {
  return { longitude: value[0], latitude: value[1] };
}
```

## Application scope

The migration is applied ONLY within `SpatialSlice.viewport.coordinates[*]` of a persisted `SpatialSlice` payload. Specifically:

- If `persisted.spatial?.viewport?.coordinates` is an array and each element passes `isLegacyCoordinateTuple`, replace each element with `migrateCoordinate(element)`.
- Otherwise, leave the data unchanged (assume already-migrated object form, which the schema validator will accept).

The migration is NOT recursive across the entire state tree — it is a targeted, declarative fix-up at the one location where tuples were previously stored.

## Persistence schema version

- Previous version: read during implementation from `services/session-state/src/persistence/` (current on-disk version number).
- New version: previous + 1.
- The migration runs when an incoming payload's version is below the new value AND `persisted.spatial?.viewport?.coordinates[0]` passes `isLegacyCoordinateTuple`.

## Contract assertions

```typescript
describe('rehydrate with legacy tuple state', () => {
  const legacy = {
    version: PREVIOUS_VERSION,
    spatial: {
      viewport: {
        coordinates: [[-1, 52], [1, 52], [1, 51], [-1, 51]],
        zoom: 10,
      },
      rotation: 0,
      drawingMode: null,
      drawingPaletteIndex: 0,
    },
    temporal: { /* ... */ },
  };

  it('converts tuple-shaped coordinates to object form', () => {
    const store = rehydrateStore(legacy);
    expect(store.spatial.viewport!.coordinates).toEqual([
      { longitude: -1, latitude: 52 },
      { longitude: 1, latitude: 52 },
      { longitude: 1, latitude: 51 },
      { longitude: -1, latitude: 51 },
    ]);
    expect(store.spatial.viewport!.zoom).toBe(10);
  });

  it('bumps the stored version to the new value', () => {
    const store = rehydrateStore(legacy);
    expect(persistedVersion(store)).toBe(NEW_VERSION);
  });

  it('passes through already-migrated state unchanged', () => {
    const current = {
      version: NEW_VERSION,
      spatial: {
        viewport: {
          coordinates: [
            { longitude: -1, latitude: 52 },
            { longitude: 1, latitude: 52 },
            { longitude: 1, latitude: 51 },
            { longitude: -1, latitude: 51 },
          ],
          zoom: 10,
        },
        rotation: 0,
        drawingMode: null,
        drawingPaletteIndex: 0,
      },
      temporal: { /* ... */ },
    };
    const store = rehydrateStore(current);
    expect(store.spatial.viewport!.coordinates[0])
      .toEqual({ longitude: -1, latitude: 52 });
  });
});
```

## Lifecycle

The migration branch is marked with a comment such as:

```typescript
// REMOVABLE: added for feature 203 (spatial types consolidation, 2026-04-20).
// Once all production sessions have been rehydrated past version NEW_VERSION,
// this migration can be deleted and the version check tightened.
```

Removal is scheduled as a follow-up after a reasonable window (tracked in backlog, not blocking this feature).
