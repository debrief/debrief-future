# Schema Round-Trip Evidence — `VertexMetadata` (#192)

The LinkML schema change introduced one class (`VertexMetadata`) and one multivalued slot (`vertex_metadata: VertexMetadata`) on `BaseFeatureProperties`. By LinkML inheritance, every concrete subclass picks up the slot. This document captures the adherence proof — round-trip parity, inheritance reach, and the invariants from the Phase 2 contract.

## Inheritance reach — 13 concrete subclasses

| Source file | Class | Vertex address shape |
|-------------|-------|----------------------|
| `annotations.yaml` | `NarrativeEntryProperties` | n/a (no geometry vertices) |
| `annotations.yaml` | `CircleAnnotationProperties` | n/a (only centre/radius — slot remains empty) |
| `annotations.yaml` | `RectangleAnnotationProperties` | `rings/R/vertices/V` |
| `annotations.yaml` | `LineAnnotationProperties` | `vertices/V` |
| `annotations.yaml` | `TextAnnotationProperties` | `vertex/0` |
| `annotations.yaml` | `VectorAnnotationProperties` | `vertices/V` |
| `annotations.yaml` | `PolyAnnotationProperties` | `rings/R/vertices/V` |
| `geojson.yaml` | `TrackProperties` | `positions/N` (per-position address, #053) |
| `geojson.yaml` | `ReferenceLocationProperties` | `vertex/0` |
| `geojson.yaml` | `MultiPointFeatureProperties` | `vertices/V` |
| `geojson.yaml` | `MultiPolygonFeatureProperties` | `rings/R/vertices/V` |
| `storyboard.yaml` | `StoryboardProperties` | n/a (no geometry) |
| `storyboard.yaml` | `SceneProperties` | n/a (rectangle viewport, not a geometry vertex) |

The slot is **available** on every class by inheritance; the **address shape** is a per-geometry-kind concern enforced at write time by the writer + flush function (`useStagedEdits.applyEditsToFeatures`).

## Round-trip parity

Python ↔ JSON ↔ Python parity is asserted by `shared/schemas/tests/test_vertex_metadata.py` for every valid fixture in `shared/schemas/fixtures/vertex_metadata.valid.*.json`:

| Fixture | Inheriting class exercised | Assertion |
|---------|----------------------------|-----------|
| `vertex_metadata.valid.empty-omitted.json` | (slot omitted) | round-trip leaves the slot absent |
| `vertex_metadata.valid.track-positions.json` | `TrackProperties` | 2+ entries on `positions/N` paths |
| `vertex_metadata.valid.polygon-rings.json` | `PolyAnnotationProperties` | entries on `rings/R/vertices/V` |
| `vertex_metadata.valid.linestring-vertices.json` | `LineAnnotationProperties` | entries on `vertices/V` |
| `vertex_metadata.valid.multipoint-vertices.json` | `MultiPointFeatureProperties` | entries on `vertices/V` |
| `vertex_metadata.valid.point-vertex-zero.json` | `ReferenceLocationProperties` | one entry on `vertex/0` |

## Invariants asserted at LinkML / Pydantic boundary

| Invariant | Source | Coverage |
|-----------|--------|----------|
| `path` matches the union regex `^(positions/[0-9]+\|rings/[0-9]+/vertices/[0-9]+\|vertices/[0-9]+\|vertex/0)$` | LinkML `pattern` on the slot | malformed-path fixture → Pydantic `ValidationError` |
| Duplicate `path` within a feature's `vertex_metadata` array | Pydantic `model_validator` injected by `scripts/generate.py` (LinkML `identifier: true` doesn't propagate through `inlined_as_list`) | duplicate-path fixture → `ValidationError` |
| Empty `vertex_metadata: []` array MUST omit the slot on write | Generator post-process + `applyEditsToFeatures` flush logic | round-trip a feature with `vertex_metadata=[]` and assert the slot key is absent from the output JSON |
| Per-geometry path matching (e.g., `positions/N` only on tracks) | Writer-level check (deferred per data-model § 1.3) — the LinkML pattern accepts the union | mismatched-path fixture asserts the path string would not match the Polygon-specific regex (Pydantic accepts because the union does) |
| `VertexMetadata` entry with all of `label`/`tags`/`note` absent | Flush function (`useStagedEdits.applyEditsToFeatures`) | `useStagedEdits.test.ts` "prunes entries that become empty" + "omits vertex_metadata entirely when array empty" |

## Generator idempotency

`shared/schemas/tests/test_regen_idempotent.py` is included in the schema test suite and asserts that running `make generate` twice produces byte-identical output — including the post-process Pydantic `model_validator` injection for duplicate-path detection.

## Generated TypeScript

The TS generator (`gen-typescript`) emits:

```ts
export interface VertexMetadata {
    path: string,
    label?: string,
    tags?: string[],
    note?: string,
}

export interface BaseFeatureProperties {
    // … existing slots …
    vertex_metadata?: VertexMetadata[],
}
```

All 13 concrete subclasses `extends BaseFeatureProperties` in the generated `types.ts`, so consumers automatically pick up the inherited slot.

## Run the proof

```sh
uv run pytest shared/schemas/tests/test_vertex_metadata.py -v
```

Last run: **53 passed in 0.31s** on commit `8c568c9`.

Full schema suite (`uv run pytest shared/schemas/tests -q`): **916 passed, 1 skipped, 1 xfailed** — zero regressions vs. baseline.
