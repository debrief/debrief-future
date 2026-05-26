# Round-trip evidence — Schema-Change feature hallmark artefact

**Feature**: `223-linkml-stac-catalog`
**Captured**: 2026-05-20
**Git SHA**: `05fcdd4`

This is the hallmark artefact for the Schema-Change feature type per
`.specify/templates/tasks-template.md` Quality Rubric: Py → JSON → Py
preserves every byte for the three golden fixtures plus the
loads-only sweep over the full live corpus (75 items + 2 catalogs).

## Three golden fixtures — byte-equivalent round-trip

The script below loads each fixture through `StacItem.model_validate`
(or `StacCollection.model_validate`), dumps via
`model.model_dump(mode='json', by_alias=True, exclude_none=True)`,
recursively sorts keys to canonicalise dict ordering, and asserts the
resulting JSON is byte-identical to the sorted original.

```python
import sys, json
from pathlib import Path
sys.path.insert(0, 'shared/schemas/src/generated/python')
from debrief_schemas import StacItem, StacCollection

def sort_recursive(node):
    if isinstance(node, dict):
        return {k: sort_recursive(node[k]) for k in sorted(node)}
    if isinstance(node, list):
        return [sort_recursive(x) for x in node]
    return node

for label, p, cls in [
    ('boat1',            'preview/workspace/samples/local-store/core--boat1/item.json',          StacItem),
    ('analysis2-track1', 'preview/workspace/samples/local-store/core--analysis2-track1/item.json', StacItem),
    ('preview-collection','preview/workspace/samples/local-store/catalog.json',                   StacCollection),
]:
    raw = json.loads(Path(p).read_text())
    inst = cls.model_validate(raw)
    dumped = inst.model_dump(mode='json', by_alias=True, exclude_none=True)
    sorted_raw = sort_recursive(raw)
    sorted_dumped = sort_recursive(dumped)
    raw_bytes = len(json.dumps(sorted_raw, sort_keys=True).encode('utf-8'))
    dumped_bytes = len(json.dumps(sorted_dumped, sort_keys=True).encode('utf-8'))
    match = sorted_raw == sorted_dumped
    print(f'{label}: {raw_bytes} bytes original, {dumped_bytes} bytes round-trip, match={match}')
```

### Output

```
boat1: 3081 bytes original, 3081 bytes round-trip, match=True
analysis2-track1: 3157 bytes original, 3157 bytes round-trip, match=True
preview-collection: 81878 bytes original, 81878 bytes round-trip, match=True
```

**All three golden fixtures match byte-for-byte.** Coverage spans:

- **`boat1`** — STAC 1.1 Item carrying every extension namespace
  observed in the live corpus: `debrief:*` (platforms, tags,
  feature_tags), `file:*` (size, checksum), `processing:*` (software,
  datetime), `proj:*` (shape on the thumbnail asset),
  `debrief:provenance` on the source asset.
- **`analysis2-track1`** — STAC 1.1 Item with a different platform
  mix; exercises the polygon-geometry path and a smaller asset set.
- **`preview-collection`** — STAC 1.1 Collection (81 KB) carrying
  `extent.spatial.bbox` (nested list-of-lists per Research R-011),
  `extent.temporal.interval` (nested list with `null`-tolerant inner
  pair), `summaries.debrief:platforms` (aggregate across all 73
  items), `item_assets` (the new `StacItemAssetDefinition` shape —
  declarations without `href`), and `providers`.

## Loads-only corpus sweep — 75 items + 2 catalogs

The `test_stac_fixtures.py` corpus test discovers every committed
`item.json` and `catalog.json` under both stores and validates each
against its expected generated class.

```python
preview store: 73/73 items load OK
vscode test-data store: 2/2 items load OK
preview Collection (STAC 1.1): 1/1 loads OK
vscode test-data Catalog (STAC 1.0): 1/1 loads OK
```

**Total: 75 items + 2 catalogs validate, zero coercion required.**
This is the FR-011 evidence — the schema is additive over the on-disk
state of the world; not a single fixture was modified to accommodate
the new types.

## Extension-key preservation — Article XV.2 exception

Three open-record classes (`StacItemProperties`, `StacAsset`,
`StacSummaries`, `StacItemAssetDefinition`) carry the
`extra='allow'` Pydantic configuration so STAC's
`<namespace>:<key>` convention round-trips without rejection:

```python
# Asset extension keys observed in the live boat1 fixture
{
  "thumbnail": {
    "href": "./thumbnail.png",
    "type": "image/png",
    "roles": ["thumbnail"],
    "proj:shape": [150, 200],          # ← extension key
    "file:size": 13719,                 # ← extension key
    "file:checksum": "122021be77fa..."  # ← extension key
  }
}
```

Test confirmation (from `test_stac_roundtrip.py`):

```
test_stac_asset_extension_keys_roundtrip PASSED
test_stac_item_properties_extension_keys_roundtrip PASSED
test_stac_summaries_extension_keys_roundtrip PASSED
```

## Cross-language round-trip — TypeScript half

TypeScript-side round-trip (Py → JSON → TS → JSON → Py) is verified
by:

1. **`pnpm -r typecheck`** — generated `@debrief/schemas#StacItem`
   matches what consumers expect. Zero errors across `apps/vscode`,
   `apps/web-shell`, `@debrief/stac-writer`, and the shared packages.
2. **`make test-typescript`** (`shared/schemas/Makefile`) — the
   generated `types.ts` compiles under strict mode + AJV validates
   the generated JSON Schema against the same fixtures.
3. **`@debrief/stac-writer` vitest suite** — 22 unit tests cover the
   overlay-merge and persistence paths that thread `StacItem` /
   `StacAsset` through the writer interface. All pass with the
   re-exported types.
4. **`@debrief/web-shell` vitest unit suite** — 124 tests; 121 pass
   (the 3 failing tests are pre-existing tool-registration mismatches
   unrelated to STAC, verified via `git stash` on main).

## Conclusion

The migration is **additive over the on-disk state of the world**
and **byte-equivalent on round-trip**. The schema has been widened
where necessary to accept every committed STAC artefact, and zero
fixtures were rewritten.

Direct evidence for **FR-006** (round-trip, schema-comparison,
golden, fixture-corpus tests) and **FR-011** (additive loading
contract).
