"""
Schema-comparison tests for the STAC catalog cluster (#223).

Verifies that the Pydantic ``model_json_schema()`` output for each
STAC class is structurally consistent with the on-disk JSON Schema
the build pipeline emits. Cross-references:

- FR-006 (round-trip + schema-comparison adherence tests mandatory)
- Research R-002 (open-record / extension keys)
- Research R-011 (post-processed nested-array slots)
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

from debrief_schemas import (  # noqa: E402
    StacAsset,
    StacCatalog,
    StacCollection,
    StacExtent,
    StacItem,
    StacItemAssetDefinition,
    StacItemProperties,
    StacLink,
    StacProvider,
    StacSpatialExtent,
    StacSummaries,
    StacTemporalExtent,
)

# Expected required-slot sets per class — matches data-model.md.
EXPECTED_REQUIRED: dict[type, set[str]] = {
    StacItem: {"type", "stac_version", "id", "geometry", "bbox", "properties", "links", "assets"},
    StacCatalog: {"type", "stac_version", "id", "description", "links"},
    StacCollection: {
        "type",
        "stac_version",
        "id",
        "description",
        "license",
        "extent",
        "links",
    },
    StacLink: {"rel", "href"},
    StacAsset: {"href"},
    StacItemAssetDefinition: set(),  # all slots optional — declaration only
    StacExtent: {"spatial", "temporal"},
    StacSpatialExtent: {"bbox"},
    StacTemporalExtent: {"interval"},
    StacSummaries: set(),  # all summary slots optional
    StacProvider: {"name"},
    StacItemProperties: {"datetime"},
}


@pytest.mark.parametrize(
    "cls,required",
    list(EXPECTED_REQUIRED.items()),
    ids=[c.__name__ for c in EXPECTED_REQUIRED],
)
def test_required_slots(cls: type, required: set[str]) -> None:
    """Pydantic ``model_json_schema`` reports the expected required slots."""
    schema = cls.model_json_schema()
    if required:
        assert schema.get("required") is not None, (
            f"{cls.__name__} has no 'required' field in its model_json_schema"
        )
        assert set(schema["required"]) == required, (
            f"{cls.__name__} required slots: expected {required}, got "
            f"{schema['required']}"
        )
    else:
        # Empty-required-set classes either omit "required" or carry an
        # empty list.
        actual = schema.get("required", [])
        assert set(actual) == set(), (
            f"{cls.__name__} expected no required slots but reports {actual}"
        )


def test_open_record_classes_allow_extras() -> None:
    """The three Article XV.2 exception classes accept extra keys.

    Pydantic's ``additionalProperties`` reflects the ``extra='allow'``
    model_config that the generator post-processor installs on the
    three open-record classes. The expected value is either ``True``
    or missing (default-allow) — Pydantic emits it as ``True`` when
    explicitly configured.
    """
    for cls in (
        StacItemProperties,
        StacAsset,
        StacItemAssetDefinition,
        StacSummaries,
    ):
        schema = cls.model_json_schema()
        # `additionalProperties` may be absent (defaulting to True) or
        # explicitly True. It must NOT be False.
        if "additionalProperties" in schema:
            assert schema["additionalProperties"] is not False, (
                f"{cls.__name__} model_json_schema reports "
                f"additionalProperties=False; expected True or absent "
                f"(Article XV.2 exception per spec §223 / Research R-002)."
            )


def test_stac_item_discriminator_is_literal() -> None:
    """``StacItem.type`` MUST be the string literal "Feature"."""
    schema = StacItem.model_json_schema()
    type_prop = schema["properties"]["type"]
    # Pydantic emits literal-string discriminators as `const: "Feature"`
    # or `enum: ["Feature"]` depending on the version. Accept either.
    if "const" in type_prop:
        assert type_prop["const"] == "Feature"
    elif "enum" in type_prop:
        assert type_prop["enum"] == ["Feature"]
    else:
        pytest.fail(
            f"StacItem.type discriminator is not a literal in model_json_schema: "
            f"{type_prop}"
        )


def test_stac_catalog_discriminator_is_literal() -> None:
    """``StacCatalog.type`` MUST be the string literal "Catalog"."""
    schema = StacCatalog.model_json_schema()
    type_prop = schema["properties"]["type"]
    if "const" in type_prop:
        assert type_prop["const"] == "Catalog"
    elif "enum" in type_prop:
        assert type_prop["enum"] == ["Catalog"]
    else:
        pytest.fail(
            f"StacCatalog.type discriminator is not a literal: {type_prop}"
        )


def test_stac_collection_discriminator_is_literal() -> None:
    """``StacCollection.type`` MUST be the string literal "Collection"."""
    schema = StacCollection.model_json_schema()
    type_prop = schema["properties"]["type"]
    if "const" in type_prop:
        assert type_prop["const"] == "Collection"
    elif "enum" in type_prop:
        assert type_prop["enum"] == ["Collection"]
    else:
        pytest.fail(
            f"StacCollection.type discriminator is not a literal: {type_prop}"
        )


def test_stac_item_assets_is_record_of_stacasset() -> None:
    """``StacItem.assets`` MUST validate as ``dict[str, StacAsset]``."""
    schema = StacItem.model_json_schema()
    assets_prop = schema["properties"]["assets"]
    # Pydantic emits dict[str, X] as { type: "object", additionalProperties: { $ref/... } }
    assert assets_prop.get("type") == "object", (
        f"StacItem.assets is not declared as object: {assets_prop}"
    )
    ap = assets_prop.get("additionalProperties")
    assert isinstance(ap, dict) and (
        "$ref" in ap and "StacAsset" in ap["$ref"]
    ), (
        f"StacItem.assets.additionalProperties does not reference StacAsset: "
        f"{ap}"
    )


def test_stac_spatial_extent_bbox_is_nested_array() -> None:
    """``StacSpatialExtent.bbox`` MUST be ``list[list[float]]`` post-processed."""
    schema = StacSpatialExtent.model_json_schema()
    bbox_prop = schema["properties"]["bbox"]
    assert bbox_prop.get("type") == "array", (
        f"bbox is not an array: {bbox_prop}"
    )
    inner = bbox_prop.get("items")
    assert isinstance(inner, dict) and inner.get("type") == "array", (
        f"bbox.items is not a nested array (post-processor R-011 did not "
        f"run?): {inner}"
    )


def test_stac_temporal_interval_is_nested_array() -> None:
    """``StacTemporalExtent.interval`` MUST be ``list[list[str | None]]``."""
    schema = StacTemporalExtent.model_json_schema()
    interval_prop = schema["properties"]["interval"]
    assert interval_prop.get("type") == "array"
    inner = interval_prop.get("items")
    assert isinstance(inner, dict) and inner.get("type") == "array", (
        f"interval.items is not a nested array (post-processor R-011 did "
        f"not run?): {inner}"
    )
