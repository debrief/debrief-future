"""Tests for thumbnail storage (spec 241 — STAC 1.1 asset shape)."""

from pathlib import Path

import pytest

from debrief_stac._helpers import multihash_sha256_bytes
from debrief_stac.catalog import create_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot
from debrief_stac.thumbnails import store_thumbnail


@pytest.fixture
def catalog_with_plot(tmp_path: Path) -> tuple[Path, str]:
    catalog_path = tmp_path / "catalog"
    create_catalog(str(catalog_path), "Test Catalog")
    metadata = PlotMetadata(title="Test Plot")
    plot_id = create_plot(str(catalog_path), metadata, plot_id="plot-001")
    return catalog_path, plot_id


class TestStoreThumbnail:
    def test_store_writes_both_files(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        large = b"\x89PNG\r\nlarge thumbnail data"
        small = b"\x89PNG\r\nsmall thumbnail data"

        store_thumbnail(str(catalog_path), plot_id, large, small)

        # New naming per spec 241: thumbnail.png is the small (200x150) and
        # overview.png is the large (800x600).
        small_path = catalog_path / plot_id / "thumbnail.png"
        large_path = catalog_path / plot_id / "overview.png"
        assert small_path.exists()
        assert large_path.exists()
        assert small_path.read_bytes() == small
        assert large_path.read_bytes() == large

    def test_legacy_thumbnail_sm_filename_not_written(
        self, catalog_with_plot: tuple[Path, str]
    ) -> None:
        catalog_path, plot_id = catalog_with_plot
        store_thumbnail(str(catalog_path), plot_id, b"large", b"small")
        assert not (catalog_path / plot_id / "thumbnail-sm.png").exists()

    def test_store_updates_item_assets(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        item = store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        # Small variant lives at assets.thumbnail with proj:shape [150, 200]
        thumb = item["assets"]["thumbnail"]
        assert thumb["href"] == "./thumbnail.png"
        assert thumb["type"] == "image/png"
        assert thumb["roles"] == ["thumbnail"]
        assert thumb["proj:shape"] == [150, 200]
        assert thumb["file:size"] == len(b"small")
        assert thumb["file:checksum"] == multihash_sha256_bytes(b"small")

        # Large variant lives at assets.overview with proj:shape [600, 800]
        overview = item["assets"]["overview"]
        assert overview["href"] == "./overview.png"
        assert overview["type"] == "image/png"
        assert overview["roles"] == ["overview"]
        assert overview["proj:shape"] == [600, 800]
        assert overview["file:size"] == len(b"large")
        assert overview["file:checksum"] == multihash_sha256_bytes(b"large")

        # Legacy small key dropped.
        assert "thumbnail-sm" not in item["assets"]

    def test_overwrite_existing_thumbnails(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot

        store_thumbnail(str(catalog_path), plot_id, b"first-large", b"first-small")
        store_thumbnail(str(catalog_path), plot_id, b"second-large", b"second-small")

        small_path = catalog_path / plot_id / "thumbnail.png"
        large_path = catalog_path / plot_id / "overview.png"
        assert small_path.read_bytes() == b"second-small"
        assert large_path.read_bytes() == b"second-large"

    def test_persisted_to_item_json(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        item = read_plot(str(catalog_path), plot_id)
        assert "thumbnail" in item["assets"]
        assert "overview" in item["assets"]
        assert "thumbnail-sm" not in item["assets"]

    def test_no_derived_from_links(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        item = store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        derived_links = [link for link in item["links"] if link["rel"] == "derived_from"]
        assert len(derived_links) == 0

    def test_drops_pre_existing_thumbnail_sm_key(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        # Simulate an item written by an earlier code path with the legacy key.
        from debrief_stac.plot import _save_plot

        item = read_plot(str(catalog_path), plot_id)
        item["assets"]["thumbnail-sm"] = {
            "href": "./thumbnail-sm.png",
            "type": "image/png",
            "roles": ["thumbnail"],
        }
        _save_plot(str(catalog_path), plot_id, item)

        store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        item = read_plot(str(catalog_path), plot_id)
        assert "thumbnail-sm" not in item["assets"]
