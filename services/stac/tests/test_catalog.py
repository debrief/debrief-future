"""
Tests for catalog operations (User Story 1 & 6).

Following TDD: Write tests first, ensure they fail, then implement.
"""

import json
import os
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.exceptions import CatalogExistsError, CatalogNotFoundError
from debrief_stac.types import STAC_VERSION


class TestCreateCatalog:
    """Tests for create_catalog() function - User Story 1."""

    def test_create_catalog_success(self, temp_dir: Path) -> None:
        """T011: Given a valid directory path, When create_catalog() is called,
        Then a STAC catalog is created with valid catalog.json at the root.
        """
        catalog_path = temp_dir / "my_catalog"

        result = create_catalog(catalog_path)

        # Verify catalog directory exists
        assert catalog_path.exists()
        assert catalog_path.is_dir()

        # Verify catalog.json exists and is valid
        catalog_json_path = catalog_path / "catalog.json"
        assert catalog_json_path.exists()

        with open(catalog_json_path) as f:
            catalog_data = json.load(f)

        # Verify STAC structure
        assert catalog_data["type"] == "Catalog"
        assert catalog_data["stac_version"] == STAC_VERSION
        assert "id" in catalog_data
        assert "description" in catalog_data
        assert "links" in catalog_data

        # Verify required links
        link_rels = [link["rel"] for link in catalog_data["links"]]
        assert "root" in link_rels
        assert "self" in link_rels

        # Verify return value
        assert result == catalog_path

    def test_create_catalog_with_custom_id(self, temp_dir: Path) -> None:
        """create_catalog with custom catalog_id uses that ID."""
        catalog_path = temp_dir / "custom_catalog"

        create_catalog(catalog_path, catalog_id="my-custom-id")

        catalog_json_path = catalog_path / "catalog.json"
        with open(catalog_json_path) as f:
            catalog_data = json.load(f)

        assert catalog_data["id"] == "my-custom-id"

    def test_create_catalog_with_description(self, temp_dir: Path) -> None:
        """create_catalog with custom description uses that description."""
        catalog_path = temp_dir / "described_catalog"

        create_catalog(catalog_path, description="My analysis catalog")

        catalog_json_path = catalog_path / "catalog.json"
        with open(catalog_json_path) as f:
            catalog_data = json.load(f)

        assert catalog_data["description"] == "My analysis catalog"

    def test_create_catalog_existing_catalog_fails(self, temp_dir: Path) -> None:
        """T012: Given a path that already contains a catalog,
        When create_catalog() is called, Then operation fails with clear error.
        """
        catalog_path = temp_dir / "existing_catalog"

        # Create first catalog
        create_catalog(catalog_path)

        # Attempt to create again should fail
        with pytest.raises(CatalogExistsError) as exc_info:
            create_catalog(catalog_path)

        assert str(catalog_path) in str(exc_info.value)

    @pytest.mark.skipif(os.geteuid() == 0, reason="Root bypasses permission checks")
    def test_create_catalog_permission_error(self, temp_dir: Path) -> None:
        """T013: Given a path without write permissions,
        When create_catalog() is called, Then operation fails with permission error.
        """
        # Create a read-only directory
        readonly_dir = temp_dir / "readonly"
        readonly_dir.mkdir()
        os.chmod(readonly_dir, 0o444)

        try:
            catalog_path = readonly_dir / "cannot_create"

            with pytest.raises((PermissionError, OSError)):
                create_catalog(catalog_path)
        finally:
            # Restore permissions for cleanup
            os.chmod(readonly_dir, 0o755)

    def test_create_catalog_creates_parent_dirs(self, temp_dir: Path) -> None:
        """create_catalog creates parent directories if they don't exist."""
        catalog_path = temp_dir / "nested" / "path" / "catalog"

        create_catalog(catalog_path)

        assert catalog_path.exists()
        assert (catalog_path / "catalog.json").exists()


class TestOpenCatalog:
    """Tests for open_catalog() function - User Story 1."""

    def test_open_catalog_success(self, temp_dir: Path) -> None:
        """open_catalog returns catalog data for existing catalog."""
        catalog_path = temp_dir / "test_catalog"
        create_catalog(catalog_path, catalog_id="test-id")

        catalog_data = open_catalog(catalog_path)

        assert catalog_data["type"] == "Catalog"
        assert catalog_data["id"] == "test-id"
        assert catalog_data["stac_version"] == STAC_VERSION

    def test_open_catalog_not_found(self, temp_dir: Path) -> None:
        """open_catalog raises CatalogNotFoundError for missing catalog."""
        catalog_path = temp_dir / "nonexistent"

        with pytest.raises(CatalogNotFoundError) as exc_info:
            open_catalog(catalog_path)

        assert str(catalog_path) in str(exc_info.value)

    def test_open_catalog_missing_catalog_json(self, temp_dir: Path) -> None:
        """open_catalog raises error when directory exists but catalog.json is missing."""
        catalog_path = temp_dir / "empty_dir"
        catalog_path.mkdir()

        with pytest.raises(CatalogNotFoundError):
            open_catalog(catalog_path)
