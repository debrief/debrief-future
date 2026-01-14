"""
JSON-RPC CLI interface for debrief-stac.

Reads JSON-RPC 2.0 requests from stdin and writes responses to stdout.
Used by Electron app for STAC catalog operations.
"""

import json
import sys
from typing import Any

from debrief_stac.assets import add_asset
from debrief_stac.catalog import create_catalog, list_plots
from debrief_stac.exceptions import (
    CatalogExistsError,
    CatalogNotFoundError,
    PlotNotFoundError,
)
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot

# Configured store paths (set by configure method)
_configured_stores: list[str] = []


def handle_configure(params: dict[str, Any]) -> dict[str, Any]:
    """Handle configure method - stores catalog paths for later use.

    Args:
        params: {"stores": list[str]}

    Returns:
        {"configured": int}
    """
    global _configured_stores
    stores = params.get("stores", [])
    _configured_stores = list(stores)
    return {"configured": len(_configured_stores)}


def handle_list_plots(params: dict[str, Any]) -> dict[str, Any]:
    """Handle list_plots method.

    Args:
        params: {"store_path": str}

    Returns:
        {"plots": [...]}
    """
    store_path = params.get("store_path")
    if not store_path:
        raise ValueError("Missing required parameter: store_path")

    plots = list_plots(store_path)

    return {
        "plots": [
            {
                "id": p.id,
                "name": p.title,
                "description": None,  # Not in PlotSummary
                "created": p.timestamp.isoformat(),
                "modified": p.timestamp.isoformat(),  # Use same timestamp
                "feature_count": p.feature_count,
            }
            for p in plots
        ]
    }


def handle_create_plot(params: dict[str, Any]) -> dict[str, Any]:
    """Handle create_plot method.

    Args:
        params: {"store_path": str, "name": str, "description": str | None}

    Returns:
        {"plot_id": str, "name": str, "created": str}
    """
    store_path = params.get("store_path")
    name = params.get("name")
    description = params.get("description")

    if not store_path:
        raise ValueError("Missing required parameter: store_path")
    if not name:
        raise ValueError("Missing required parameter: name")

    metadata = PlotMetadata(title=name, description=description)
    plot_id = create_plot(store_path, metadata)

    return {
        "plot_id": plot_id,
        "name": name,
        "created": metadata.timestamp.isoformat(),
    }


def handle_add_features(params: dict[str, Any]) -> dict[str, Any]:
    """Handle add_features method.

    Args:
        params: {
            "store_path": str,
            "plot_id": str,
            "features": list,
            "provenance": {
                "source_path": str,
                "source_hash": str,
                "parser": str,
                "parser_version": str,
                "timestamp": str
            }
        }

    Returns:
        {"plot_id": str, "features_added": int, "provenance_id": str}
    """
    store_path = params.get("store_path")
    plot_id = params.get("plot_id")
    features = params.get("features", [])
    provenance = params.get("provenance", {})

    if not store_path:
        raise ValueError("Missing required parameter: store_path")
    if not plot_id:
        raise ValueError("Missing required parameter: plot_id")

    # Add features to plot
    add_features(store_path, plot_id, features)

    # Generate provenance ID (hash of source info)
    import hashlib

    prov_str = f"{provenance.get('source_path', '')}-{provenance.get('timestamp', '')}"
    provenance_id = hashlib.md5(prov_str.encode()).hexdigest()[:12]

    return {
        "plot_id": plot_id,
        "features_added": len(features),
        "provenance_id": provenance_id,
    }


def handle_copy_asset(params: dict[str, Any]) -> dict[str, Any]:
    """Handle copy_asset method.

    Args:
        params: {
            "store_path": str,
            "plot_id": str,
            "source_path": str,
            "asset_role": str
        }

    Returns:
        {"asset_path": str, "asset_href": str}
    """
    store_path = params.get("store_path")
    plot_id = params.get("plot_id")
    source_path = params.get("source_path")
    asset_role = params.get("asset_role", "source-data")

    if not store_path:
        raise ValueError("Missing required parameter: store_path")
    if not plot_id:
        raise ValueError("Missing required parameter: plot_id")
    if not source_path:
        raise ValueError("Missing required parameter: source_path")

    # Build asset path from catalog structure
    from pathlib import Path

    # Generate unique asset key from role and filename stem
    # e.g., "source-data-boat1" for boat1.rep with role "source-data"
    source_filename = Path(source_path).stem
    asset_key = f"{asset_role}-{source_filename}"

    add_asset(store_path, plot_id, source_path, asset_key=asset_key)

    asset_href = f"./assets/{Path(source_path).name}"
    full_path = str(Path(store_path) / plot_id / "assets" / Path(source_path).name)

    return {
        "asset_path": full_path,
        "asset_href": asset_href,
    }


def handle_init_catalog(params: dict[str, Any]) -> dict[str, Any]:
    """Handle init_catalog method.

    Args:
        params: {"path": str, "name": str}

    Returns:
        {"path": str, "created": bool}
    """
    path = params.get("path")
    name = params.get("name")

    if not path:
        raise ValueError("Missing required parameter: path")
    if not name:
        raise ValueError("Missing required parameter: name")

    # Use directory name as catalog_id (default), user's name as title
    create_catalog(path, title=name)

    return {
        "path": path,
        "created": True,
    }


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    """Handle a JSON-RPC request and return the response.

    Args:
        request: JSON-RPC 2.0 request object

    Returns:
        JSON-RPC 2.0 response object
    """
    request_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})

    method_handlers = {
        "configure": handle_configure,
        "list_plots": handle_list_plots,
        "create_plot": handle_create_plot,
        "add_features": handle_add_features,
        "copy_asset": handle_copy_asset,
        "init_catalog": handle_init_catalog,
    }

    try:
        handler = method_handlers.get(method)
        if handler is None:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}",
                },
            }

        result = handler(params)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result,
        }

    except CatalogNotFoundError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32000,
                "message": str(e),
                "data": {"type": "CatalogNotFoundError"},
            },
        }
    except CatalogExistsError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32001,
                "message": str(e),
                "data": {"type": "CatalogExistsError"},
            },
        }
    except PlotNotFoundError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32002,
                "message": str(e),
                "data": {"type": "PlotNotFoundError"},
            },
        }
    except FileNotFoundError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32003,
                "message": str(e),
                "data": {"type": "FileNotFoundError"},
            },
        }
    except ValueError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32602,
                "message": str(e),
                "data": {"type": "ValueError"},
            },
        }
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32603,
                "message": f"Internal error: {e}",
            },
        }


def main() -> None:
    """Main entry point for CLI.

    Reads JSON-RPC requests from stdin, one per line.
    Writes JSON-RPC responses to stdout, one per line.
    """
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": f"Parse error: {e}",
                },
            }
            print(json.dumps(response), flush=True)
            continue

        response = handle_request(request)
        print(json.dumps(response), flush=True)


if __name__ == "__main__":
    main()
