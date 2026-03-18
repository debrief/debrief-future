"""
Tests for plot (STAC Item) operations (User Stories 2 & 3).

Following TDD: Write tests first, ensure they fail, then implement.
"""

import json
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.exceptions import PlotNotFoundError
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot
from debrief_stac.types import STAC_VERSION


class TestCreatePlot:
    """Tests for create_plot() function - User Story 2."""

    def test_create_plot_with_valid_metadata(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T018: Given an existing catalog and valid PlotMetadata,
        When create_plot() is called, Then a new STAC Item is created.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Verify plot ID returned
        assert plot_id is not None
        assert isinstance(plot_id, str)

        # Verify plot directory created
        plot_dir = catalog_path / plot_id
        assert plot_dir.exists()
        assert plot_dir.is_dir()

        # Verify item.json created with correct structure
        item_path = plot_dir / "item.json"
        assert item_path.exists()

        with open(item_path) as f:
            item_data = json.load(f)

        assert item_data["type"] == "Feature"
        assert item_data["stac_version"] == STAC_VERSION
        assert item_data["id"] == plot_id

    def test_create_plot_updates_catalog_links(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T019: Given a created plot, When catalog is read,
        Then plot appears in catalog links.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Re-read catalog
        catalog_data = open_catalog(catalog_path)

        # Verify item link added
        item_links = [link for link in catalog_data["links"] if link["rel"] == "item"]
        assert len(item_links) == 1
        assert plot_id in item_links[0]["href"]

    def test_create_plot_item_link_uses_plot_title(self, temp_dir: Path) -> None:
        """Item link in catalog carries human-readable plot title (#135)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Exercise Alpha 2024")

        create_plot(catalog_path, metadata, plot_id="ex-alpha-2024")

        catalog_data = open_catalog(catalog_path)
        item_links = [link for link in catalog_data["links"] if link["rel"] == "item"]
        assert len(item_links) == 1
        assert item_links[0]["title"] == "Exercise Alpha 2024"

    def test_create_plot_structural_links_have_titles(self, temp_dir: Path) -> None:
        """Structural links (root, parent, self) in item.json carry titles (#135)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="My Plot")

        plot_id = create_plot(catalog_path, metadata, plot_id="my-plot")

        item = read_plot(catalog_path, plot_id)
        links_by_rel = {link["rel"]: link for link in item["links"]}

        assert links_by_rel["root"]["title"] == "Root catalog"
        assert links_by_rel["parent"]["title"] == "Parent catalog"
        assert links_by_rel["self"]["title"] == "My Plot"

    def test_create_plot_with_title_and_description(self, temp_dir: Path) -> None:
        """T020: Given PlotMetadata with title and description,
        When plot is created, Then STAC Item properties include them.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="My Analysis", description="Detailed track analysis")

        plot_id = create_plot(catalog_path, metadata)

        # Read the item
        item_path = catalog_path / plot_id / "item.json"
        with open(item_path) as f:
            item_data = json.load(f)

        assert item_data["properties"]["title"] == "My Analysis"
        assert item_data["properties"]["description"] == "Detailed track analysis"
        assert "datetime" in item_data["properties"]

    def test_create_plot_with_custom_id(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """create_plot with custom plot_id uses that ID."""
        catalog_path = create_catalog(temp_dir / "catalog")

        plot_id = create_plot(catalog_path, sample_plot_metadata, plot_id="my-custom-plot")

        assert plot_id == "my-custom-plot"
        assert (catalog_path / "my-custom-plot" / "item.json").exists()

    def test_create_plot_rejects_invalid_custom_id(self, temp_dir: Path) -> None:
        """Custom plot IDs must match [a-z0-9_-] (#139)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Bad ID Plot")

        with pytest.raises(ValueError, match=r"\[a-z0-9_-\]"):
            create_plot(catalog_path, metadata, plot_id="Bad ID!")

    def test_create_plot_rejects_uppercase_id(self, temp_dir: Path) -> None:
        """Uppercase letters in custom plot IDs are rejected (#139)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Upper")

        with pytest.raises(ValueError):
            create_plot(catalog_path, metadata, plot_id="MyPlot")

    def test_create_plot_accepts_valid_custom_id(self, temp_dir: Path) -> None:
        """Valid custom IDs with lowercase, digits, underscores, hyphens pass (#139)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Good ID")

        plot_id = create_plot(catalog_path, metadata, plot_id="exercise-alpha_2024")
        assert plot_id == "exercise-alpha_2024"


class TestReadPlot:
    """Tests for read_plot() function - User Story 3."""

    def test_read_plot_returns_complete_item(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T025: Given an existing plot ID, When read_plot() is called,
        Then complete STAC Item is returned.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        item = read_plot(catalog_path, plot_id)

        assert item["type"] == "Feature"
        assert item["stac_version"] == STAC_VERSION
        assert item["id"] == plot_id
        assert "properties" in item
        assert "links" in item
        assert "assets" in item

    def test_read_plot_not_found_raises_error(self, temp_dir: Path) -> None:
        """T026: Given a non-existent plot ID, When read_plot() is called,
        Then raises PlotNotFoundError.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        with pytest.raises(PlotNotFoundError) as exc_info:
            read_plot(catalog_path, "nonexistent-plot")

        assert "nonexistent-plot" in str(exc_info.value)

    def test_read_plot_includes_asset_hrefs(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T027: Given a plot with assets, When read, Then asset hrefs are included."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        item = read_plot(catalog_path, plot_id)

        # Assets should be present (even if empty initially)
        assert "assets" in item
        assert isinstance(item["assets"], dict)
