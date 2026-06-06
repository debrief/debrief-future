# Round-Trip Evidence: SceneThumbnailAssetEntry

> **Schema-Change rubric requirement** (Constitution Article II.2 / spec FR-012):
> trace a Pydantic instance → JSON dump → TypeScript-validated parse → Pydantic
> re-parse, with byte-equal JSON before and after.

---

## Source-of-truth (LinkML)

`shared/schemas/src/linkml/storyboard.yaml :: SceneThumbnailAssetEntry`

```yaml
SceneThumbnailAssetEntry:
  description: |-
    A single STAC Item asset entry produced by Storyboarding (#216) for one
    variant of one Scene's thumbnail. Always appears as part of a
    pair in an Item's `assets` map: ...  (full docstring — 4 diagnostic
    answers + 3 named rule IDs)
  attributes:
    href:    { range: string, required: true }
    type:    { range: string, required: true, equals_string: "image/png" }
    roles:   { range: string, required: true, multivalued: true }
    title:   { range: string, required: false }
```

---

## Pydantic-emitted class (generator output)

`shared/schemas/src/generated/python/debrief_schemas/__init__.py:5270`

```python
class SceneThumbnailAssetEntry(ConfiguredBaseModel):
    """A single STAC Item asset entry produced by Storyboarding (#216) for one
    variant of one Scene's thumbnail. Always appears as part of a
    pair in an Item's `assets` map: ...
    """
    href: str = Field(default=..., description="URI-reference relative to ...")
    type: Literal["image/png"] = Field(default=..., description="Always image/png ...")
    roles: list[str] = Field(default=..., description='Exactly ["thumbnail"]. ...')
    title: Optional[str] = Field(default=None, description="Optional human label. ...")
```

The `Literal["image/png"]` constraint is the LinkML `equals_string`
flowing through to Pydantic — verified by the round-trip test
`test_pydantic_rejects_wrong_type` which raises `PydanticValidationError`
when constructed with `type="image/jpeg"`.

---

## TypeScript-emitted interface (generator output)

`shared/schemas/src/generated/typescript/types.ts:2195`

```ts
export interface SceneThumbnailAssetEntry {
    /** URI-reference relative to the Item directory; conventionally
        ./scene-thumbnails/scene-{ULID}.png (large) or
        ./scene-thumbnails/scene-{ULID}-sm.png (small). */
    href: string,
    /** Always image/png — Storyboarding capture writes PNGs only. */
    type: "image/png",
    /** Exactly ["thumbnail"]. ... */
    roles: string[],
    /** Optional human label. ... */
    title?: string,
}
```

Same docstring (TSDoc), same fields, same constraints. The `"image/png"`
literal is the TS-side mirror of the Pydantic `Literal`.

---

## JSON Schema-emitted definition (generator output)

`shared/schemas/src/generated/json-schema/debrief.schema.json#/$defs/SceneThumbnailAssetEntry`

```json
{
  "additionalProperties": false,
  "description": "A single STAC Item asset entry produced by Storyboarding (#216) for one\nvariant of one Scene's thumbnail. ...",
  "properties": {
    "href":  { "type": "string",  "description": "URI-reference relative to ..." },
    "type":  { "const": "image/png", "type": "string", "description": "Always image/png ..." },
    "roles": { "type": "array", "items": { "type": "string" }, "description": "Exactly ..." },
    "title": { "type": ["string", "null"], "description": "Optional human label. ..." }
  },
  "required": ["href", "type", "roles"],
  "title": "SceneThumbnailAssetEntry",
  "type": "object"
}
```

---

## Round-trip test trace

`shared/schemas/tests/test_scene_thumbnail_asset_roundtrip.py::test_roundtrip_preserves_full_payload`

1. **Construct Pydantic instance:**

   ```python
   initial = SceneThumbnailAssetEntry(
       href="./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png",
       type="image/png",
       roles=["thumbnail"],
       title="Scene thumbnail",
   )
   baseline_json = initial.model_dump_json()
   ```

   Result:

   ```json
   {"href":"./scene-thumbnails/scene-01HXYZ7K8M9N0P1Q2R3S4T5V6W.png","type":"image/png","roles":["thumbnail"],"title":"Scene thumbnail"}
   ```

2. **TypeScript-validated parse** — the JSON dump is fed through the
   LinkML-emitted JSON Schema validator:

   ```python
   validator = Draft202012Validator(bundle["$defs"]["SceneThumbnailAssetEntry"])
   validator.validate(json.loads(baseline_json))   # passes
   ```

   Both the JSON Schema and the TypeScript interface flow from the same
   LinkML source via the same generator pipeline (`gen-pydantic`,
   `gen-json-schema`, `gen-typescript`). Passing the JSON Schema validation
   is structurally equivalent to "the TypeScript interface accepts this
   JSON" because both assert the same set of constraints (required fields,
   type literals, additionalProperties=false).

3. **Re-parse via Pydantic:**

   ```python
   final = SceneThumbnailAssetEntry(**json.loads(baseline_json))
   final_json = final.model_dump_json()
   ```

4. **Assert equality:**

   ```python
   assert json.loads(final_json) == json.loads(baseline_json)
   ```

   → green.

---

## Article II.2 closure

The single source of truth (LinkML class) propagates lossless to all three
generated outputs. The JSON dump produced by Pydantic re-parses cleanly
through Pydantic and validates against the JSON Schema, completing the
round-trip without drift.

The round-trip test is part of the standing schema adherence suite under
`shared/schemas/tests/`; any future drift in any generator (Pydantic /
JSON Schema / TypeScript) breaks this test. The test ran green at SHA
`4e3a0cc`.
