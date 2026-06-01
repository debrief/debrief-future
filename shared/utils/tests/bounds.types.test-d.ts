/**
 * Compile-time type assertions for the unified bounds module (FR-016 / Story 3).
 *
 * Each assertion confirms that a given feature-type family is assignable to
 * the `calculateBounds` parameter without any `as`-cast or type annotation.
 * These tests fail at `tsc --noEmit` time if the `BoundsInputFeature`
 * structural minimum is ever narrowed in a way that breaks the contract.
 *
 * Tests (e) and (f) confirm that FeatureCollection-shaped objects assign
 * directly — no `.features[]` unwrap required at the call site (FR-001).
 */

import { expectTypeOf } from 'vitest';
import { calculateBounds } from '../src/bounds.js';
import type {
  DebriefFeature,
  DebriefFeatureCollection,
  IngressFeature,
  RawGeoJSONFeature,
  RawGeoJSONFeatureCollection,
} from '@debrief/schemas';

// (a) DebriefFeature[] assigns to calculateBounds parameter
const debriefFeatures: DebriefFeature[] = [];
expectTypeOf(calculateBounds).toBeCallableWith(debriefFeatures);

// (b) IngressFeature[] assigns — schema-derived permissive boundary feature
//     (geometry: RawGeoJSONFeature['geometry'] | null)
const ingressFeatures: IngressFeature[] = [];
expectTypeOf(calculateBounds).toBeCallableWith(ingressFeatures);

// (c) RawGeoJSONFeature[] assigns — parse-boundary feature family (FR-016)
const rawFeatures: RawGeoJSONFeature[] = [];
expectTypeOf(calculateBounds).toBeCallableWith(rawFeatures);

// (d) BoundsInputFeature-shaped literal array assigns (structural minimum)
const minimalFeatures = [{ geometry: { type: 'Point', coordinates: [0, 0] } }];
expectTypeOf(calculateBounds).toBeCallableWith(minimalFeatures);

// (e) DebriefFeatureCollection assigns directly — auto-unwrapped inside calculateBounds (FR-001)
const debriefFeatureCollection = {} as DebriefFeatureCollection;
expectTypeOf(calculateBounds).toBeCallableWith(debriefFeatureCollection);

// (f) RawGeoJSONFeatureCollection also assigns directly (FR-001)
const rawFeatureCollection: RawGeoJSONFeatureCollection = { type: 'FeatureCollection', features: [] };
expectTypeOf(calculateBounds).toBeCallableWith(rawFeatureCollection);
