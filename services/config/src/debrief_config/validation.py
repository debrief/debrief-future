"""STAC catalog validation for debrief-config.

Performs structural validation to ensure a path contains a valid STAC catalog.
This is done offline without network calls per Constitution Article I.
"""

import json
from pathlib import Path

from .exceptions import InvalidCatalogError

# Required fields per STAC Catalog specification
REQUIRED_FIELDS = {"type", "stac_version", "id", "description", "links"}


def validate_stac_catalog(path: Path | str) -> None:
    """Validate that a path contains a valid STAC catalog.

    Checks for:
    1. Existence of catalog.json
    2. Valid JSON format
    3. Required fields present
    4. type == "Catalog"
    5. links is an array

    Args:
        path: Path to the catalog directory.

    Raises:
        InvalidCatalogError: If validation fails.
    """
    catalog_path = Path(path)
    catalog_json = catalog_path / "catalog.json"

    # Check catalog.json exists
    if not catalog_json.exists():
        raise InvalidCatalogError(str(path), "No catalog.json found")

    # Check valid JSON
    try:
        data = json.loads(catalog_json.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise InvalidCatalogError(str(path), f"Invalid JSON: {e}") from e

    # Check it's a dictionary
    if not isinstance(data, dict):
        raise InvalidCatalogError(str(path), "catalog.json must be a JSON object")

    # Check required fields
    missing = REQUIRED_FIELDS - set(data.keys())
    if missing:
        raise InvalidCatalogError(str(path), f"Missing required fields: {missing}")

    # Check type is Catalog
    if data.get("type") != "Catalog":
        raise InvalidCatalogError(
            str(path), f"type must be 'Catalog', got '{data.get('type')}'"
        )

    # Check links is an array
    if not isinstance(data.get("links"), list):
        raise InvalidCatalogError(str(path), "links must be an array")
