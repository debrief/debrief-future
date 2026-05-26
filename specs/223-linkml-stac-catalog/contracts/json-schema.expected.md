# Contract: expected generated JSON Schema artefacts

**Feature**: 223-linkml-stac-catalog
**Generator**: `gen-json-schema` from `shared/schemas/src/linkml/stac.yaml`
**Output path**: `shared/schemas/src/generated/json-schema/stac.schema.json`

Acceptance contract for the JSON Schema artefacts produced by the
schema build. The round-trip / schema-comparison test (FR-006 —
`shared/schemas/tests/test_stac_roundtrip.py`) asserts each of the
following.

## File-level

- [ ] One JSON file emitted: `stac.schema.json`.
- [ ] Top-level `$id` equals `https://debrief.info/schemas/stac`.
- [ ] Top-level `$defs` contains exactly **12 entries** — one per
      class declared in `stac.yaml` plus the `StacTypeEnum`. The TS-only
      `StacCatalogOrCollection` alias is NOT in this file (it lives in
      the TypeScript aliases module).

## Per-class assertions

For each class in `data-model.md`:

- [ ] An entry exists under `$defs/{ClassName}`.
- [ ] All slots marked `required: true` appear in `$defs/{ClassName}.required`.
- [ ] All `equals_string` slots produce
      `{ "type": "string", "const": "<value>" }`.
- [ ] All `range: <enum>` slots produce
      `{ "enum": [<permissible_values>] }`.
- [ ] All `multivalued: true` slots produce
      `{ "type": "array", "items": { "$ref": "#/$defs/<Range>" } }`.
- [ ] All `inlined_as_dict: true` multivalued slots produce
      `{ "type": "object", "additionalProperties": { "$ref": "..." } }`
      (records keyed by an opaque string).
- [ ] All classes with `additional_properties: true` produce
      `{ "additionalProperties": true }` at the class level — i.e.
      `StacItemProperties`, `StacAsset`, `StacSummaries` accept
      unknown keys.
- [ ] All other classes (closed) produce
      `{ "additionalProperties": false }`.

## Discriminator handling (R-001)

- [ ] `StacItem.type` produces
      `{ "type": "string", "const": "Feature" }`.
- [ ] `StacCatalog.type` produces
      `{ "type": "string", "const": "Catalog" }`.
- [ ] `StacCollection.type` produces
      `{ "type": "string", "const": "Collection" }`.

## Mixin handling (R-003)

- [ ] `StacItemProperties` JSON Schema includes all
      `StacExtensionProperties` slots (`platforms`, `tags`,
      `feature_tags`, `overrides`, `provenance_log`) **flattened**
      onto the same object (no nested `debrief:` wrapper).
- [ ] Mixed-in slots preserve their `slot_uri` (e.g.
      `debrief:platforms`) in the generated JSON property names.

## bbox cardinality (R-004)

- [ ] `StacItem.bbox` produces
      `{ "type": "array", "items": { "type": "number" },
         "minItems": 4, "maxItems": 6 }`.

## Geometry any_of (Edge Case #5 / R-001 of #115)

- [ ] `StacItem.geometry` produces an `anyOf` referencing the seven
      `GeoJSON*` classes from `geojson.yaml` — identical structure to
      `RawGeoJSONFeature.geometry` (existing precedent).

## Cross-language parity (Pydantic vs JSON Schema)

`shared/schemas/tests/test_stac_schema_compare.py` extends to cover
the new classes:

- [ ] For each new class, the JSON Schema produced by `gen-json-schema`
      MUST match the JSON Schema produced by
      `BaseModel.model_json_schema()` on the generated Pydantic class
      (modulo permitted whitespace / ordering differences already
      accepted by the existing schema-comparison helper).
- [ ] Pydantic `extra='forbid'` is overridden to `extra='allow'` on
      the three open-record classes (`StacItemProperties`,
      `StacAsset`, `StacSummaries`) — verified by inspecting
      `model_config` after generation.

## Fixture-corpus parity (FR-006 / FR-011)

The fixture-corpus test
`shared/schemas/tests/test_stac_fixtures.py` asserts:

- [ ] Every `item.json` under
      `preview/workspace/samples/local-store/` (currently 73 files)
      validates against `StacItem` without coercion.
- [ ] Every `item.json` under `apps/vscode/test-data/local-store/`
      (if any) validates against `StacItem` without coercion.
- [ ] `preview/workspace/samples/local-store/catalog.json` validates
      against `StacCollection` (it has `type: Collection`).
- [ ] `apps/vscode/test-data/local-store/catalog.json` validates
      against `StacCatalog` (it has `type: Catalog`).
- [ ] Round-trip: `model_validate(json.load(f)).model_dump(mode='json',
      exclude_none=True, by_alias=True)` produces a dict that, when
      re-serialised with the same key ordering as the source, is
      byte-identical to the original (modulo whitespace).

## TypeScript narrow-test (R-001)

`apps/web-shell/src/mocks/__tests__/stac-narrow.test.ts` (new):

- [ ] `if (x.type === 'Collection') { x.extent }` compiles —
      i.e. the discriminator narrow works.
- [ ] `if (x.type === 'Catalog') { x.extent }` fails to compile —
      i.e. the narrow is precise.
- [ ] `JSON.parse(item.json)` validated through a typed parser
      narrows to `StacItem`.
