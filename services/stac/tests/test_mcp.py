"""Tests for MCP tool exposure (User Story 7)."""

import json
from pathlib import Path
from typing import Any

import pytest

from debrief_stac.mcp_server import mcp, TOOL_NAMES


class TestMCPToolRegistration:
    """Tests for MCP tool registration."""

    def test_mcp_server_has_tools(self) -> None:
        """Test that MCP server has tools registered."""
        # FastMCP stores tools internally
        assert mcp is not None

    def test_create_catalog_tool_registered(self) -> None:
        """Test that create_catalog tool is registered."""
        assert "create_catalog" in TOOL_NAMES

    def test_create_plot_tool_registered(self) -> None:
        """Test that create_plot tool is registered."""
        assert "create_plot" in TOOL_NAMES

    def test_read_plot_tool_registered(self) -> None:
        """Test that read_plot tool is registered."""
        assert "read_plot" in TOOL_NAMES

    def test_add_features_tool_registered(self) -> None:
        """Test that add_features tool is registered."""
        assert "add_features" in TOOL_NAMES

    def test_add_asset_tool_registered(self) -> None:
        """Test that add_asset tool is registered."""
        assert "add_asset" in TOOL_NAMES

    def test_list_plots_tool_registered(self) -> None:
        """Test that list_plots tool is registered."""
        assert "list_plots" in TOOL_NAMES


class TestMCPCreateCatalogTool:
    """Tests for create_catalog MCP tool."""

    def test_create_catalog_tool_returns_path(self, tmp_path: Path) -> None:
        """Test that create_catalog tool returns the catalog path."""
        from debrief_stac.mcp_server import mcp_create_catalog

        result = mcp_create_catalog(
            path=str(tmp_path / "new_catalog"),
            catalog_id="test-catalog",
            description="Test catalog",
        )

        assert "path" in result
        assert Path(result["path"]).exists()
        assert (Path(result["path"]) / "catalog.json").exists()

    def test_create_catalog_tool_with_existing_fails(self, tmp_path: Path) -> None:
        """Test that create_catalog returns error for existing catalog."""
        from debrief_stac.mcp_server import mcp_create_catalog

        catalog_path = tmp_path / "existing"
        catalog_path.mkdir()
        (catalog_path / "catalog.json").write_text("{}")

        result = mcp_create_catalog(path=str(catalog_path))

        assert "error" in result
        assert "exists" in result["error"].lower()


class TestMCPErrorResponses:
    """Tests for MCP error responses with validation details."""

    def test_read_plot_not_found_error(self, tmp_path: Path) -> None:
        """Test that read_plot returns structured error for non-existent plot."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import mcp_read_plot

        catalog_path = create_catalog(tmp_path / "catalog")

        result = mcp_read_plot(
            catalog_path=str(catalog_path),
            plot_id="nonexistent",
        )

        assert "error" in result
        assert "not found" in result["error"].lower()

    def test_add_features_invalid_geojson_error(self, tmp_path: Path) -> None:
        """Test that add_features returns error for invalid GeoJSON."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.mcp_server import mcp_add_features
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test Plot")
        plot_id = create_plot(catalog_path, metadata)

        # Invalid feature (missing geometry)
        result = mcp_add_features(
            catalog_path=str(catalog_path),
            plot_id=plot_id,
            features=[{"type": "Feature", "properties": {}}],  # Missing geometry
        )

        assert "error" in result
        assert "geometry" in result["error"].lower() or "invalid" in result["error"].lower()


class TestMCPToolIntegration:
    """Integration tests for MCP tools working together."""

    def test_full_workflow_via_mcp(self, tmp_path: Path) -> None:
        """Test complete workflow using only MCP tools."""
        from debrief_stac.mcp_server import (
            mcp_add_features,
            mcp_create_catalog,
            mcp_create_plot,
            mcp_list_plots,
            mcp_read_plot,
        )

        # Create catalog
        catalog_result = mcp_create_catalog(
            path=str(tmp_path / "mcp_catalog"),
            catalog_id="mcp-test",
        )
        assert "path" in catalog_result
        catalog_path = catalog_result["path"]

        # Create plot
        plot_result = mcp_create_plot(
            catalog_path=catalog_path,
            title="MCP Test Plot",
            description="Created via MCP",
        )
        assert "plot_id" in plot_result
        plot_id = plot_result["plot_id"]

        # Add features
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [0, 0]},
                "properties": {"name": "Test Point"},
            }
        ]
        add_result = mcp_add_features(
            catalog_path=catalog_path,
            plot_id=plot_id,
            features=features,
        )
        assert "feature_count" in add_result
        assert add_result["feature_count"] == 1

        # Read plot back
        read_result = mcp_read_plot(
            catalog_path=catalog_path,
            plot_id=plot_id,
        )
        assert "item" in read_result
        assert read_result["item"]["id"] == plot_id

        # List plots
        list_result = mcp_list_plots(catalog_path=catalog_path)
        assert "plots" in list_result
        assert len(list_result["plots"]) == 1
        assert list_result["plots"][0]["id"] == plot_id
