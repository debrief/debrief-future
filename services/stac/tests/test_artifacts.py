"""Tests for artifact storage."""


import pytest

from debrief_stac.artifacts import store_artifact
from debrief_stac.catalog import create_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot


@pytest.fixture
def catalog_with_plot(tmp_path):
    catalog_path = tmp_path / "catalog"
    create_catalog(str(catalog_path), "Test Catalog")
    metadata = PlotMetadata(title="Test Plot")
    plot_id = create_plot(str(catalog_path), metadata, plot_id="plot-001")
    return catalog_path, plot_id


class TestStoreArtifact:
    def test_store_image(self, catalog_with_plot):
        catalog_path, plot_id = catalog_with_plot
        data = b"\x89PNG\r\ntest image data"
        item = store_artifact(
            str(catalog_path), plot_id, data,
            "./results/bt_plot.png", "image/png", "BT Plot"
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

    def test_store_json_artifact(self, catalog_with_plot):
        catalog_path, plot_id = catalog_with_plot
        data = b'{"report": "summary"}'
        item = store_artifact(
            str(catalog_path), plot_id, data,
            "./results/report.json", "application/json", "Report"
        )
        assert "result-report" in item["assets"]

    def test_invalid_href_raises(self, catalog_with_plot):
        catalog_path, plot_id = catalog_with_plot
        with pytest.raises(ValueError, match="href must start with"):
            store_artifact(
                str(catalog_path), plot_id, b"data",
                "./data/file.txt", "text/plain", "Bad path"
            )

    def test_persisted_to_item_json(self, catalog_with_plot):
        catalog_path, plot_id = catalog_with_plot
        store_artifact(
            str(catalog_path), plot_id, b"data",
            "./results/file.txt", "text/plain", "Test"
        )
        item = read_plot(str(catalog_path), plot_id)
        assert "result-file" in item["assets"]
