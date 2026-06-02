# Usage example — the schema-derived `IngressFeature` in use (#212)

**Feature**: `212-linkml-safe-feature-types` | **Captured**: 2026-06-01

## 1. The derived type (`@debrief/schemas`)

`IngressFeature` is a **structural derivation** of the LinkML-generated
`RawGeoJSONFeature` — no field is re-listed (Constitution Article IV.5):

```ts
// shared/schemas/src/generated/typescript/unions.ts
export type IngressFeature =
  Omit<RawGeoJSONFeature, 'geometry'> & { geometry: RawGeoJSONFeature['geometry'] | null };

export interface IngressFeatureCollection {
  type: 'FeatureCollection';
  features: IngressFeature[];
  bbox?: number[];
}
```

Because it is derived with `Omit` + intersection, **adding a field to
`RawGeoJSONFeature` propagates to `IngressFeature` automatically** — the
derivation invariant is pinned by `shared/schemas/tests/ts/ingress-feature.test.ts`:

```ts
expectTypeOf<RawGeoJSONFeature>().toMatchTypeOf<IngressFeature>();
expectTypeOf<IngressFeature['geometry']>()
  .toEqualTypeOf<RawGeoJSONFeature['geometry'] | null>();
```

## 2. A migrated boundary — `openPlot.ts` session-state → stac adapter

### Before (hand-written `Safe*`)

```ts
import type { SafeFeature, SafeFeatureCollection, SafeGeometry } from '@debrief/utils';

function toSafeFC(fc: {...}): SafeFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f): SafeFeature => ({
      type: 'Feature',
      id: f.id,
      geometry: f.geometry as SafeGeometry | null,   // hand-written permissive geometry
      properties: f.properties,
    })),
  };
}
```

### After (schema-derived `IngressFeature`)

```ts
import type { IngressFeature, IngressFeatureCollection } from '@debrief/schemas';

function toIngressFC(fc: {...}): IngressFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: fc.features.map((f): IngressFeature => ({
      type: 'Feature',
      id: f.id,
      geometry: f.geometry as IngressFeature['geometry'],  // schema-rooted; admits null
      properties: f.properties,
    })),
  };
}
```

## 3. The `geometry: null` channel is preserved (SC-004)

RFC 7946 "unlocated" features (SYSTEM_RECORD, STORYBOARD, NarrativeEntry) have
`geometry: null`. `IngressFeature` admits this, so they survive every migrated
boundary intact — verified by
`apps/vscode/tests/unit/stacService.test.ts › addFeatures › preserves a
geometry:null feature and excludes it from bbox`:

```ts
const features = [
  { type: 'Feature', id: 'system-1', geometry: null, properties: { kind: 'SYSTEM_RECORD' } },
  { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-10,-20],[30,40]] }, properties: {} },
];
await service.addFeatures('/store', 'items/test.json', features);

// the null-geometry feature is written, not dropped:
expect(systemFeature.geometry).toBeNull();           // ✅
// and it does not corrupt the bbox (computed only from the located feature):
expect(writtenItemObj.bbox).toEqual([-10, -20, 30, 40]); // ✅
```

## 4. Host→webview message DTOs reference the schema-derived type (FR-006 / Article IV.5)

```ts
// apps/vscode/src/webview/messages.ts
import type { IngressFeatureCollection } from '@debrief/schemas';

export interface AddResultLayerMessage {
  type: 'addResultLayer';
  layer: { id: string; name: string; features: IngressFeatureCollection; style: LayerStyle };
}
export interface UpdatePlotFeaturesMessage {
  type: 'updatePlotFeatures';
  features: IngressFeatureCollection;
}
```

The whole tool-result pipeline (`calcService` MCP parse → `ToolExecutionResult` →
`ResultLayer` → these DTOs) is now typed on the schema-derived
`IngressFeatureCollection` — cast-free and null-honest end-to-end.
