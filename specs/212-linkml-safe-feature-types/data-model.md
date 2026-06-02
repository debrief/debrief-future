# Data Model: #212 — `Safe*` → schema-derived feature types

**Date**: 2026-06-01 | **Feature**: `212-linkml-safe-feature-types`

This is a type-system refactor, so the "data model" is the **type model**: what is removed, what is added (structurally derived), and how each usage site maps to its new target type. No runtime data shape changes; no LinkML/schema change (FR-009).

## Types removed (from `shared/utils/src/types.ts` + `index.ts`)

```ts
interface SafeGeometry { type: string; coordinates: unknown }                 // permissive coords
interface SafeFeature { type: 'Feature'; id?: string | number;
  geometry: SafeGeometry | null; properties: Record<string, unknown> | null } // nullable geometry
interface SafeFeatureCollection { type: 'FeatureCollection'; features: SafeFeature[] }
```

## Type added (to `shared/schemas/src/generated/typescript/unions.ts`)

Structurally derived from the generated `RawGeoJSONFeature` — Article IV.5 idiom, no field re-listing:

```ts
/** Permissive ingress/parse-boundary feature: RawGeoJSONFeature with geometry widened to admit null
 *  (RFC 7946 "unlocated" features — SYSTEM_RECORD, STORYBOARD, NarrativeEntry).
 *  Derived structurally so it cannot drift when RawGeoJSONFeature grows a field. */
export type IngressFeature =
  Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null };

export interface IngressFeatureCollection {
  type: 'FeatureCollection';
  features: IngressFeature[];
  bbox?: number[];
}
```

**Resulting shape vs the removed `SafeFeature`:**

| Field | `SafeFeature` (removed) | `IngressFeature` (added) | Effect |
|-------|------------------------|--------------------------|--------|
| `geometry` | `SafeGeometry \| null` (coords `unknown`) | `RawGeoJSONFeature['geometry'] \| null` (typed 7-way union) | null channel preserved; coordinates now typed (same trust ADR-021 accepts at parse) |
| `properties` | `Record<string,unknown> \| null` (required key) | `Record<string,unknown> \| null` (optional key) | wider; assignment-compatible |
| `id` | `string \| number` (optional) | `string \| number` (optional) | identical |
| `bbox` | absent | `number[]` (optional) | additive; harmless |

**Derivation invariant (SC-005):** a `RawGeoJSONFeature` is assignable to `IngressFeature` (only `geometry` is widened); adding a slot to `RawGeoJSONFeature` propagates to `IngressFeature` automatically. Enforced by `ingress-feature.test-d.ts`.

## Per-site migration map

Target type per usage cluster (data-flow aware — see research R6). Full site list with line numbers: `evidence/audit-gap-report.md`.

| Cluster | Sites | Target type | Change |
|---------|-------|-------------|--------|
| **Result-carrying / serialisation** (CLEAN-SWAP) | `bufferZoneGenerator.ts` (+test), `toolService.ts:176/199/462`, `mapPanel.ts:1157`, `extension.ts:505`, `types/tool.ts:293/362`, `stacService.ts` write/append/provenance helpers, `pointInZoneClassifier.ts` clone helpers | `RawGeoJSONFeature` / `RawGeoJSONFeatureCollection` | type rename; delete now-dead `if (!f.geometry)` guards where geometry is required |
| **Permissive parse/MCP/disk boundary** (gap b) | `ioService.ts:90`, `types/import.ts:72` (`ParseResult`), `calcService.ts` (vscode) MCP-parse accumulators + returns, `stacService.ts:828/835/1014` (`loadGeoJson`), `mocks/calcService.ts` (web-shell), `toolService.ts:317` (`ToolExecuteFn`) | `IngressFeature` / `IngressFeatureCollection` | retarget named-type casts (`as SafeFeatureCollection`→`as IngressFeatureCollection`); rework `mocks/calcService.ts` inline cast (R3) |
| **Webview message DTOs** (gap b, IV.5) | `messages.ts:75` (`AddResultLayerMessage.layer.features`), `messages.ts:83` (`UpdatePlotFeaturesMessage.features`) | `IngressFeatureCollection` | type rename — DTO now references a schema-derived type (FR-006) |
| **Session-state→stac adapter** (gap b) | `openPlot.ts:53-62` (`toSafeFC`→`toIngressFC`) | `IngressFeatureCollection` | rename; `geometry: f.geometry as SafeGeometry \| null` → `as IngressFeature['geometry']` |
| **Consumers of a permissive source** (NEEDS-NARROWING) | `importRep.ts:244/409`, `mapPanel.ts:1582`, `openPlot.ts:373`, `pointInZoneClassifier.ts:89/117` | source renamed to `IngressFeature`; **keep** existing null-guards + named-type coord casts | logic unchanged (effectively a rename) |
| **Coordinate-read gap (a)** | `stacService.ts:1732-1790` (`calculateBboxFromFeatures` + `extractCoordinates`) | **deleted** | replaced by `calculateBounds` from `@debrief/utils` (R2) — removes casts + `SafeGeometry` dep, fixes Multi* bbox bug |
| **Type tests / docs** | `bounds.types.test-d.ts:15/28`, `bounds.ts` doc comments | `IngressFeature` | replace `SafeFeature` references |

## Validation / behavioural rules (must hold post-migration)

- **VR-1 (null preservation, SC-004):** a feature with `geometry: null` flowing through any migrated boundary is preserved, not dropped — guaranteed because permissive boundaries use `IngressFeature` (geometry `… | null`) and consumers retain their null-guards.
- **VR-2 (no behaviour change, US4):** result-carrying sites already only ever carry present geometry, so swapping to `RawGeoJSONFeature` and deleting the dead guard is behaviour-neutral.
- **VR-3 (bbox correctness, R2):** after replacing `calculateBboxFromFeatures` with `calculateBounds`, bbox for Multi* geometries becomes correct (was previously omitted) — a fix, verified by a unit test over a MultiPolygon feature.
- **VR-4 (no schema drift, FR-009/SC-006):** `git diff shared/schemas/src/generated/` is empty except `unions.ts` (hand-maintained, not generator output) and `index.ts` re-export; `task schema:check-drift` passes.
