"""
MCP Server for debrief-stac operations.

This module exposes all core debrief-stac operations as MCP tools
for VS Code extension and AI orchestration.

Usage:
    Run as MCP server:
        python -m debrief_stac.mcp_server

    Or use the entry point:
        debrief-stac-mcp
"""

from typing import Any, Optional

from mcp.server.fastmcp import FastMCP

from debrief_stac.catalog import create_catalog, list_plots, open_catalog
from debrief_stac.exceptions import (
    CatalogExistsError,
    CatalogNotFoundError,
    PlotNotFoundError,
)
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot

# Tool names for registration verification
TOOL_NAMES = [
    "create_catalog",
    "create_plot",
    "read_plot",
    "add_features",
    "add_asset",
    "list_plots",
]

# Create FastMCP server
mcp = FastMCP("debrief-stac")


def mcp_create_catalog(
    path: str,
    catalog_id: Optional[str] = None,
    description: str = "Debrief analysis catalog",
) -> dict[str, Any]:
    """Create a new local STAC catalog.

    Args:
        path: Directory path where the catalog will be created
        catalog_id: Unique identifier for the catalog (defaults to directory name)
        description: Human-readable description of the catalog

    Returns:
        Dictionary with 'path' key on success, 'error' key on failure
    """
    try:
        catalog_path = create_catalog(path, catalog_id, description)
        return {"path": str(catalog_path), "catalog_id": catalog_id or catalog_path.name}
    except CatalogExistsError as e:
        return {"error": f"Catalog already exists at {e.path}"}
    except PermissionError as e:
        return {"error": f"Permission denied: {e}"}
    except Exception as e:
        return {"error": str(e)}


def mcp_create_plot(
    catalog_path: str,
    title: str,
    description: Optional[str] = None,
    plot_id: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new plot (STAC Item) within a catalog.

    Args:
        catalog_path: Path to the catalog directory
        title: Human-readable title for the plot
        description: Optional detailed description
        plot_id: Optional custom ID (defaults to UUID)

    Returns:
        Dictionary with 'plot_id' key on success, 'error' key on failure
    """
    try:
        metadata = PlotMetadata(title=title, description=description)
        result_id = create_plot(catalog_path, metadata, plot_id)
        return {"plot_id": result_id, "catalog_path": catalog_path}
    except CatalogNotFoundError as e:
        return {"error": f"Catalog not found at {e.path}"}
    except Exception as e:
        return {"error": str(e)}


def mcp_read_plot(
    catalog_path: str,
    plot_id: str,
) -> dict[str, Any]:
    """Read a plot (STAC Item) from a catalog.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to read

    Returns:
        Dictionary with 'item' key containing STAC Item on success, 'error' key on failure
    """
    try:
        item = read_plot(catalog_path, plot_id)
        return {"item": item, "plot_id": plot_id}
    except PlotNotFoundError as e:
        return {"error": f"Plot '{e.plot_id}' not found in catalog at {e.catalog_path}"}
    except CatalogNotFoundError as e:
        return {"error": f"Catalog not found at {e.path}"}
    except Exception as e:
        return {"error": str(e)}


def mcp_add_features(
    catalog_path: str,
    plot_id: str,
    features: list[dict[str, Any]],
) -> dict[str, Any]:
    """Add GeoJSON features to a plot's FeatureCollection asset.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to add features to
        features: List of GeoJSON Feature dictionaries

    Returns:
        Dictionary with 'feature_count' on success, 'error' key on failure
    """
    try:
        count = add_features(catalog_path, plot_id, features)
        return {"feature_count": count, "plot_id": plot_id}
    except PlotNotFoundError as e:
        return {"error": f"Plot '{e.plot_id}' not found in catalog at {e.catalog_path}"}
    except ValueError as e:
        return {"error": f"Invalid feature: {e}"}
    except Exception as e:
        return {"error": str(e)}


def mcp_add_asset(
    catalog_path: str,
    plot_id: str,
    source_path: str,
    asset_key: Optional[str] = None,
    media_type: Optional[str] = None,
) -> dict[str, Any]:
    """Add a source file as an asset to a plot.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to add asset to
        source_path: Path to the source file to copy
        asset_key: Optional key for the asset (defaults to filename)
        media_type: Optional MIME type (auto-detected if not provided)

    Returns:
        Dictionary with 'asset_key' on success, 'error' key on failure
    """
    try:
        from debrief_stac.assets import add_asset

        key = add_asset(catalog_path, plot_id, source_path, asset_key, media_type)
        return {"asset_key": key, "plot_id": plot_id}
    except PlotNotFoundError as e:
        return {"error": f"Plot '{e.plot_id}' not found in catalog at {e.catalog_path}"}
    except FileNotFoundError as e:
        return {"error": f"Source file not found: {e}"}
    except Exception as e:
        return {"error": str(e)}


def mcp_list_plots(catalog_path: str) -> dict[str, Any]:
    """List all plots in a catalog with summary information.

    Args:
        catalog_path: Path to the catalog directory

    Returns:
        Dictionary with 'plots' list on success, 'error' key on failure
    """
    try:
        summaries = list_plots(catalog_path)
        plots = [
            {
                "id": s.id,
                "title": s.title,
                "datetime": s.timestamp.isoformat(),
                "feature_count": s.feature_count,
            }
            for s in summaries
        ]
        return {"plots": plots, "count": len(plots)}
    except CatalogNotFoundError as e:
        return {"error": f"Catalog not found at {e.path}"}
    except Exception as e:
        return {"error": str(e)}


# Register tools with FastMCP using decorators
@mcp.tool()
def create_catalog_tool(
    path: str,
    catalog_id: Optional[str] = None,
    description: str = "Debrief analysis catalog",
) -> dict[str, Any]:
    """Create a new local STAC catalog at the specified path.

    Args:
        path: Directory path where the catalog will be created
        catalog_id: Unique identifier for the catalog (defaults to directory name)
        description: Human-readable description of the catalog

    Returns:
        Dictionary with catalog path and ID on success, error details on failure
    """
    return mcp_create_catalog(path, catalog_id, description)


@mcp.tool()
def create_plot_tool(
    catalog_path: str,
    title: str,
    description: Optional[str] = None,
    plot_id: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new plot (STAC Item) within an existing catalog.

    Args:
        catalog_path: Path to the catalog directory
        title: Human-readable title for the plot
        description: Optional detailed description
        plot_id: Optional custom ID (defaults to auto-generated UUID)

    Returns:
        Dictionary with plot ID on success, error details on failure
    """
    return mcp_create_plot(catalog_path, title, description, plot_id)


@mcp.tool()
def read_plot_tool(
    catalog_path: str,
    plot_id: str,
) -> dict[str, Any]:
    """Read a plot (STAC Item) from a catalog by ID.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to read

    Returns:
        Dictionary with STAC Item data on success, error details on failure
    """
    return mcp_read_plot(catalog_path, plot_id)


@mcp.tool()
def add_features_tool(
    catalog_path: str,
    plot_id: str,
    features: list[dict[str, Any]],
) -> dict[str, Any]:
    """Add GeoJSON features to a plot's FeatureCollection asset.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to add features to
        features: List of GeoJSON Feature dictionaries with geometry and properties

    Returns:
        Dictionary with feature count on success, error details on failure
    """
    return mcp_add_features(catalog_path, plot_id, features)


@mcp.tool()
def add_asset_tool(
    catalog_path: str,
    plot_id: str,
    source_path: str,
    asset_key: Optional[str] = None,
    media_type: Optional[str] = None,
) -> dict[str, Any]:
    """Add a source file as an asset to a plot with provenance tracking.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to add asset to
        source_path: Path to the source file to copy
        asset_key: Optional key for the asset (defaults to filename)
        media_type: Optional MIME type (auto-detected if not provided)

    Returns:
        Dictionary with asset key on success, error details on failure
    """
    return mcp_add_asset(catalog_path, plot_id, source_path, asset_key, media_type)


@mcp.tool()
def list_plots_tool(catalog_path: str) -> dict[str, Any]:
    """List all plots in a catalog with summary information.

    Args:
        catalog_path: Path to the catalog directory

    Returns:
        Dictionary with list of plot summaries sorted by datetime (newest first)
    """
    return mcp_list_plots(catalog_path)


def main() -> None:
    """Run the MCP server."""
    mcp.run()


if __name__ == "__main__":
    main()
