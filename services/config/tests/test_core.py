"""Tests for core store registration functionality."""

from pathlib import Path

import pytest
from debrief_config import (
    InvalidCatalogError,
    StoreExistsError,
    StoreNotFoundError,
    list_stores,
    register_store,
    remove_store,
)


class TestRegisterStore:
    """Tests for register_store function."""

    def test_register_valid_catalog(self, sample_stac_catalog: Path) -> None:
        """Should register a valid STAC catalog."""
        store = register_store(sample_stac_catalog, "Test Catalog")

        assert store.path == str(sample_stac_catalog.resolve())
        assert store.name == "Test Catalog"
        assert store.last_accessed is not None

    def test_register_with_notes(self, sample_stac_catalog: Path) -> None:
        """Should store optional notes."""
        store = register_store(sample_stac_catalog, "Test", notes="Important catalog")
        assert store.notes == "Important catalog"

    def test_register_invalid_catalog(self, invalid_stac_catalog: Path) -> None:
        """Should raise InvalidCatalogError for invalid catalog."""
        with pytest.raises(InvalidCatalogError):
            register_store(invalid_stac_catalog, "Invalid")

    def test_register_nonexistent_path(self, tmp_path: Path) -> None:
        """Should raise InvalidCatalogError for nonexistent path."""
        with pytest.raises(InvalidCatalogError):
            register_store(tmp_path / "nonexistent", "Missing")

    def test_register_duplicate_raises_error(self, sample_stac_catalog: Path) -> None:
        """Should raise StoreExistsError when registering same path twice."""
        register_store(sample_stac_catalog, "First")

        with pytest.raises(StoreExistsError):
            register_store(sample_stac_catalog, "Second")

    def test_register_empty_name_raises_error(self, sample_stac_catalog: Path) -> None:
        """Should raise ValueError for empty name."""
        with pytest.raises(ValueError, match="name cannot be empty"):
            register_store(sample_stac_catalog, "")

    def test_register_without_validation(self, tmp_path: Path) -> None:
        """Should skip validation when validate=False."""
        store = register_store(tmp_path, "No Validation", validate=False)
        assert store.name == "No Validation"


class TestListStores:
    """Tests for list_stores function."""

    def test_empty_list_when_no_stores(self) -> None:
        """Should return empty list when no stores registered."""
        stores = list_stores()
        assert stores == []

    def test_list_registered_stores(self, sample_stac_catalog: Path, tmp_path: Path) -> None:
        """Should return all registered stores."""
        # Create a second valid catalog
        catalog2 = tmp_path / "catalog2"
        catalog2.mkdir()
        (catalog2 / "catalog.json").write_text(
            '{"type":"Catalog","stac_version":"1.0.0","id":"cat2","description":"Cat2","links":[]}'
        )

        register_store(sample_stac_catalog, "First")
        register_store(catalog2, "Second")

        stores = list_stores()

        assert len(stores) == 2
        names = {s.name for s in stores}
        assert names == {"First", "Second"}


class TestRemoveStore:
    """Tests for remove_store function."""

    def test_remove_registered_store(self, sample_stac_catalog: Path) -> None:
        """Should remove a registered store."""
        register_store(sample_stac_catalog, "To Remove")
        assert len(list_stores()) == 1

        remove_store(sample_stac_catalog)
        assert len(list_stores()) == 0

    def test_remove_nonexistent_raises_error(self) -> None:
        """Should raise StoreNotFoundError for unregistered path."""
        with pytest.raises(StoreNotFoundError):
            remove_store("/nonexistent/path")

    def test_remove_does_not_delete_files(self, sample_stac_catalog: Path) -> None:
        """Removing registration should not delete catalog files."""
        catalog_json = sample_stac_catalog / "catalog.json"

        register_store(sample_stac_catalog, "Keep Files")
        remove_store(sample_stac_catalog)

        # Catalog files should still exist
        assert catalog_json.exists()
