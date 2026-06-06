# Research: #212 — Replace hand-written `Safe*` feature types

**Date**: 2026-06-01 | **Feature**: `212-linkml-safe-feature-types`

All unknowns from the Technical Context are resolved below. Each entry: **Decision / Rationale / Alternatives considered**. The usage-site inventory itself is in `evidence/audit-gap-report.md` (Phase −1 / User Story 1).

---

## R1. Shared permissive boundary type — definition and home

**Decision.** Add `IngressFeature` and `IngressFeatureCollection` to `shared/schemas/src/generated/typescript/unions.ts`, derived structurally from the generated `RawGeoJSONFeature`:

```ts
export type IngressFeature =
  Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null };

export interface IngressFeatureCollection {
  type: 'FeatureCollection';
  features: IngressFeature[];
  bbox?: number[];
}
```

**Rationale.** `unions.ts` is already the **hand-maintained companion** for schema-generated types — it imports the generated `./types.js` and defines `DebriefFeature`, `DebriefFeatureCollection`, and the `isTrackFeature`/… guards. It is not generator output (it survives `schema:generate`), so editing it does not trip `schema:check-drift`, and it is the established precedent for "convenience types built structurally on generated ones." Co-locating `IngressFeature` with `RawGeoJSONFeature` means every consumer imports the permissive type from the same `@debrief/schemas` surface. The `Omit<…> & { geometry: …| null }` form is exactly the Article IV.5 derivation idiom, so the boundary type cannot silently drift when `RawGeoJSONFeature` grows a field.

**Alternatives considered.**
- *Home in `@debrief/utils`* — rejected: `@debrief/utils` is where the hand-written `SafeFeature` lives today; moving the type to `@debrief/schemas` puts it next to its derivation source and reinforces "schema-rooted."
- *New LinkML class (Strategy B)* — rejected at spec time: adds a second loose-feature class (ADR-021 caution), fixtures, regeneration, version bump. Structural derivation suffices.
- *Widen coordinates to `unknown` too* — rejected: that re-introduces a hand-written geometry shape (the old `SafeGeometry`). The audit shows genuine `coordinates: unknown` reliance is confined to category-(a) coordinate-read sites, handled separately (R2). The derived type keeps `RawGeoJSONFeature`'s typed-union coordinates (same trust level ADR-021 already accepted at parse boundaries).

---

## R2. Coordinate-read gaps (category a) — reuse `calculateBounds`

**Decision.** Replace `stacService.calculateBboxFromFeatures` + its private `extractCoordinates(geometry: SafeGeometry)` with a call to `@debrief/utils` `calculateBounds`. For the remaining coordinate-read sites (`importRep`, `mapPanel`, `pointInZoneClassifier`), keep their existing local logic; their `as number[]` / `as number[][]` casts are **named-type casts** (lint-clean under XV.7) and change only by source-type rename.

**Rationale.** `calculateBounds(features)` returns `[minLon, minLat, maxLon, maxLat] | null` — exactly the tuple `calculateBboxFromFeatures` returns. It accepts the private `BoundsInputFeature` structural minimum, to which `RawGeoJSONFeature[]`, `IngressFeature[]`, and `DebriefFeature[]` are all assignable without casts. Critically, `extractCoordinates` only handles `Point`/`LineString`/`Polygon` — it **silently omits** `MultiPoint`/`MultiLineString`/`MultiPolygon`, so the current bbox is wrong for Multi* features; `calculateBounds` handles all seven via the cast-free `coerceCoordinates`/`detectDepth` narrowing gate, **fixing a latent bug** while removing the `SafeGeometry` dependency and three `as` casts. It also honours a pre-computed `feature.bbox` fast-path.

**Alternatives considered.**
- *Introduce a module-private `{ type: string; coordinates: unknown }` minimum for `extractCoordinates`* (the original spec FR-004 fallback) — superseded: reuse is strictly better (DRY, removes casts, fixes the Multi* bug). FR-004's "module-private minimum" remains the pattern of record only if a future coordinate-read site cannot reuse `calculateBounds`.

---

## R3. Cast strategy under Constitution Article XV.7

**Decision.** The migration introduces **no** new `as Record<…>`, `as unknown [as T]`, or inline-object (`as { … }`) casts. It (a) retargets existing **named-type** boundary casts (`JSON.parse(x) as SafeFeatureCollection` → `as IngressFeatureCollection`; `f.geometry as SafeGeometry | null` → `as IngressFeature['geometry']`), which are lint-clean; (b) removes the `as number[]*` casts in `stacService` via the R2 reuse; and (c) reworks the one inline-object cast at `apps/web-shell/src/mocks/calcService.ts:248` (`f.geometry as { coordinates: unknown }`) into a named-type cast (or guard) as part of the `toSafeFeatures → toIngressFeatures` rename. Any genuinely unavoidable boundary cast carries a `// SAFETY:` comment.

**Rationale.** Each package's `.eslintrc.cjs` enforces `no-restricted-syntax` with `TSAsExpression[typeAnnotation.typeName.name='Record']` and `TSAsExpression > TSUnknownKeyword` (bans `as Record` and `as unknown`). The inline-object selector `TSAsExpression > TSTypeLiteral` is currently only in `shared/components` (at `warn`); BACKLOG **#277** owns its repo-wide rollout + the existing inline-cast cleanup. So named-type casts pass today; retargeting them is behaviour- and lint-neutral. Reworking the `mocks/calcService.ts` inline cast is a small, in-scope XV.7 improvement that also clears one of #277's web-shell items — but this feature must **not** expand into #277's broader cleanup.

**Alternatives considered.**
- *Add runtime validators (Zod/guards) at every parse boundary* — rejected: spec assumption A-2 forbids adding new runtime validation; the existing boundaries cast (accepted trust level since ADR-021). Out of scope; would change runtime behaviour.
- *Leave the `mocks/calcService.ts` inline cast as-is* — acceptable (web-shell does not yet error on it), but reworking it during the rename is low-cost and forward-aligned with #277.

---

## R4. Regression guard (FR-007)

**Decision.** Extend `scripts/check-no-geojson-feature.sh` to also fail on hand-written `Safe*` feature definitions — add grep patterns for `interface Safe(Feature|Geometry|FeatureCollection)\b` and `type Safe(Feature|Geometry|FeatureCollection)\s*=` across `apps/ shared/ services/`. Keep the existing `interface GeoJSONFeature` check. Update the diagnostic to point at `RawGeoJSONFeature` (result-carrying) / `IngressFeature` (permissive boundary).

**Rationale.** The `no-redeclare-utils-exports` ESLint rule auto-derives its guarded names from `@debrief/utils` `index.ts` exports — once `Safe*` are removed from `index.ts`, that rule stops guarding them. A definition-level grep guard (already wired into `task lint` by #214) is the right mechanism to block *reintroduction* regardless of exports, mirroring how `GeoJSONFeature` is guarded post-#204.

**Alternatives considered.**
- *A new ESLint `drift-rule-factory` entry* — heavier; the shell guard is simpler, already wired into `task lint`, and consistent with the `GeoJSONFeature` precedent.

---

## R5. Type-level tests (SC-005) and the existing `bounds.types.test-d.ts`

**Decision.** (a) Update `shared/utils/tests/bounds.types.test-d.ts` — it imports and exercises `SafeFeature` (lines 15, 28), which is being deleted; replace case (b) with an `IngressFeature[]` assignability assertion. (b) Add a derivation type-test (in `shared/schemas/tests/`) asserting the structural relationship, e.g. `expectTypeOf<RawGeoJSONFeature>().toMatchTypeOf<IngressFeature>()` and `expectTypeOf<IngressFeature['geometry']>().toEqualTypeOf<RawGeoJSONFeature['geometry'] | null>()`, so source-type growth or an accidental hand-rewrite is caught at `tsc`.

**Rationale.** `expectTypeOf` (vitest) is the established type-test tool here (`bounds.types.test-d.ts`). A derivation assertion makes SC-005 ("adding a field to `RawGeoJSONFeature` propagates with no manual edit") executable.

**Alternatives considered.** None — this is the existing pattern.

---

## R6. Per-site target-type mapping (data-flow aware)

**Decision.** The audit's 3-way split (relative to `RawGeoJSONFeature`) maps onto Strategy A as follows; full table in `data-model.md`:

- **Result-carrying / serialisation surfaces (CLEAN-SWAP, 21)** → `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection`; delete now-dead null-guards.
- **Permissive boundary + webview DTOs (category b, 7 clusters)** → `IngressFeature` / `IngressFeatureCollection`.
- **Consumers reading from a permissive source (most NEEDS-NARROWING, 8)** → source type renamed to `IngressFeature`; existing null-guards **stay** (they remain correct) — these are effectively type renames, not logic changes.
- **`stacService` bbox (gap a #3)** → deleted in favour of `calculateBounds` (R2).

**Rationale.** Because category-(b) sources become `IngressFeature` (nullable geometry), their downstream consumers keep their guards — so the "narrowing" only applies to the genuinely result-carrying sites that move to `RawGeoJSONFeature`. This keeps the change overwhelmingly a **type rename**, minimising behavioural risk (US4 / SC-002).

**Alternatives considered.** None — dictated by data flow.
