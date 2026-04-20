# Persistence Migration Contract

Target integration point: `services/session-state/src/persistence/load.ts`, specifically:

- the `coerceEpoch` helper pattern at `load.ts:186-192` (sibling to extend)
- the `applySessionState` function at `load.ts:84` (specifically line 125: `store.getState().setViewport(spatial.viewport as never)`)
- the `migrateSession` function in `load.ts` / `schema.ts`
- the `SCHEMA_VERSION` constant at `services/session-state/src/types/index.ts:25`

## Helper: `coerceViewport`

```typescript
import type { ViewportPolygon } from '@debrief/schemas';

/**
 * Coerce an arbitrary persisted value into a ViewportPolygon or null.
 *
 * Handles both the current object-form shape and the legacy tuple-form shape
 * that predates feature 203. Returns null when the input is not a recognisable
 * viewport (caller leaves the viewport unset).
 *
 * Sibling to coerceEpoch — same "sniff shape, convert inline" pattern.
 *
 * REMOVABLE: the legacy-tuple branch may be deleted once all production
 * sessions have rehydrated past SCHEMA_VERSION 1.1.0.
 */
function coerceViewport(value: unknown): ViewportPolygon | null {
  if (value == null || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const coordinates = raw.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 4) return null;

  const migrated = coordinates.map((c) => {
    if (isLegacyCoordinateTuple(c)) {
      return { longitude: c[0], latitude: c[1] };
    }
    if (c != null && typeof c === 'object' && 'longitude' in c && 'latitude' in c) {
      return c as { longitude: number; latitude: number };
    }
    return null;
  });

  if (migrated.some((c) => c == null)) return null;

  const result: ViewportPolygon = {
    coordinates: migrated as ViewportPolygon['coordinates'],
  };
  if (typeof raw.zoom === 'number') {
    result.zoom = raw.zoom;
  }
  return result;
}

function isLegacyCoordinateTuple(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}
```

## Application point

Replace `load.ts:125`:

```typescript
// Before (blind cast — Article I.3 violation):
if (spatial.viewport) {
  store.getState().setViewport(spatial.viewport as never);
}

// After:
if (spatial.viewport) {
  store.getState().setViewport(coerceViewport(spatial.viewport));
}
```

The `as never` cast is removed. `coerceViewport` returns `ViewportPolygon | null` which matches the `setViewport` signature. If the persisted value is unparseable, `setViewport(null)` leaves the viewport unset (same as "no viewport saved") — loud enough to notice in the map UI, not catastrophic.

## Schema version bump

| Constant | Before | After |
|----------|--------|-------|
| `SCHEMA_VERSION` in `services/session-state/src/types/index.ts:25` | `'1.0.0'` | `'1.1.0'` |
| `SCHEMA_VERSION_HISTORY` in `persistence/schema.ts:20` | `['1.0.0']` | `['1.0.0', '1.1.0']` |

`isVersionCompatible` gates on major version only, so a minor bump does NOT break `1.0.0` files — they still load, and the `coerceViewport` branch handles their shape. The version bump is purely diagnostic: it surfaces in logs (`SessionFileHeader.version`) so operators can see which migration path a file took.

## `migrateSession` branch

```typescript
// In persistence/schema.ts or inlined in load.ts — choose whichever fits
// the existing pattern better:
export function migrateSession(
  data: Record<string, unknown>,
  fromVersion: string
): Record<string, unknown> {
  if (fromVersion === SCHEMA_VERSION) return data;

  // REMOVABLE: added for feature 203 (spatial types consolidation, 2026-04-20).
  // Once all production session files have been saved with viewport in object
  // form (version >= 1.1.0), this branch can be deleted.
  if (fromVersion === '1.0.0') {
    // Viewport migration is handled inline by coerceViewport in
    // applySessionState — no data mutation required here. This branch exists
    // only to satisfy the "migrations must acknowledge every past version"
    // discipline (see schema.ts SCHEMA_VERSION_HISTORY).
    return data;
  }

  return data;
}
```

Note: the migration work happens in `coerceViewport`, not `migrateSession`, because `migrateSession` receives raw `Record<string, unknown>` (no schema shape) and would have to re-parse the whole payload. Keeping the fix-up at the setter boundary (the existing pattern used by `coerceEpoch`) is simpler and consistent.

## Contract assertions

### Unit test — `coerceViewport.test.ts` (review Gap A)

```typescript
describe('coerceViewport', () => {
  it('converts a legacy tuple-form viewport to object form', () => {
    const legacy = {
      coordinates: [[-1, 52], [1, 52], [1, 51], [-1, 51]],
      zoom: 10,
    };
    expect(coerceViewport(legacy)).toEqual({
      coordinates: [
        { longitude: -1, latitude: 52 },
        { longitude: 1, latitude: 52 },
        { longitude: 1, latitude: 51 },
        { longitude: -1, latitude: 51 },
      ],
      zoom: 10,
    });
  });

  it('passes through an already-object viewport unchanged (by value)', () => {
    const current: ViewportPolygon = {
      coordinates: [
        { longitude: -1, latitude: 52 },
        { longitude: 1, latitude: 52 },
        { longitude: 1, latitude: 51 },
        { longitude: -1, latitude: 51 },
      ],
      zoom: 10,
    };
    expect(coerceViewport(current)).toEqual(current);
  });

  it('returns null for null or undefined', () => {
    expect(coerceViewport(null)).toBeNull();
    expect(coerceViewport(undefined)).toBeNull();
  });

  it('returns null when coordinates is missing or wrong length', () => {
    expect(coerceViewport({ coordinates: [] })).toBeNull();
    expect(coerceViewport({ coordinates: [[1, 2], [3, 4]] })).toBeNull(); // length 2
    expect(coerceViewport({})).toBeNull();
    expect(coerceViewport('not an object')).toBeNull();
  });

  it('returns null when a coordinate entry is malformed', () => {
    const malformed = {
      coordinates: [[-1, 52], 'not a coord', [1, 51], [-1, 51]],
    };
    expect(coerceViewport(malformed)).toBeNull();
  });

  it('omits zoom when the input has no zoom or non-numeric zoom', () => {
    expect(coerceViewport({
      coordinates: [[-1, 52], [1, 52], [1, 51], [-1, 51]],
    })).not.toHaveProperty('zoom');
    expect(coerceViewport({
      coordinates: [[-1, 52], [1, 52], [1, 51], [-1, 51]],
      zoom: 'bad',
    })).not.toHaveProperty('zoom');
  });
});
```

### Integration test — `loadSession` with legacy payload

```typescript
describe('loadSession with legacy tuple-form viewport', () => {
  it('rehydrates tuple-form coordinates to object form', async () => {
    const legacyFile = {
      version: '1.0.0',
      savedAt: '2026-01-01T00:00:00.000Z',
      temporal: { /* ... */ },
      spatial: {
        viewport: {
          coordinates: [[-1, 52], [1, 52], [1, 51], [-1, 51]],
          zoom: 10,
        },
        rotation: 0,
        drawingMode: null,
        drawingPaletteIndex: 0,
      },
      features: { /* ... */ },
    };
    const path = writeTempFile(JSON.stringify(legacyFile));
    const store = createStore();

    const result = await loadSession(store, path);

    expect(result.success).toBe(true);
    expect(store.getState().viewport).toEqual({
      coordinates: [
        { longitude: -1, latitude: 52 },
        { longitude: 1, latitude: 52 },
        { longitude: 1, latitude: 51 },
        { longitude: -1, latitude: 51 },
      ],
      zoom: 10,
    });
  });
});
```

## Lifecycle

The `coerceViewport` legacy-tuple branch is annotated as removable. Once all saved session files have been re-saved under `SCHEMA_VERSION = '1.1.0'` (confirmed by checking a sample of user disks or by time-boxed deprecation window), the `isLegacyCoordinateTuple` branch and `migrateFrom_1_0_0` logic can be deleted in a follow-up. This cleanup is captured as a Follow-up item in the spec rather than a BACKLOG.md entry.
