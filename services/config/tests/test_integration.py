"""Integration tests for end-to-end store workflow."""

import json
from pathlib import Path

from debrief_config import (
    get_config_file,
    list_stores,
    register_store,
    remove_store,
)


class TestStoreWorkflow:
    """End-to-end tests for store registration workflow."""

    def test_full_workflow(self, sample_stac_catalog: Path, tmp_path: Path) -> None:
        """Test complete register → list → remove workflow."""
        # Create second catalog
        catalog2 = tmp_path / "catalog2"
        catalog2.mkdir()
        (catalog2 / "catalog.json").write_text(
            '{"type":"Catalog","stac_version":"1.0.0","id":"c2","description":"C2","links":[]}'
        )

        # Initially empty
        assert list_stores() == []

        # Register first store
        store1 = register_store(sample_stac_catalog, "Store 1")
        assert store1.name == "Store 1"

        # Register second store
        store2 = register_store(catalog2, "Store 2", notes="Second catalog")
        assert store2.notes == "Second catalog"

        # List shows both
        stores = list_stores()
        assert len(stores) == 2

        # Remove first store
        remove_store(sample_stac_catalog)
        stores = list_stores()
        assert len(stores) == 1
        assert stores[0].name == "Store 2"

        # Remove second store
        remove_store(catalog2)
        assert list_stores() == []

    def test_config_persists_to_file(self, sample_stac_catalog: Path) -> None:
        """Config should be written to disk."""
        register_store(sample_stac_catalog, "Persistent")

        config_file = get_config_file()
        assert config_file.exists()

        data = json.loads(config_file.read_text())
        assert len(data["stores"]) == 1
        assert data["stores"][0]["name"] == "Persistent"

    def test_config_survives_reload(self, sample_stac_catalog: Path) -> None:
        """Stores should persist across config reloads."""
        register_store(sample_stac_catalog, "Survives Reload")

        # Read back - persists due to autouse fixture isolation
        stores = list_stores()
        assert len(stores) == 1
        assert stores[0].name == "Survives Reload"

    def test_json_format_correct(self, sample_stac_catalog: Path) -> None:
        """Config JSON should use camelCase for cross-language compatibility."""
        register_store(sample_stac_catalog, "JSON Format Test")

        config_file = get_config_file()
        data = json.loads(config_file.read_text())

        # Check structure
        assert "version" in data
        assert "stores" in data
        assert "preferences" in data

        # Check camelCase in stores
        store = data["stores"][0]
        assert "lastAccessed" in store  # camelCase, not last_accessed
        assert "path" in store
        assert "name" in store
