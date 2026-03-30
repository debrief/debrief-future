"""Tests for thumbnail storage."""

from pathlib import Path

import pytest

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

        large_path = catalog_path / plot_id / "thumbnail.png"
        small_path = catalog_path / plot_id / "thumbnail-sm.png"
        assert large_path.exists()
        assert small_path.exists()
        assert large_path.read_bytes() == large
        assert small_path.read_bytes() == small

    def test_store_updates_item_assets(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        item = store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        assert "thumbnail" in item["assets"]
        thumb = item["assets"]["thumbnail"]
        assert thumb["href"] == "./thumbnail.png"
        assert thumb["type"] == "image/png"
        assert thumb["title"] == "Plot thumbnail"
        assert thumb["roles"] == ["thumbnail"]

        assert "thumbnail-sm" in item["assets"]
        thumb_sm = item["assets"]["thumbnail-sm"]
        assert thumb_sm["href"] == "./thumbnail-sm.png"
        assert thumb_sm["type"] == "image/png"
        assert thumb_sm["title"] == "Plot thumbnail (small)"
        assert thumb_sm["roles"] == ["thumbnail"]

    def test_overwrite_existing_thumbnails(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot

        store_thumbnail(str(catalog_path), plot_id, b"first-large", b"first-small")
        store_thumbnail(str(catalog_path), plot_id, b"second-large", b"second-small")

        large_path = catalog_path / plot_id / "thumbnail.png"
        small_path = catalog_path / plot_id / "thumbnail-sm.png"
        assert large_path.read_bytes() == b"second-large"
        assert small_path.read_bytes() == b"second-small"

    def test_persisted_to_item_json(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        item = read_plot(str(catalog_path), plot_id)
        assert "thumbnail" in item["assets"]
        assert "thumbnail-sm" in item["assets"]

    def test_no_derived_from_links(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        item = store_thumbnail(str(catalog_path), plot_id, b"large", b"small")

        derived_links = [link for link in item["links"] if link["rel"] == "derived_from"]
        assert len(derived_links) == 0
