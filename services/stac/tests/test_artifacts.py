"""Tests for artifact storage."""

from pathlib import Path

import pytest

from debrief_stac.artifacts import store_artifact
from debrief_stac.catalog import create_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot


@pytest.fixture
def catalog_with_plot(tmp_path: Path) -> tuple[Path, str]:
    catalog_path = tmp_path / "catalog"
    create_catalog(str(catalog_path), "Test Catalog")
    metadata = PlotMetadata(title="Test Plot")
    plot_id = create_plot(str(catalog_path), metadata, plot_id="plot-001")
    return catalog_path, plot_id


class TestStoreArtifact:
    def test_store_image(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        data = b"\x89PNG\r\ntest image data"
        item = store_artifact(
            str(catalog_path), plot_id, data, "./results/bt_plot.png", "image/png", "BT Plot"
        )

        # Check file written
        artifact_path = catalog_path / plot_id / "results" / "bt_plot.png"
        assert artifact_path.exists()
        assert artifact_path.read_bytes() == data

        # Check asset entry
        assert "result-bt_plot" in item["assets"]
        asset = item["assets"]["result-bt_plot"]
        assert asset["href"] == "./results/bt_plot.png"
        assert asset["type"] == "image/png"
        assert asset["title"] == "BT Plot"
        assert asset["roles"] == ["result"]

    def test_store_json_artifact(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        data = b'{"report": "summary"}'
        item = store_artifact(
            str(catalog_path), plot_id, data, "./results/report.json", "application/json", "Report"
        )
        assert "result-report" in item["assets"]

    def test_invalid_href_raises(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        with pytest.raises(ValueError, match="href must start with"):
            store_artifact(
                str(catalog_path), plot_id, b"data", "./data/file.txt", "text/plain", "Bad path"
            )

    def test_store_artifact_with_source_features_adds_derived_from(
        self, catalog_with_plot: tuple[Path, str]
    ) -> None:
        """store_artifact with source_feature_ids adds derived_from links (#138)."""
        catalog_path, plot_id = catalog_with_plot
        item = store_artifact(
            str(catalog_path),
            plot_id,
            b"data",
            "./results/output.json",
            "application/json",
            "Result",
            source_feature_ids=["track-a", "track-b"],
        )

        derived_links = [link for link in item["links"] if link["rel"] == "derived_from"]
        assert len(derived_links) == 2
        hrefs = {link["href"] for link in derived_links}
        assert "feature://track-a" in hrefs
        assert "feature://track-b" in hrefs

    def test_store_artifact_without_source_features_no_derived_from(
        self, catalog_with_plot: tuple[Path, str]
    ) -> None:
        """store_artifact without source_feature_ids adds no derived_from links."""
        catalog_path, plot_id = catalog_with_plot
        item = store_artifact(
            str(catalog_path), plot_id, b"data", "./results/out.txt", "text/plain", "Test"
        )
        derived_links = [link for link in item["links"] if link["rel"] == "derived_from"]
        assert len(derived_links) == 0

    def test_persisted_to_item_json(self, catalog_with_plot: tuple[Path, str]) -> None:
        catalog_path, plot_id = catalog_with_plot
        store_artifact(
            str(catalog_path), plot_id, b"data", "./results/file.txt", "text/plain", "Test"
        )
        item = read_plot(str(catalog_path), plot_id)
        assert "result-file" in item["assets"]
