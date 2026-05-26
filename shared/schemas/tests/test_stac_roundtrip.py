"""
Round-trip tests for the STAC catalog cluster (#223).

Verifies Python (Pydantic) → JSON → Pydantic round-trip preserves
every field for each generated class per FR-006. The TS-side
round-trip (Py → JSON → TS → JSON → Py) is verified by the existing
TypeScript-side tsc check on the generated `@debrief/schemas` types.

Classes covered (per data-model.md):

- P1 (envelopes): StacItem, StacCatalog, StacItemProperties
- P2 (members):   StacLink, StacAsset
- P3 (Collection): StacCollection, StacExtent, StacSpatialExtent,
                   StacTemporalExtent, StacSummaries, StacProvider

Invalid-fixture coverage (FR-006 negative): at least one invalid
fixture per class fails validation with a field-level error.
"""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

from debrief_schemas import (  # noqa: E402
    StacAsset,
    StacCatalog,
    StacCollection,
    StacExtent,
    StacItem,
    StacItemAssetDefinition,
    StacLink,
    StacProvider,
    StacSpatialExtent,
    StacSummaries,
    StacTemporalExtent,
)

FIXTURES_ROOT = Path(__file__).parent.parent / "fixtures" / "stac"


# --------------------------------------------------------------------------
# Round-trip — every named class must Py → JSON → Py preserve fields
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "model_cls,fixture",
    [
        (StacItem, FIXTURES_ROOT / "StacItem" / "valid" / "minimal-stac-10.json"),
        (
            StacItem,
            FIXTURES_ROOT / "StacItem" / "valid" / "stac-11-with-debrief-extensions.json",
        ),
        (StacCatalog, FIXTURES_ROOT / "StacCatalog" / "valid" / "stac-10-flat.json"),
        (
            StacCollection,
            FIXTURES_ROOT / "StacCollection" / "valid" / "stac-11-with-extent.json",
        ),
        (
            StacCollection,
            FIXTURES_ROOT / "StacCollection" / "valid" / "null-temporal-interval.json",
        ),
        (StacLink, FIXTURES_ROOT / "StacLink" / "valid" / "minimal.json"),
        (StacLink, FIXTURES_ROOT / "StacLink" / "valid" / "full.json"),
        (StacAsset, FIXTURES_ROOT / "StacAsset" / "valid" / "data-asset.json"),
        (
            StacAsset,
            FIXTURES_ROOT / "StacAsset" / "valid" / "asset-with-extension-keys.json",
        ),
        (
            StacItemAssetDefinition,
            FIXTURES_ROOT / "StacItemAssetDefinition" / "valid" / "definition.json",
        ),
        (StacExtent, FIXTURES_ROOT / "StacExtent" / "valid" / "spatial-temporal.json"),
        (StacSummaries, FIXTURES_ROOT / "StacSummaries" / "valid" / "full.json"),
        (StacProvider, FIXTURES_ROOT / "StacProvider" / "valid" / "full.json"),
    ],
)
def test_stac_roundtrip(model_cls: type, fixture: Path) -> None:
    """Py → JSON → Py preserves every original key on the model."""
    raw = json.loads(fixture.read_text())
    instance = model_cls.model_validate(raw)
    dumped = instance.model_dump(mode="json", by_alias=True, exclude_none=True)

    # Re-validate the dump to confirm it's parseable.
    re_instance = model_cls.model_validate(dumped)
    re_dumped = re_instance.model_dump(mode="json", by_alias=True, exclude_none=True)
    assert dumped == re_dumped, (
        f"Round-trip for {model_cls.__name__} mutated fields: "
        f"original={dumped}, re-dumped={re_dumped}"
    )

    # Every top-level key from the original MUST survive.
    for key, value in raw.items():
        assert key in dumped, (
            f"{model_cls.__name__} dropped slot {key!r} on round-trip (fixture: {fixture.name})"
        )
        assert dumped[key] == value, (
            f"{model_cls.__name__} mutated slot {key!r}: was {value!r}, became {dumped[key]!r}"
        )


# --------------------------------------------------------------------------
# Extension-key preservation — open-record slots must round-trip extras
# --------------------------------------------------------------------------


def test_stac_asset_extension_keys_roundtrip() -> None:
    """STAC `<namespace>:<key>` keys on assets survive Py → JSON → Py."""
    raw = json.loads(
        (FIXTURES_ROOT / "StacAsset" / "valid" / "asset-with-extension-keys.json").read_text()
    )
    asset = StacAsset.model_validate(raw)
    dumped = asset.model_dump(mode="json", by_alias=True, exclude_none=True)
    for ext_key in ("file:size", "file:checksum", "proj:shape", "debrief:provenance"):
        assert ext_key in dumped, f"asset round-trip dropped extension key {ext_key!r}"
        assert dumped[ext_key] == raw[ext_key]


def test_stac_item_properties_extension_keys_roundtrip() -> None:
    """`debrief:*` and other extension keys on properties survive Py → JSON → Py."""
    raw = json.loads(
        (FIXTURES_ROOT / "StacItem" / "valid" / "stac-11-with-debrief-extensions.json").read_text()
    )
    item = StacItem.model_validate(raw)
    dumped = item.model_dump(mode="json", by_alias=True, exclude_none=True)
    props = dumped["properties"]
    for ext_key in ("debrief:platforms", "debrief:tags", "debrief:feature_tags"):
        assert ext_key in props, f"properties round-trip dropped extension key {ext_key!r}"
        assert props[ext_key] == raw["properties"][ext_key]


def test_stac_summaries_extension_keys_roundtrip() -> None:
    """Summary extension keys (`debrief:*`) survive Py → JSON → Py."""
    raw = json.loads((FIXTURES_ROOT / "StacSummaries" / "valid" / "full.json").read_text())
    summaries = StacSummaries.model_validate(raw)
    dumped = summaries.model_dump(mode="json", by_alias=True, exclude_none=True)
    for ext_key in ("debrief:platforms", "debrief:tags", "debrief:feature_tags"):
        assert ext_key in dumped


# --------------------------------------------------------------------------
# Negative fixtures (FR-006 — invalid input fails with a field-level error)
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "model_cls,fixture",
    [
        (StacItem, FIXTURES_ROOT / "StacItem" / "invalid" / "missing-required-fields.json"),
        (
            StacItem,
            FIXTURES_ROOT / "StacItem" / "invalid" / "wrong-type-discriminator.json",
        ),
        (StacCatalog, FIXTURES_ROOT / "StacCatalog" / "invalid" / "missing-description.json"),
        (StacCollection, FIXTURES_ROOT / "StacCollection" / "invalid" / "missing-license.json"),
        (StacLink, FIXTURES_ROOT / "StacLink" / "invalid" / "missing-href.json"),
        (StacAsset, FIXTURES_ROOT / "StacAsset" / "invalid" / "wrong-roles-type.json"),
        (StacExtent, FIXTURES_ROOT / "StacExtent" / "invalid" / "missing-temporal.json"),
        (StacSummaries, FIXTURES_ROOT / "StacSummaries" / "invalid" / "tags-wrong-type.json"),
        (StacProvider, FIXTURES_ROOT / "StacProvider" / "invalid" / "missing-name.json"),
    ],
)
def test_stac_invalid_fixtures_fail(model_cls: type, fixture: Path) -> None:
    """Every invalid/*.json MUST fail validation with at least one error."""
    raw = json.loads(fixture.read_text())
    with pytest.raises(ValidationError) as excinfo:
        model_cls.model_validate(raw)
    assert excinfo.value.error_count() >= 1, (
        f"{model_cls.__name__}: invalid fixture {fixture.name} raised "
        f"ValidationError with no errors"
    )


# --------------------------------------------------------------------------
# Discriminated-union narrow (TS-side mirror) — Python union resolves to
# the correct concrete class.
# --------------------------------------------------------------------------


def test_stac_catalog_or_collection_python_union_narrows() -> None:
    """Python's Union[StacCatalog, StacCollection] picks the right class."""
    from pydantic import TypeAdapter

    from debrief_schemas.unions import StacCatalogOrCollection

    adapter: TypeAdapter[StacCatalogOrCollection] = TypeAdapter(StacCatalogOrCollection)

    catalog_raw = json.loads(
        (FIXTURES_ROOT / "StacCatalog" / "valid" / "stac-10-flat.json").read_text()
    )
    catalog = adapter.validate_python(catalog_raw)
    assert isinstance(catalog, StacCatalog)
    assert catalog.type == "Catalog"

    collection_raw = json.loads(
        (FIXTURES_ROOT / "StacCollection" / "valid" / "stac-11-with-extent.json").read_text()
    )
    collection = adapter.validate_python(collection_raw)
    assert isinstance(collection, StacCollection)
    assert collection.type == "Collection"


# --------------------------------------------------------------------------
# Sanity check — generated nested-array types are correct (R-011)
# --------------------------------------------------------------------------


def test_stac_spatial_extent_is_list_of_lists() -> None:
    """StacSpatialExtent.bbox MUST be list[list[float]] post-generation."""
    extent = StacSpatialExtent.model_validate({"bbox": [[-180.0, -90.0, 180.0, 90.0]]})
    assert isinstance(extent.bbox, list)
    assert isinstance(extent.bbox[0], list)
    assert extent.bbox[0][0] == -180.0


def test_stac_temporal_extent_accepts_nulls() -> None:
    """StacTemporalExtent.interval entries may carry null bounds."""
    extent = StacTemporalExtent.model_validate({"interval": [["2024-01-01T00:00:00Z", None]]})
    assert extent.interval[0][1] is None
