"""Tests for STAC store migration from flat to per-item folder structure."""

import json
from pathlib import Path

import pytest

from debrief_stac.migrate import migrate_flat_store


def _create_flat_store(root: Path) -> None:
    """Create a flat STAC store with items in an items/ subdirectory."""
    root.mkdir(parents=True, exist_ok=True)
    items_dir = root / "items"
    items_dir.mkdir()

    # catalog.json
    catalog = {
        "type": "Catalog",
        "stac_version": "1.0.0",
        "id": "test-catalog",
        "description": "Test catalog",
        "links": [
            {"rel": "root", "href": "./catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./catalog.json", "type": "application/json"},
            {
                "rel": "item",
                "href": "./items/exercise-alpha.json",
                "type": "application/json",
                "title": "Exercise Alpha",
            },
            {
                "rel": "item",
                "href": "./items/training-run-1.json",
                "type": "application/json",
                "title": "Training Run 1",
            },
        ],
    }
    (root / "catalog.json").write_text(json.dumps(catalog, indent=2))

    # exercise-alpha item
    item_alpha = {
        "type": "Feature",
        "stac_version": "1.0.0",
        "id": "exercise-alpha",
        "geometry": None,
        "bbox": None,
        "properties": {"title": "Exercise Alpha", "datetime": "2024-01-15T09:30:00Z"},
        "links": [
            {"rel": "root", "href": "../catalog.json", "type": "application/json"},
            {"rel": "parent", "href": "../catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./exercise-alpha.json", "type": "application/json"},
        ],
        "assets": {
            "data": {
                "href": "./exercise-alpha.geojson",
                "type": "application/geo+json",
                "title": "Track and Location Data",
                "roles": ["data"],
            }
        },
    }
    (items_dir / "exercise-alpha.json").write_text(json.dumps(item_alpha, indent=2))
    (items_dir / "exercise-alpha.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": []})
    )

    # training-run-1 item
    item_training = {
        "type": "Feature",
        "stac_version": "1.0.0",
        "id": "training-run-1",
        "geometry": None,
        "bbox": None,
        "properties": {"title": "Training Run 1", "datetime": "2024-02-10T08:00:00Z"},
        "links": [
            {"rel": "root", "href": "../catalog.json", "type": "application/json"},
            {"rel": "parent", "href": "../catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./training-run-1.json", "type": "application/json"},
        ],
        "assets": {
            "data": {
                "href": "./training-run-1.geojson",
                "type": "application/geo+json",
                "title": "Track Data",
                "roles": ["data"],
            }
        },
    }
    (items_dir / "training-run-1.json").write_text(json.dumps(item_training, indent=2))
    (items_dir / "training-run-1.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": []})
    )


class TestMigrateFlatStore:
    def test_migrates_items_from_items_subdirectory(self, tmp_path: Path) -> None:
        """Items in items/ are moved to per-item folders."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrated = migrate_flat_store(store)

        assert sorted(migrated) == ["exercise-alpha", "training-run-1"]
        assert (store / "exercise-alpha" / "item.json").exists()
        assert (store / "training-run-1" / "item.json").exists()

    def test_idempotent_second_run_is_noop(self, tmp_path: Path) -> None:
        """Running migration twice returns empty list on second run."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)
        second_run = migrate_flat_store(store)

        assert second_run == []

    def test_catalog_item_links_updated(self, tmp_path: Path) -> None:
        """Catalog item links point to ./{id}/item.json after migration."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)

        catalog = json.loads((store / "catalog.json").read_text())
        item_links = [l for l in catalog["links"] if l["rel"] == "item"]
        hrefs = sorted(l["href"] for l in item_links)
        assert hrefs == ["./exercise-alpha/item.json", "./training-run-1/item.json"]

    def test_item_self_link_updated(self, tmp_path: Path) -> None:
        """Item self link becomes ./item.json."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)

        item = json.loads((store / "exercise-alpha" / "item.json").read_text())
        self_link = next(l for l in item["links"] if l["rel"] == "self")
        assert self_link["href"] == "./item.json"

    def test_item_parent_root_links_correct(self, tmp_path: Path) -> None:
        """Item root/parent links point to ../catalog.json."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)

        item = json.loads((store / "exercise-alpha" / "item.json").read_text())
        root_link = next(l for l in item["links"] if l["rel"] == "root")
        parent_link = next(l for l in item["links"] if l["rel"] == "parent")
        assert root_link["href"] == "../catalog.json"
        assert parent_link["href"] == "../catalog.json"

    def test_asset_hrefs_correct(self, tmp_path: Path) -> None:
        """Asset hrefs remain relative to item.json location."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)

        item = json.loads((store / "exercise-alpha" / "item.json").read_text())
        assert item["assets"]["data"]["href"] == "./exercise-alpha.geojson"
        assert (store / "exercise-alpha" / "exercise-alpha.geojson").exists()

    def test_empty_items_directory_removed(self, tmp_path: Path) -> None:
        """The items/ directory is removed after migration if empty."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)

        assert not (store / "items").exists()

    def test_assets_subdirectory_created(self, tmp_path: Path) -> None:
        """Each item folder gets an assets/ subdirectory."""
        store = tmp_path / "store"
        _create_flat_store(store)

        migrate_flat_store(store)

        assert (store / "exercise-alpha" / "assets").is_dir()
        assert (store / "training-run-1" / "assets").is_dir()
