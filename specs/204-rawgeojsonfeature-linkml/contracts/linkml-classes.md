# Contract: LinkML Class Additions + Expected Generator Outputs

**Feature**: 204-rawgeojsonfeature-linkml
**Date**: 2026-04-20
**Input**: [../data-model.md](../data-model.md). This file fixes the
**exact** LinkML YAML + generator-output strings that the implementation
must match — it is the contract against which Phase 3 evidence is measured.

---

## 1. New file: `shared/schemas/src/linkml/raw-geojson.yaml`

```yaml
id: https://debrief.info/schemas/raw-geojson
name: raw-geojson
title: Debrief Raw GeoJSON Boundary Types
description: >-
  Parse-boundary GeoJSON classes used before narrowing to a Debrief domain
  feature (TrackFeature, ReferenceLocation, SystemState, etc.). These
  classes model the permissive shape allowed by RFC 7946 §3 and replace
  the hand-typed duplicates previously in shared/utils and
  services/session-state.

prefixes:
  linkml: https://w3id.org/linkml/
  debrief: https://debrief.info/schemas/

default_prefix: debrief
default_range: string

imports:
  - linkml:types

classes:
  RawGeoJSONGeometry:
    description: >-
      Minimum-contract GeoJSON geometry (RFC 7946 §3.1). Narrow geometry
      classes (GeoJSONPoint, GeoJSONLineString, …) in geojson.yaml refine
      this at the domain boundary.
    attributes:
      type:
        description: GeoJSON geometry type discriminator (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection).
        range: string
        required: true
      coordinates:
        description: >-
          Coordinate payload. Shape depends on the geometry type; domain
          narrow classes in geojson.yaml enforce the nested arity. Not
          required so GeometryCollection can be represented.
        range: Any
        required: false

  RawGeoJSONFeature:
    description: >-
      Parse-boundary GeoJSON Feature (RFC 7946 §3.2). Callers narrow this
      to a domain feature (TrackFeature, ReferenceLocation, SystemState,
      MultiPointFeature, MultiPolygonFeature) after validating the
      properties.kind discriminator.
    attributes:
      type:
        description: GeoJSON object type — always "Feature".
        range: string
        required: true
        equals_string: "Feature"
      id:
        description: >-
          Optional feature identifier. RFC 7946 permits either a string or
          an integer; both are retained without coercion.
        required: false
        any_of:
          - range: string
          - range: integer
      geometry:
        description: GeoJSON geometry (narrowed by domain classes downstream).
        range: RawGeoJSONGeometry
        required: true
      properties:
        description: >-
          Free-form properties dictionary. Callers narrow to a domain
          properties class (TrackProperties, ReferenceLocationProperties,
          etc.) after validating the kind discriminator. May be absent
          or null per RFC 7946 §3.2.
        range: Any
        required: false
      bbox:
        description: >-
          Optional bounding box. Either [minLon, minLat, maxLon, maxLat]
          (length 4) or [minLon, minLat, minAlt, maxLon, maxLat, maxAlt]
          (length 6).
        range: float
        multivalued: true
        required: false

  RawGeoJSONFeatureCollection:
    description: >-
      Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3.3). Used by
      STAC item payloads and tool-result layers before narrowing.
    attributes:
      type:
        description: GeoJSON object type — always "FeatureCollection".
        range: string
        required: true
        equals_string: "FeatureCollection"
      features:
        description: The collection's features, in document order.
        range: RawGeoJSONFeature
        multivalued: true
        required: true
        inlined_as_list: true
      bbox:
        description: Optional bounding box, shaped as in RawGeoJSONFeature.bbox.
        range: float
        multivalued: true
        required: false
```

## 2. Edit: `shared/schemas/src/linkml/debrief.yaml`

Add `raw-geojson` to the `imports:` list, alphabetically placed before
`session-state`:

```yaml
imports:
  - linkml:types
  - common
  - styling
  - geojson
  - annotations
  - tool
  - log-entry
  - system-record
  - stac-extension
  - raw-geojson            # ← NEW
  - session-state
  - tool-result
```

And update the inline module comments accordingly.

## 3. Edit: `shared/schemas/src/linkml/session-state.yaml`

Delete the existing `GeoJSONFeature` and `GeoJSONGeometry` classes
(lines 262-286). Update `ResultsSlice.result_layers.range`:

```diff
  ResultsSlice:
    attributes:
      result_layers:
-       range: GeoJSONFeature
+       range: RawGeoJSONFeature
        multivalued: true
        inlined_as_list: true
```

(Exact line numbers may drift during implementation — the contract is
structural, not line-numbered.)

## 4. Expected generator outputs

### 4.1 Pydantic (`shared/schemas/src/generated/python/debrief_schemas/__init__.py`)

```python
class RawGeoJSONGeometry(ConfiguredBaseModel):
    """Minimum-contract GeoJSON geometry (RFC 7946 §3.1). …"""
    type: str = Field(..., description="GeoJSON geometry type discriminator …")
    coordinates: Optional[Any] = Field(None, description="Coordinate payload. …")


class RawGeoJSONFeature(ConfiguredBaseModel):
    """Parse-boundary GeoJSON Feature (RFC 7946 §3.2). …"""
    type: Literal["Feature"] = Field(..., description="GeoJSON object type — always \"Feature\".")
    id: Optional[Union[str, int]] = Field(None, description="Optional feature identifier. …")
    geometry: RawGeoJSONGeometry = Field(..., description="GeoJSON geometry …")
    properties: Optional[Any] = Field(None, description="Free-form properties dictionary. …")
    bbox: Optional[List[float]] = Field(None, description="Optional bounding box. …")


class RawGeoJSONFeatureCollection(ConfiguredBaseModel):
    """Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3.3). …"""
    type: Literal["FeatureCollection"] = Field(..., description="GeoJSON object type — always \"FeatureCollection\".")
    features: List[RawGeoJSONFeature] = Field(..., description="The collection's features, in document order.")
    bbox: Optional[List[float]] = Field(None, description="Optional bounding box …")
```

**Note on `Any`** — LinkML's `range: Any` generates `typing.Any` in
Pydantic. This is schema-sourced, not hand-authored, and maps to
`Record<string, unknown>` (not `any`) in the TypeScript post-processor.
Article XV's prohibition is on *authored* `Any` — see research §2.

### 4.2 TypeScript (`shared/schemas/src/generated/typescript/types.ts`)

After the generator post-processor runs:

```ts
/** Minimum-contract GeoJSON geometry (RFC 7946 §3.1). … */
export interface RawGeoJSONGeometry {
    /** GeoJSON geometry type discriminator … */
    type: string,
    /** Coordinate payload. … */
    coordinates?: unknown,
}

/** Parse-boundary GeoJSON Feature (RFC 7946 §3.2). … */
export interface RawGeoJSONFeature {
    /** GeoJSON object type — always "Feature". */
    type: "Feature",
    /** Optional feature identifier. … */
    id?: string | number,
    /** GeoJSON geometry … */
    geometry: RawGeoJSONGeometry,
    /** Free-form properties dictionary. … */
    properties?: Record<string, unknown> | null,
    /** Optional bounding box. … */
    bbox?: number[],
}

/** Parse-boundary GeoJSON FeatureCollection (RFC 7946 §3.3). … */
export interface RawGeoJSONFeatureCollection {
    /** GeoJSON object type — always "FeatureCollection". */
    type: "FeatureCollection",
    /** The collection's features, in document order. */
    features: RawGeoJSONFeature[],
    /** Optional bounding box … */
    bbox?: number[],
}
```

### 4.3 JSON Schema (`shared/schemas/src/generated/json-schema/debrief.schema.json`)

```json
{
  "RawGeoJSONGeometry": {
    "additionalProperties": false,
    "description": "Minimum-contract GeoJSON geometry …",
    "properties": {
      "type": { "type": "string" },
      "coordinates": {}
    },
    "required": ["type"],
    "title": "RawGeoJSONGeometry",
    "type": "object"
  },
  "RawGeoJSONFeature": {
    "additionalProperties": false,
    "description": "Parse-boundary GeoJSON Feature …",
    "properties": {
      "type": { "const": "Feature", "type": "string" },
      "id": { "anyOf": [{ "type": "string" }, { "type": "integer" }] },
      "geometry": { "$ref": "#/$defs/RawGeoJSONGeometry" },
      "properties": {},
      "bbox": { "items": { "type": "number" }, "type": "array" }
    },
    "required": ["type", "geometry"],
    "title": "RawGeoJSONFeature",
    "type": "object"
  },
  "RawGeoJSONFeatureCollection": {
    "additionalProperties": false,
    "description": "Parse-boundary GeoJSON FeatureCollection …",
    "properties": {
      "type": { "const": "FeatureCollection", "type": "string" },
      "features": {
        "items": { "$ref": "#/$defs/RawGeoJSONFeature" },
        "type": "array"
      },
      "bbox": { "items": { "type": "number" }, "type": "array" }
    },
    "required": ["type", "features"],
    "title": "RawGeoJSONFeatureCollection",
    "type": "object"
  }
}
```

**Post-processing confirmation**:
- `_strip_type_from_anyof` removes any spurious `"type": "string"` from the
  `id` slot's `anyOf`.
- The `properties` slot emits `{}` (the empty schema, which accepts any
  value). This matches RFC 7946 §3.2 and is the standard LinkML rendering
  for `range: Any` without `multivalued: true`.

## 5. Generator post-processing additions (`shared/schemas/scripts/generate.py`)

Two new string-replacement entries in `generate_typescript()`:

```python
# RawGeoJSONFeature.id — any_of[string, integer] — gen-typescript falls back
# to `string`, which loses the integer alternative.
content = content.replace(
    "/** Optional feature identifier. Optional feature identifier. "
    "RFC 7946 permits either a string or an integer; "
    "both are retained without coercion. */\n    id?: string,",
    "/** Optional feature identifier. RFC 7946 permits either a string or an integer; "
    "both are retained without coercion. */\n    id?: string | number,",
)

# RawGeoJSONFeature.properties + RawGeoJSONGeometry.coordinates — LinkML
# `range: Any` emits `properties?: string` / `coordinates?: string`.
# Replace with `Record<string, unknown> | null` / `unknown`.
content = content.replace(
    "    properties?: string,",
    "    properties?: Record<string, unknown> | null,",
)
content = content.replace(
    "    coordinates?: string,",
    "    coordinates?: unknown,",
)
```

(Exact surrounding docstring text will be confirmed during implementation
— the contract here is the *final* TS output shown in §4.2. The
post-processor may need minor adjustment of its find-string if the
generator emits a slightly different docstring format. A golden-TS snapshot
test guards against silent drift.)

## 6. Fixture contracts

Fixtures live in `shared/schemas/fixtures/raw-geojson/`. Each fixture is a
plain JSON file round-tripped through Pydantic and JSON Schema.

### `valid/feature-string-id.json`

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": { "type": "Point", "coordinates": [0.0, 0.0] },
  "properties": {}
}
```

### `valid/feature-integer-id.json`

```json
{
  "type": "Feature",
  "id": 42,
  "geometry": { "type": "LineString", "coordinates": [[0, 0], [1, 1]] },
  "properties": { "sensor": "radar" }
}
```

### `valid/feature-no-id.json`

```json
{
  "type": "Feature",
  "geometry": { "type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  "properties": null
}
```

### `valid/collection-empty.json`

```json
{ "type": "FeatureCollection", "features": [] }
```

### `valid/collection-mixed-ids.json`

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "id": "a", "geometry": { "type": "Point", "coordinates": [0, 0] } },
    { "type": "Feature", "id": 1, "geometry": { "type": "Point", "coordinates": [1, 1] } },
    { "type": "Feature", "geometry": { "type": "Point", "coordinates": [2, 2] } }
  ]
}
```

### `invalid/wrong-type.json`

```json
{ "type": "NotAFeature", "geometry": { "type": "Point", "coordinates": [0, 0] } }
```

### `invalid/missing-geometry.json`

```json
{ "type": "Feature", "id": "no-geom", "properties": {} }
```

### `invalid/numeric-type.json`

```json
{ "type": 42, "geometry": { "type": "Point", "coordinates": [0, 0] } }
```

### `invalid/id-boolean.json`

```json
{ "type": "Feature", "id": true, "geometry": { "type": "Point", "coordinates": [0, 0] } }
```

## 7. Test contracts

### 7.1 Golden-fixture test (`test_golden.py`)

- Every file under `valid/` → `RawGeoJSONFeature.model_validate_json(...)` or
  `RawGeoJSONFeatureCollection.model_validate_json(...)` must succeed.
- Every file under `invalid/` → must raise `pydantic.ValidationError`.

### 7.2 Round-trip test (`test_roundtrip.py`)

- Pick 3 canonical fixtures: `feature-string-id`, `feature-integer-id`,
  `collection-mixed-ids`.
- Python: `model_validate_json(raw)` → `model_dump_json(by_alias=True)`
  must equal the *normalised* input (stable key order is NOT required; the
  test compares parsed dicts).
- Emit the dumped JSON to a sidecar file; the existing TypeScript
  round-trip harness reads it, `JSON.parse` → `JSON.stringify` → writes
  back. Python re-reads and asserts dict equality.

### 7.3 Schema-compare test (`test_schema_compare.py`)

- For each of `RawGeoJSONGeometry`, `RawGeoJSONFeature`,
  `RawGeoJSONFeatureCollection`: assert that the LinkML-generated JSON
  Schema entry is deep-equal (modulo ordering) to Pydantic's
  `.model_json_schema()` output.

### 7.4 TS typecheck (existing `Makefile` target)

- `pnpm exec tsc --noEmit` on a fixture file that imports
  `RawGeoJSONFeature` and asserts the presence of `id?: string | number`
  and `properties?: Record<string, unknown> | null`.
