# Validator Contracts

Target package: `@debrief/utils` (source: `shared/utils/src/`).

Moved from: `services/session-state/src/types/spatial.ts` (tuple-shaped input).

## Exports

```typescript
import type { Coordinate, ViewportPolygon } from '@debrief/schemas';

/**
 * Validate that a coordinate lies within valid geographic bounds.
 *
 * @param coord — Coordinate object to check.
 * @returns true iff longitude ∈ [-180, 180] AND latitude ∈ [-90, 90].
 */
export function validateCoordinate(coord: Coordinate): boolean;

/**
 * Validate a viewport polygon.
 *
 * @param viewport — ViewportPolygon object.
 * @returns true iff:
 *   - viewport.coordinates has exactly 4 entries (NW, NE, SE, SW)
 *   - every entry passes validateCoordinate
 */
export function validateViewportPolygon(viewport: ViewportPolygon): boolean;

/**
 * Calculate the geometric centre of a viewport polygon by averaging the four corners.
 *
 * @param viewport — ViewportPolygon object assumed to be valid.
 * @returns A Coordinate at the viewport's centre.
 */
export function calculateViewportCenter(viewport: ViewportPolygon): Coordinate;
```

## Contract assertions

```typescript
describe('validateCoordinate', () => {
  it.each([
    [{ longitude: 0, latitude: 0 }, true],
    [{ longitude: -180, latitude: -90 }, true],
    [{ longitude: 180, latitude: 90 }, true],
    [{ longitude: 180.1, latitude: 0 }, false],
    [{ longitude: 0, latitude: 90.1 }, false],
    [{ longitude: -180.1, latitude: 0 }, false],
    [{ longitude: 0, latitude: -90.1 }, false],
  ])('validates %o as %s', (coord, expected) => {
    expect(validateCoordinate(coord)).toBe(expected);
  });
});

describe('validateViewportPolygon', () => {
  const valid: ViewportPolygon = {
    coordinates: [
      { longitude: -1, latitude: 52 }, // NW
      { longitude: 1, latitude: 52 },  // NE
      { longitude: 1, latitude: 51 },  // SE
      { longitude: -1, latitude: 51 }, // SW
    ],
  };

  it('accepts a 4-corner polygon of valid coordinates', () => {
    expect(validateViewportPolygon(valid)).toBe(true);
  });

  it('rejects a 3-corner polygon (cardinality)', () => {
    expect(validateViewportPolygon({ coordinates: valid.coordinates.slice(0, 3) }))
      .toBe(false);
  });

  it('rejects a 5-corner polygon (cardinality)', () => {
    expect(validateViewportPolygon({
      coordinates: [...valid.coordinates, valid.coordinates[0]],
    })).toBe(false);
  });

  it('rejects if any coordinate is out of bounds', () => {
    const bad = { ...valid, coordinates: [...valid.coordinates] };
    bad.coordinates[0] = { longitude: 181, latitude: 52 };
    expect(validateViewportPolygon(bad)).toBe(false);
  });
});

describe('calculateViewportCenter', () => {
  it('averages the four corners', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: -2, latitude: 52 },
        { longitude: 2, latitude: 52 },
        { longitude: 2, latitude: 50 },
        { longitude: -2, latitude: 50 },
      ],
    };
    expect(calculateViewportCenter(viewport)).toEqual({ longitude: 0, latitude: 51 });
  });
});
```

## Behavioural guarantees

- **Pure functions** — deterministic, no side effects.
- **Type-safe** — input types are canonical; validators return `boolean`, centre returns `Coordinate`.
- **No logging, no throwing** — validators return `false` rather than throwing on invalid input. Callers decide how to react.
