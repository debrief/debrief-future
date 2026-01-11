"""Tests for STAC catalog validation."""

import json
from pathlib import Path

import pytest

from debrief_config.exceptions import InvalidCatalogError
from debrief_config.validation import validate_stac_catalog


class TestValidateStacCatalog:
    """Tests for validate_stac_catalog function."""

    def test_valid_catalog_passes(self, sample_stac_catalog: Path) -> None:
        """Should not raise for valid catalog."""
        # Should not raise
        validate_stac_catalog(sample_stac_catalog)

    def test_missing_catalog_json_fails(self, tmp_path: Path) -> None:
        """Should raise when catalog.json is missing."""
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()

        with pytest.raises(InvalidCatalogError, match="No catalog.json found"):
            validate_stac_catalog(empty_dir)

    def test_invalid_json_fails(self, tmp_path: Path) -> None:
        """Should raise for invalid JSON."""
        catalog_dir = tmp_path / "bad-json"
        catalog_dir.mkdir()
        (catalog_dir / "catalog.json").write_text("{ not valid json }")

        with pytest.raises(InvalidCatalogError, match="Invalid JSON"):
            validate_stac_catalog(catalog_dir)

    def test_missing_type_field_fails(self, tmp_path: Path) -> None:
        """Should raise when type field is missing."""
        catalog_dir = tmp_path / "no-type"
        catalog_dir.mkdir()
        (catalog_dir / "catalog.json").write_text(
            json.dumps({
                "stac_version": "1.0.0",
                "id": "test",
                "description": "Test",
                "links": []
            })
        )

        with pytest.raises(InvalidCatalogError, match="Missing required fields"):
            validate_stac_catalog(catalog_dir)

    def test_wrong_type_fails(self, tmp_path: Path) -> None:
        """Should raise when type is not 'Catalog'."""
        catalog_dir = tmp_path / "wrong-type"
        catalog_dir.mkdir()
        (catalog_dir / "catalog.json").write_text(
            json.dumps({
                "type": "Feature",
                "stac_version": "1.0.0",
                "id": "test",
                "description": "Test",
                "links": []
            })
        )

        with pytest.raises(InvalidCatalogError, match="type must be 'Catalog'"):
            validate_stac_catalog(catalog_dir)

    def test_links_not_array_fails(self, tmp_path: Path) -> None:
        """Should raise when links is not an array."""
        catalog_dir = tmp_path / "bad-links"
        catalog_dir.mkdir()
        (catalog_dir / "catalog.json").write_text(
            json.dumps({
                "type": "Catalog",
                "stac_version": "1.0.0",
                "id": "test",
                "description": "Test",
                "links": "not-an-array"
            })
        )

        with pytest.raises(InvalidCatalogError, match="links must be an array"):
            validate_stac_catalog(catalog_dir)

    def test_json_array_at_root_fails(self, tmp_path: Path) -> None:
        """Should raise when catalog.json is an array instead of object."""
        catalog_dir = tmp_path / "array-root"
        catalog_dir.mkdir()
        (catalog_dir / "catalog.json").write_text("[]")

        with pytest.raises(InvalidCatalogError, match="must be a JSON object"):
            validate_stac_catalog(catalog_dir)

    def test_accepts_string_path(self, sample_stac_catalog: Path) -> None:
        """Should accept string paths as well as Path objects."""
        # Should not raise
        validate_stac_catalog(str(sample_stac_catalog))
