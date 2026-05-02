"""Validate generated STAC outputs against the official STAC 1.1.0 spec.

Spec 241 — Article I.3 (no silent failures): the previous network probe at
the top of this file was removed. Schemas are vendored under
``tests/fixtures/stac-schemas/`` and resolved via ``_stac_schema_harness``;
validation runs unconditionally, fails loudly if anything regresses.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import ValidationError

from _stac_schema_harness import (  # noqa: E402  -- adjacent test helper
    assert_schemas_vendored,
    iter_item_validation_errors,
    validate_stac_catalog,
    validate_stac_collection,
    validate_stac_item,
)


# T012 — defensive guard: if the vendored fixtures are missing, fail early
# with a clear message rather than letting individual tests fail with
# Unresolvable: <ref> or FileNotFoundError.
def test_vendored_schemas_present() -> None:
    """Loud-fail when refresh-stac-schemas.sh hasn't been run."""
    assert_schemas_vendored()


# T013 — smoke test: the resolver wiring works end-to-end against a
# hand-crafted minimal STAC 1.1.0 Item before any factory output exists.
class TestSchemaResolverSmoke:
    def test_minimal_item_validates(self) -> None:
        item = {
            "type": "Feature",
            "stac_version": "1.1.0",
            "stac_extensions": [],
            "id": "smoke-test-item",
            "geometry": None,
            "properties": {"datetime": "2026-05-02T10:00:00Z"},
            "links": [],
            "assets": {},
        }
        validate_stac_item(item)

    def test_minimal_collection_validates(self) -> None:
        collection = {
            "type": "Collection",
            "stac_version": "1.1.0",
            "stac_extensions": [],
            "id": "smoke-test-collection",
            "description": "Smoke",
            "license": "other",
            "extent": {
                "spatial": {"bbox": [[-180, -90, 180, 90]]},
                "temporal": {"interval": [[None, None]]},
            },
            "links": [{"rel": "license", "href": "./LICENSE"}],
        }
        validate_stac_collection(collection)

    def test_minimal_catalog_validates(self) -> None:
        catalog = {
            "type": "Catalog",
            "stac_version": "1.1.0",
            "stac_extensions": [],
            "id": "smoke-test-catalog",
            "description": "Smoke",
            "links": [],
        }
        validate_stac_catalog(catalog)

    def test_invalid_item_raises(self) -> None:
        # Wrong stac_version — fails the const constraint on item.json.
        item = {
            "type": "Feature",
            "stac_version": "9.9.9",
            "stac_extensions": [],
            "id": "bad",
            "geometry": None,
            "properties": {"datetime": "2026-05-02T10:00:00Z"},
            "links": [],
            "assets": {},
        }
        with pytest.raises(ValidationError):
            validate_stac_item(item)


class TestFactoryOutputsValidate:
    """Smoke-validate the existing factory shapes — these will green up
    once Phase 3 + 4 land. For now they document the expected end state.
    """

    def test_create_plot_emits_valid_1_1_0_item(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Validation Test")
        plot_id = create_plot(catalog_path, metadata)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)
        validate_stac_item(item)

    def test_promoted_collection_validates(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Validation Test")
        create_plot(catalog_path, metadata)

        with open(catalog_path / "catalog.json") as f:
            catalog_data = json.load(f)
        if catalog_data.get("type") == "Collection":
            validate_stac_collection(catalog_data)
        else:
            validate_stac_catalog(catalog_data)


class TestSTACStructuralValidation:
    """Offline structural validation tests (no schema, no network)."""

    def test_catalog_has_required_fields(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import create_catalog

        catalog_path = create_catalog(tmp_path / "catalog", catalog_id="test")

        with open(catalog_path / "catalog.json") as f:
            catalog = json.load(f)

        assert catalog["type"] in ("Catalog", "Collection")
        assert catalog["stac_version"] == "1.1.0"
        assert "id" in catalog
        assert "description" in catalog
        assert "links" in catalog
        assert isinstance(catalog["links"], list)

    def test_catalog_links_have_required_fields(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        create_plot(catalog_path, metadata)

        with open(catalog_path / "catalog.json") as f:
            catalog = json.load(f)

        for link in catalog["links"]:
            assert "rel" in link
            assert "href" in link
        item_links = [link for link in catalog["links"] if link["rel"] == "item"]
        assert len(item_links) == 1

    def test_item_has_required_fields(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test", description="Test description")
        plot_id = create_plot(catalog_path, metadata)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        assert item["type"] == "Feature"
        assert item["stac_version"] == "1.1.0"
        assert "id" in item
        assert "geometry" in item
        assert "properties" in item
        assert "links" in item
        assert "assets" in item
        assert "datetime" in item["properties"]

    def test_item_links_have_parent_and_root(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        link_rels = [link["rel"] for link in item["links"]]
        assert "self" in link_rels
        assert "parent" in link_rels
        assert "root" in link_rels


def _format_errors(item: dict[str, object]) -> str:
    errs = iter_item_validation_errors(item)
    return "\n  ".join(errs) if errs else "(none)"
