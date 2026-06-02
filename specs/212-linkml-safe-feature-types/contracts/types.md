# Type Contracts: #212

**Date**: 2026-06-01 | **Feature**: `212-linkml-safe-feature-types`

This feature exposes no HTTP/MCP API surface; its "contracts" are TypeScript **type contracts** — the public types that other modules depend on, plus the enforcement (guard + type-test) contracts. Each is verifiable at `tsc`/lint/test time.

## C1 — Derived permissive boundary type (`@debrief/schemas`)

**Exported from** `shared/schemas/src/generated/typescript/unions.ts` (re-exported via `index.ts`):

```ts
export type IngressFeature =
  Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null };

export interface IngressFeatureCollection {
  type: 'FeatureCollection';
  features: IngressFeature[];
  bbox?: number[];
}
```

**Contract guarantees:**
- Importable as `import type { IngressFeature, IngressFeatureCollection } from '@debrief/schemas'` from `apps/vscode`, `apps/web-shell`, and `services/*`.
- `IngressFeature` admits `geometry: null`; `RawGeoJSONFeature` is assignable to `IngressFeature`.
- Contains **no** hand-listed field set — it is `Omit`/`&`-derived (Article IV.5).

## C2 — Migrated public signatures (before → after)

| Module / symbol | Before | After |
|-----------------|--------|-------|
| `apps/vscode/webview/messages.ts` `AddResultLayerMessage.layer.features` | `SafeFeatureCollection` | `IngressFeatureCollection` |
| `apps/vscode/webview/messages.ts` `UpdatePlotFeaturesMessage.features` | `SafeFeatureCollection` | `IngressFeatureCollection` |
| `apps/vscode/types/import.ts` `ParseResult.features` | `SafeFeature[]` | `IngressFeature[]` |
| `apps/vscode/services/stacService.ts` `loadGeoJson()` / `loadSnapshotGeoJson()` | `Promise<SafeFeatureCollection \| null>` | `Promise<IngressFeatureCollection \| null>` |
| `apps/vscode/services/stacService.ts` `writeGeoJson(fc)` / `addFeatures(features)` | `SafeFeatureCollection` / `SafeFeature[]` | `IngressFeatureCollection` / `IngressFeature[]` |
| `apps/vscode/services/stacService.ts` `calculateBboxFromFeatures` + `extractCoordinates` | private methods | **removed** (call `calculateBounds` from `@debrief/utils`) |
| `apps/vscode/types/tool.ts` `ResultLayer.features` / `ToolExecutionResult.features?` | `SafeFeatureCollection` | `RawGeoJSONFeatureCollection` |
| `apps/web-shell/services/toolService.ts` `ToolExecuteFn` | `(f: SafeFeature[]) => SafeFeature[]` | `(f: IngressFeature[]) => IngressFeature[]` |
| `apps/web-shell/mocks/calcService.ts` `toSafeFeatures` | `(Feature[]) => SafeFeature[]` (inline-object cast) | `toIngressFeatures: (Feature[]) => IngressFeature[]` (named-type cast / guard) |
| `@debrief/utils` `index.ts` / `types.ts` | exports `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection` | **not exported / not defined** |

*Result-carrying CLEAN-SWAP signatures (e.g. `bufferZoneGenerator`, `pointInZoneClassifier`) move `SafeFeature*` → `RawGeoJSONFeature*` per `data-model.md`.*

## C3 — Regression guard contract (`scripts/check-no-geojson-feature.sh`)

- Exit `0` when no hand-written feature definitions exist; exit `1` listing offenders otherwise.
- MUST fail on a new `interface SafeFeature` / `interface SafeGeometry` / `interface SafeFeatureCollection` (and the `type X =` forms) anywhere under `apps/ shared/ services/` (excluding `node_modules`, `dist`).
- MUST continue to fail on `interface GeoJSONFeature` (existing behaviour).
- Wired into `task lint` (already, via #214).

**Verification:** a temporary `interface SafeFeature {}` added under `apps/` makes `task lint` fail; removing it passes.

## C4 — Type-test contracts (`*.test-d.ts`, vitest `expectTypeOf`)

- `shared/schemas/tests/ingress-feature.test-d.ts` (NEW):
  - `expectTypeOf<RawGeoJSONFeature>().toMatchTypeOf<IngressFeature>()` — a raw feature is a valid ingress feature.
  - `expectTypeOf<IngressFeature['geometry']>().toEqualTypeOf<RawGeoJSONFeature['geometry'] | null>()` — geometry is widened by exactly `| null`.
- `shared/utils/tests/bounds.types.test-d.ts` (UPDATE): replace the `SafeFeature[]` assignability case with `IngressFeature[]` (asserts `calculateBounds` still accepts the permissive family without a cast).

**Verification:** `pnpm -r typecheck` / `vitest` over the `*.test-d.ts` files; failure if the derivation invariant breaks.
