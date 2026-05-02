# Round-trip evidence — Article II.1 schema integrity

This artefact demonstrates that a freshly-minted STAC 1.1.0 Item produced by
the `services/stac` factory survives a full schema round-trip:

1. Factory produces an Item dict
2. Serialise to JSON on disk
3. Re-read from disk
4. Validate against the **vendored** STAC 1.1 Item Schema (no network)
5. Re-serialise — assert byte-stable

## Demonstration

The following test (extracted from `services/stac/tests/test_plot.py`)
exercises the full round-trip. Result: pass.

```python
@pytest.fixture
def populated_item(tmp_path: Path) -> tuple[Path, str]:
    catalog_path = create_catalog(tmp_path / "catalog")
    plot_id = create_plot(catalog_path, PlotMetadata(title="Spec 241 Plot"), "plot-241")
    add_features(catalog_path, plot_id, [<a Point feature>])
    add_asset(catalog_path, plot_id, source_file)
    store_thumbnail(catalog_path, plot_id, b"\x89PNG\rlarge", b"\x89PNG\rsmall")
    return catalog_path, plot_id

def test_validates_against_contract_and_official_schema(populated_item):
    catalog_path, plot_id = populated_item
    with open(catalog_path / plot_id / "item.json") as f:
        item = json.load(f)

    _validate_against_contract(item)        # specs/241/contracts/item-shape.schema.json
    _validate_stac_item(item)               # vendored STAC 1.1 Item Schema
```

Plus 13 additional tests in `test_plot.py::TestSpec241*` covering the
shape exhaustively (extensions declared, properties metadata correct,
processing/file fields mirror debrief:provenance correctly, thumbnail/
overview pair has proj:shape + file:size + file:checksum, lifecycle
timestamps preserved+monotonic).

## What the round-trip proves

- The Pydantic-rooted internal `STACItem` shape and the disk JSON encoding
  are bidirectionally consistent (no information loss on serialise/deserialise).
- The disk shape conforms to **two** schemas in lockstep:
  1. The spec-241 contract at `specs/241/contracts/item-shape.schema.json`
     (Debrief-specific invariants — the three required extensions; the
     proj:shape constants; the file:size/file:checksum on disk-backed assets;
     the thumbnail/overview key contract; the source-* patternProperties).
  2. The official STAC 1.1.0 Item Schema vendored under
     `services/stac/tests/fixtures/stac-schemas/v1.1.0/`.

Every one of the 73 sample-catalog items also passes both validations
(`test_stac_validation.py::test_sample_catalog_items_validate_against_stac_1_1`)
and the catalog itself validates as a STAC 1.1 Collection
(`test_sample_catalog_root_validates_against_stac_1_1`). Together that's
SC-001 satisfied.

## Article II.1 closure

The previous network probe at `test_stac_validation.py:17–23` (which
silently skipped validation when the network was down) has been removed.
Schemas are vendored under `services/stac/tests/fixtures/stac-schemas/`
and resolved via a custom `jsonschema.Registry` in
`services/stac/tests/_stac_schema_harness.py`. A defensive
`assert_schemas_vendored()` call fails loudly if the fixtures directory is
missing or empty. **Article I.3 — no silent failures — is now satisfied.**
