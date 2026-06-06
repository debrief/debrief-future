/**
 * Derivation type-test for the permissive ingress boundary type (#212, SC-005).
 *
 * `IngressFeature` is a STRUCTURAL derivation of the schema-generated
 * `RawGeoJSONFeature` (Constitution Article IV.5): it widens `geometry` to
 * admit `null` and re-lists no fields. These assertions make that derivation
 * executable — they fail at `tsc --noEmit` time if:
 *   - the derivation is ever replaced by a hand-rewritten field list, or
 *   - `geometry` is widened by anything other than exactly `| null`.
 *
 * Because `IngressFeature` is derived via `Omit<…> & { geometry: … }`, adding a
 * new slot to `RawGeoJSONFeature` propagates to `IngressFeature` automatically
 * (no manual edit) — which is precisely what (1) below pins.
 */
import { describe, it, expectTypeOf } from "vitest";

import type {
  RawGeoJSONFeature,
  IngressFeature,
  IngressFeatureCollection,
} from "../../src/generated/typescript/index.js";

describe("IngressFeature derivation (#212 SC-005)", () => {
  // (1) A fully-specified RawGeoJSONFeature is a valid IngressFeature — only
  //     geometry is widened, so the raw type is assignable to the ingress type.
  //     Adding a field to RawGeoJSONFeature keeps this true automatically.
  it("RawGeoJSONFeature is assignable to IngressFeature", () => {
    expectTypeOf<RawGeoJSONFeature>().toMatchTypeOf<IngressFeature>();
  });

  // (2) geometry is widened by EXACTLY `| null` — no more, no less.
  it("IngressFeature.geometry === RawGeoJSONFeature.geometry | null", () => {
    expectTypeOf<IngressFeature["geometry"]>().toEqualTypeOf<
      RawGeoJSONFeature["geometry"] | null
    >();
  });

  // (3) Every non-geometry slot is carried through unchanged (Omit preserves
  //     the rest of the source shape — no field re-listing).
  it("non-geometry slots are preserved from the source", () => {
    expectTypeOf<IngressFeature["id"]>().toEqualTypeOf<RawGeoJSONFeature["id"]>();
    expectTypeOf<IngressFeature["properties"]>().toEqualTypeOf<
      RawGeoJSONFeature["properties"]
    >();
    expectTypeOf<IngressFeature["type"]>().toEqualTypeOf<RawGeoJSONFeature["type"]>();
  });

  // (4) The collection counterpart carries IngressFeature elements and admits
  //     a geometry: null member (RFC 7946 "unlocated" feature).
  it("IngressFeatureCollection carries nullable-geometry members", () => {
    expectTypeOf<IngressFeatureCollection["features"]>().toEqualTypeOf<
      IngressFeature[]
    >();

    const unlocated: IngressFeature = {
      type: "Feature",
      geometry: null,
      properties: { kind: "SYSTEM_RECORD" },
    };
    const fc: IngressFeatureCollection = { type: "FeatureCollection", features: [unlocated] };
    expectTypeOf(fc.features).items.toEqualTypeOf<IngressFeature>();
  });
});
