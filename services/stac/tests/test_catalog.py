"""
Tests for catalog operations (User Story 1 & 6).

Following TDD: Write tests first, ensure they fail, then implement.
"""

import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog, list_plots, open_catalog
from debrief_stac.exceptions import CatalogExistsError, CatalogNotFoundError
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot
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


class TestListPlots:
    """Tests for list_plots() function - User Story 6."""

    def test_list_plots_returns_all_plots(self, temp_dir: Path) -> None:
        """T049: Given a catalog with multiple plots,
        When list_plots() is called, Then all plots are returned.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        # Create 3 plots
        create_plot(catalog_path, PlotMetadata(title="Plot 1"), plot_id="plot-1")
        create_plot(catalog_path, PlotMetadata(title="Plot 2"), plot_id="plot-2")
        create_plot(catalog_path, PlotMetadata(title="Plot 3"), plot_id="plot-3")

        plots = list_plots(catalog_path)

        assert len(plots) == 3
        plot_ids = [p.id for p in plots]
        assert "plot-1" in plot_ids
        assert "plot-2" in plot_ids
        assert "plot-3" in plot_ids

    def test_list_plots_empty_catalog(self, temp_dir: Path) -> None:
        """T050: Given an empty catalog,
        When list_plots() is called, Then empty list is returned.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        plots = list_plots(catalog_path)

        assert plots == []

    def test_list_plots_sorted_by_datetime_descending(self, temp_dir: Path) -> None:
        """T051: Given plots with varying dates,
        When listed, Then plots are sorted by datetime descending.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        # Create plots with specific datetimes
        now = datetime.now(UTC)
        old = now - timedelta(days=30)
        older = now - timedelta(days=60)

        create_plot(catalog_path, PlotMetadata(title="Old Plot", timestamp=old), plot_id="old")
        create_plot(
            catalog_path, PlotMetadata(title="Newest Plot", timestamp=now), plot_id="newest"
        )
        create_plot(
            catalog_path, PlotMetadata(title="Oldest Plot", timestamp=older), plot_id="oldest"
        )

        plots = list_plots(catalog_path)

        # Verify sorted newest first
        assert len(plots) == 3
        assert plots[0].id == "newest"
        assert plots[1].id == "old"
        assert plots[2].id == "oldest"

    def test_list_plots_includes_summary_info(self, temp_dir: Path) -> None:
        """list_plots returns PlotSummary with id, title, datetime."""
        catalog_path = create_catalog(temp_dir / "catalog")
        create_plot(
            catalog_path, PlotMetadata(title="Test Plot", description="A test"), plot_id="test-plot"
        )

        plots = list_plots(catalog_path)

        assert len(plots) == 1
        plot = plots[0]
        assert plot.id == "test-plot"
        assert plot.title == "Test Plot"
        assert plot.timestamp is not None
