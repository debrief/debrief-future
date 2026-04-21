/**
 * Compile-time type assertions for the unified bounds module (FR-016 / Story 3).
 *
 * Each assertion confirms that a given feature-type family is assignable to
 * the `calculateBounds` parameter without any `as`-cast or type annotation.
 * These tests fail at `tsc --noEmit` time if the `BoundsInputFeature`
 * structural minimum is ever narrowed in a way that breaks the contract.
 *
 * Test (e) also confirms that a FeatureCollection-shaped object does NOT
 * assign directly to the parameter — callers must unwrap to `.features[]`
 * first (contract CB-7 caveat).
 */

import { expectTypeOf } from 'vitest';
import { calculateBounds } from '../src/bounds.js';
import type { SafeFeature } from '../src/types.js';
import type { DebriefFeature, DebriefFeatureCollection } from '@debrief/schemas';

// GeoJSON-like structural fixture for the raw-parse boundary use case.
// Mirrors `RawGeoJSONFeature` without importing from its canonical location
// to demonstrate the structural-subtyping contract is satisfied by any
// compatible shape.
interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown> | null;
}

// (a) DebriefFeature[] assigns to calculateBounds parameter
const debriefFeatures: DebriefFeature[] = [];
expectTypeOf(calculateBounds).toBeCallableWith(debriefFeatures);

// (b) SafeFeature[] assigns — SafeFeature has geometry: SafeGeometry | null
const safeFeatures: SafeFeature[] = [];
expectTypeOf(calculateBounds).toBeCallableWith(safeFeatures);

// (c) GeoJSONFeature[] assigns via structural-minimum narrowing gate
const geoJsonFeatures: GeoJSONFeature[] = [];
expectTypeOf(calculateBounds).toBeCallableWith(geoJsonFeatures);

// (d) BoundsInputFeature-shaped literal array assigns (structural minimum)
const minimalFeatures = [{ geometry: { type: 'Point', coordinates: [0, 0] } }];
expectTypeOf(calculateBounds).toBeCallableWith(minimalFeatures);

// (e) DebriefFeatureCollection does NOT assign directly — callers must unwrap.
// @ts-expect-error — FeatureCollection is not assignable to ReadonlyArray<BoundsInputFeature>
calculateBounds({} as DebriefFeatureCollection);
