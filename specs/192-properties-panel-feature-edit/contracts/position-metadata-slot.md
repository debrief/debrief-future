# Contract — `position_metadata` LinkML slot

**Owner**: `shared/schemas/src/linkml/common.yaml` (new class) +
`shared/schemas/src/linkml/geojson.yaml` (new slot on `TrackProperties`)
**Generated**: Pydantic, JSON Schema, TypeScript via the existing
`Makefile` (`make generate-pydantic|generate-jsonschema|generate-typescript`)

This contract pins the schema-level shape that the sub-feature editor
writes and the readers (chart renderer, calc tools, exporters) consume.
It is the anchor for FR-007, FR-009, FR-010, and Constitution II.

---

## LinkML — `PositionMetadata` (in `common.yaml`)

```yaml
classes:
  PositionMetadata:
    description: >-
      Optional, sparse per-position annotation attached to a track
      feature. One entry corresponds to one element of the parent
      feature's geometry.coordinates, identified by the `index` slot.
      Carrying any of label/tags/note triggers persistence; an entry
      with all three blank MUST be omitted.
    attributes:
      index:
        description: 0-based index into the parent feature's coordinates array.
        range: integer
        required: true
        minimum_value: 0
      label:
        description: Free-text short label (e.g., "intercept").
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

## LinkML — `position_metadata` slot on `TrackProperties` (in `geojson.yaml`)

```yaml
classes:
  TrackProperties:
    # … existing slots …
    attributes:
      position_metadata:
        description: >-
          Sparse list of per-position metadata, keyed by `index`. Empty
          arrays MUST be omitted. Duplicate indices MUST be rejected
          by the validator.
        range: PositionMetadata
        required: false
        multivalued: true
        inlined: true
        inlined_as_list: true
```

## Generated JSON Schema fragment (canonical form)

```json
{
  "PositionMetadata": {
    "type": "object",
    "required": ["index"],
    "properties": {
      "index": { "type": "integer", "minimum": 0 },
      "label": { "type": "string" },
      "tags":  { "type": "array", "items": { "type": "string" } },
      "note":  { "type": "string" }
    },
    "additionalProperties": false
  },
  "TrackProperties": {
    "properties": {
      "position_metadata": {
        "type": "array",
        "items": { "$ref": "#/$defs/PositionMetadata" }
      }
    }
  }
}
```

## Generated TypeScript fragment (canonical form)

```ts
export interface PositionMetadata {
  index: number;
  label?: string;
  tags?: string[];
  note?: string;
}

// On the existing generated TrackProperties:
export interface TrackProperties {
  // … existing slots …
  position_metadata?: PositionMetadata[];
}
```

---

## Cross-cutting validation

The adherence harness MUST verify:

1. **Round-trip parity** — Python (Pydantic) → JSON → TypeScript →
   JSON → Python preserves byte-for-byte after canonical serialisation.
2. **Sparse-omission** — fixtures with an empty `position_metadata`
   array MUST be normalised to "slot omitted" on serialisation; the
   inverse fixture (slot omitted) MUST equal the empty-array fixture
   on read.
3. **Duplicate rejection** — fixture with two entries sharing the same
   `index` MUST fail validation in all three implementations.
4. **Index lower-bound** — fixture with `index = -1` MUST fail; fixture
   with `index = 0` and a 1-point track MUST pass.
5. **Open-world fields** — adding an optional slot to `PositionMetadata`
   in a future release MUST round-trip on existing readers (LinkML
   open-world default applies — `additionalProperties: false` only at
   the JSON-schema generator's discretion; check the existing convention
   used elsewhere in `common.yaml` and follow it).

## Golden fixtures

Add to `shared/schemas/fixtures/`:

- `position_metadata.valid.empty-omitted.json`
- `position_metadata.valid.single-entry.json`
- `position_metadata.valid.multiple-entries.json`
- `position_metadata.invalid.duplicate-index.json`
- `position_metadata.invalid.negative-index.json`
- `position_metadata.invalid.entry-with-no-fields.json` (must fail on the
  flush function's pruning check; informational at schema level — the
  schema permits an entry with only `index`, but the writer prunes such
  entries before serialisation; the fixture documents the expected
  read-time behaviour)

---

## Out-of-contract

- This slot does NOT carry kinematic data — that lives on
  `TimestampedPosition` and is untouched (R-001).
- Index re-mapping when coordinates are inserted/deleted is **out of
  scope for v1** (no geometry editing — see Out of Scope in spec.md).
  When geometry editing arrives, a follow-up will define the
  re-mapping rule.
