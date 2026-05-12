# Contract — `vertex_metadata` LinkML slot

**Owner**: `shared/schemas/src/linkml/common.yaml` (new `VertexMetadata`
class + new slot on `BaseFeatureProperties`).
**Generated**: Pydantic, JSON Schema, TypeScript via the existing
`Makefile` (`make generate-{pydantic,jsonschema,typescript}`).
**Source of truth**: this contract + research.md R-008.

## LinkML — `VertexMetadata` (in `common.yaml`)

```yaml
classes:
  VertexMetadata:
    description: >-
      Optional, sparse per-vertex annotation attached to a feature. One
      entry corresponds to one vertex of the parent feature's geometry,
      identified by the structured `path` slot (see R-008 for per-
      geometry path shapes). Carrying any of label/tags/note triggers
      persistence; an entry with all three absent MUST be omitted.
    attributes:
      path:
        description: >-
          Structured vertex address following the selectionPath convention.
          Shape depends on parent geometry:
            Track       → "positions/<int>"
            Polygon     → "rings/<int>/vertices/<int>"
            LineString  → "vertices/<int>"
            MultiPoint  → "vertices/<int>"
            Point       → "vertex/0"
          Validation pattern (regex) enforced at LinkML adherence and
          flush time; per-class pattern checked by the writer against
          the parent's geometry kind.
        range: string
        required: true
        pattern: '^(positions/[0-9]+|rings/[0-9]+/vertices/[0-9]+|vertices/[0-9]+|vertex/0)$'
      label:
        description: Free-text short label.
        range: string
        required: false
      tags:
        description: Free-text tag list. Order is not significant.
        range: string
        required: false
        multivalued: true
      note:
        description: Free-text long note.
        range: string
        required: false
```

## LinkML — `vertex_metadata` slot on `BaseFeatureProperties`

```yaml
classes:
  BaseFeatureProperties:
    # … existing slots: kind, tags, provenance …
    attributes:
      vertex_metadata:
        description: >-
          Sparse list of per-vertex metadata, keyed by `path`. Empty
          arrays MUST be omitted from the serialised feature. Duplicate
          `path` values MUST be rejected by validators.
        range: VertexMetadata
        required: false
        multivalued: true
        inlined: true
        inlined_as_list: true
```

Every class that inherits from `BaseFeatureProperties` gains the slot.
At time of writing: `TrackProperties`, `NarrativeEntryProperties`,
`CircleAnnotationProperties`, `LineAnnotationProperties`,
`PolygonAnnotationProperties`, `TextAnnotationProperties`,
`ReferenceLocationProperties`.

## Generated JSON Schema fragment (canonical)

```json
{
  "VertexMetadata": {
    "type": "object",
    "required": ["path"],
    "properties": {
      "path":  { "type": "string", "pattern": "^(positions/[0-9]+|rings/[0-9]+/vertices/[0-9]+|vertices/[0-9]+|vertex/0)$" },
      "label": { "type": "string" },
      "tags":  { "type": "array", "items": { "type": "string" } },
      "note":  { "type": "string" }
    },
    "additionalProperties": false
  },
  "BaseFeatureProperties": {
    "properties": {
      "vertex_metadata": {
        "type": "array",
        "items": { "$ref": "#/$defs/VertexMetadata" }
      }
    }
  }
}
```

## Generated TypeScript fragment

```ts
export interface VertexMetadata {
  path: string;
  label?: string;
  tags?: string[];
  note?: string;
}

export interface BaseFeatureProperties {
  // … existing slots …
  vertex_metadata?: VertexMetadata[];
}
```

## Cross-cutting validation

Adherence harness MUST verify:

1. **Round-trip parity** — Python ↔ JSON ↔ TypeScript byte-for-byte after
   canonical serialisation.
2. **Sparse omission** — empty arrays normalise to "slot omitted";
   omitted slot reads as no annotations.
3. **Duplicate-path rejection** — two entries with the same `path` MUST
   fail validation in all three implementations.
4. **Per-geometry path validation** — fixtures with mismatched paths
   (e.g., `rings/0/vertices/3` on a Track) MUST fail the cross-class
   check.
5. **Inheritance coverage** — every concrete subclass of
   `BaseFeatureProperties` round-trips a `vertex_metadata` fixture
   appropriate to its geometry (or, for `CircleAnnotationProperties`,
   an empty/absent fixture).

## Golden fixtures

Under `shared/schemas/fixtures/`:

- `vertex_metadata.valid.empty-omitted.json`
- `vertex_metadata.valid.track-positions.json`
- `vertex_metadata.valid.polygon-rings.json`
- `vertex_metadata.valid.linestring-vertices.json`
- `vertex_metadata.valid.multipoint-vertices.json`
- `vertex_metadata.valid.point-vertex-zero.json`
- `vertex_metadata.invalid.duplicate-path.json`
- `vertex_metadata.invalid.mismatched-path-for-geometry.json` (e.g., a
  `positions/4` path on a Polygon feature)
- `vertex_metadata.invalid.malformed-path.json` (e.g., `positions/-1`)

## Out-of-contract

- Vertex re-mapping under geometry mutation (Out of Scope in spec.md).
- Per-vertex affordances beyond label/tags/note (no markers, no
  classification — those would be follow-ups).
