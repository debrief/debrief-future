"""
Catalog commands for debrief-cli.

Provides access to STAC catalog browsing functionality via debrief-stac.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click

from debrief_cli.context import Context, pass_context


def _get_config_path() -> Path:
    """Get the XDG config path for Debrief."""
    import os

    xdg_config = os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")
    return Path(xdg_config) / "debrief" / "config.json"


def _load_stores() -> dict[str, dict]:
    """Load store configuration from XDG config."""
    config_path = _get_config_path()
    if config_path.exists():
        try:
            with open(config_path) as f:
                config = json.load(f)
            return config.get("stores", {})
        except Exception:
            pass
    return {}


@click.group()
def catalog() -> None:
    """Browse STAC catalogs."""
    pass


@catalog.command("stores")
@pass_context
def list_stores(ctx: Context) -> None:
    """
    List configured STAC stores.

    Reads store configuration from XDG config directory.
    """
    formatter = ctx.get_formatter()

    try:
        stores = _load_stores()

        if ctx.json_mode:
            formatter.json_output({"stores": list(stores.keys()), "count": len(stores)})
        else:
            if not stores:
                formatter.info("No STAC stores configured.")
                formatter.info(f"Add stores to: {_get_config_path()}")
            else:
                rows = []
                for name, config in stores.items():
                    store_type = config.get("type", "local")
                    path = config.get("path", config.get("url", "N/A"))
                    rows.append([name, store_type, path])
                formatter.table(["Name", "Type", "Location"], rows)

        formatter.finish()

    except Exception as e:
        formatter.error(str(e), "STORE_ERROR")
        formatter.finish()
        sys.exit(5)


@catalog.command("list")
@click.option("--store", required=True, help="Store name")
@pass_context
def list_items(ctx: Context, store: str) -> None:
    """
    List items in a STAC catalog.

    Lists all plots in the specified store using debrief-stac.
    """
    formatter = ctx.get_formatter()

    try:
        stores = _load_stores()

        if store not in stores:
            formatter.error(f"Store '{store}' not found", "STORE_NOT_FOUND")
            formatter.finish()
            sys.exit(5)

        store_config = stores[store]
        store_path = store_config.get("path")

        if not store_path:
            formatter.error(f"Store '{store}' has no path configured", "STORE_CONFIG_ERROR")
            formatter.finish()
            sys.exit(5)

        from debrief_stac.catalog import list_plots
        from debrief_stac.exceptions import CatalogNotFoundError

        try:
            plots = list_plots(store_path)
        except CatalogNotFoundError:
            formatter.error(f"No STAC catalog found at: {store_path}", "CATALOG_NOT_FOUND")
            formatter.finish()
            sys.exit(5)

        if ctx.json_mode:
            formatter.json_output(
                {
                    "store": store,
                    "items": [
                        {
                            "id": p.id,
                            "title": p.title,
                            "datetime": p.timestamp.isoformat(),
                            "feature_count": p.feature_count,
                        }
                        for p in plots
                    ],
                    "count": len(plots),
                }
            )
        else:
            formatter.info(f"Store: {store} ({store_path})")
            if not plots:
                formatter.info("No plots found.")
            else:
                rows = [
                    [p.id, p.title, p.timestamp.strftime("%Y-%m-%d %H:%M"), str(p.feature_count)]
                    for p in plots
                ]
                formatter.table(["ID", "Title", "Date", "Features"], rows)

        formatter.finish()

    except Exception as e:
        formatter.error(str(e), "LIST_ERROR")
        formatter.finish()
        sys.exit(4)


@catalog.command("get")
@click.option("--store", required=True, help="Store name")
@click.option("--item", required=True, help="Item ID")
@pass_context
def get_item(ctx: Context, store: str, item: str) -> None:
    """
    Get a specific item from a STAC catalog.

    Reads a plot from the specified store using debrief-stac.
    """
    formatter = ctx.get_formatter()

    try:
        stores = _load_stores()

        if store not in stores:
            formatter.error(f"Store '{store}' not found", "STORE_NOT_FOUND")
            formatter.finish()
            sys.exit(5)

        store_config = stores[store]
        store_path = store_config.get("path")

        if not store_path:
            formatter.error(f"Store '{store}' has no path configured", "STORE_CONFIG_ERROR")
            formatter.finish()
            sys.exit(5)

        from debrief_stac.exceptions import CatalogNotFoundError, PlotNotFoundError
        from debrief_stac.plot import read_plot

        try:
            item_data = read_plot(store_path, item)
        except CatalogNotFoundError:
            formatter.error(f"No STAC catalog found at: {store_path}", "CATALOG_NOT_FOUND")
            formatter.finish()
            sys.exit(5)
        except PlotNotFoundError:
            formatter.error(f"Item '{item}' not found in store '{store}'", "ITEM_NOT_FOUND")
            formatter.finish()
            sys.exit(4)

        if ctx.json_mode:
            formatter.json_output(item_data)
        else:
            title = item_data.get("properties", {}).get("title", "Untitled")
            datetime_str = item_data.get("properties", {}).get("datetime", "N/A")
            formatter.info(f"Store: {store}")
            formatter.info(f"Item: {item}")
            formatter.info(f"Title: {title}")
            formatter.info(f"Datetime: {datetime_str}")

            assets = item_data.get("assets", {})
            if assets:
                formatter.info(f"Assets: {len(assets)}")
                for key, asset in assets.items():
                    media_type = asset.get("type", "unknown")
                    formatter.info(f"  {key}: {media_type}")

        formatter.finish()

    except Exception as e:
        formatter.error(str(e), "GET_ERROR")
        formatter.finish()
        sys.exit(4)
