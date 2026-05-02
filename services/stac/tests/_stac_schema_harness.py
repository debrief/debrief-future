"""Offline STAC 1.1.0 + GeoJSON schema validation harness.

Used by ``test_stac_validation.py`` to validate Items/Collections against the
vendored schemas under ``tests/fixtures/stac-schemas/`` with **zero network
access** — the existing network probe has been removed (research.md decision 9,
Article I.3 — no silent skips).

The harness wires ``jsonschema`` 4.x's ``Registry`` so that every external
``$ref`` (STAC schemas, GeoJSON Feature/Geometry) resolves to a vendored file.
Missing fixtures cause a loud failure rather than a silent network fetch.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT7

# Repo-root-relative location of the vendored schema tree.
_FIXTURES = Path(__file__).parent / "fixtures" / "stac-schemas"
_STAC_V1_1_0 = _FIXTURES / "v1.1.0"
_GEOJSON = _FIXTURES / "geojson"


_STAC_BASE_URL = "https://schemas.stacspec.org/v1.1.0"


def _build_url_map() -> dict[str, Path]:
    """Walk the vendored tree and infer URL → Path for every JSON schema file."""
    mapping: dict[str, Path] = {}
    if _STAC_V1_1_0.is_dir():
        for path in _STAC_V1_1_0.rglob("*.json"):
            rel = path.relative_to(_STAC_V1_1_0).as_posix()
            mapping[f"{_STAC_BASE_URL}/{rel}"] = path
    if _GEOJSON.is_dir():
        for path in _GEOJSON.glob("*.json"):
            mapping[f"https://geojson.org/schema/{path.name}"] = path
    return mapping


_URL_TO_PATH: dict[str, Path] = _build_url_map()


def assert_schemas_vendored() -> None:
    """Loud-fail if any vendored schema is missing.

    Defensive against a deleted fixture during review (T012).
    """
    missing: list[str] = []
    for url, path in _URL_TO_PATH.items():
        if not path.is_file() or path.stat().st_size == 0:
            missing.append(f"{url} → {path}")
    if missing:
        raise FileNotFoundError(
            "Vendored STAC/GeoJSON schemas missing or empty — re-run "
            "scripts/refresh-stac-schemas.sh.\n  " + "\n  ".join(missing)
        )


@lru_cache(maxsize=1)
def _registry() -> Registry:
    """Build a jsonschema Registry resolving every known external $ref."""
    assert_schemas_vendored()
    resources: list[tuple[str, Resource[Any]]] = []
    for url, path in _URL_TO_PATH.items():
        with open(path) as f:
            schema = json.load(f)
        resources.append((url, Resource(contents=schema, specification=DRAFT7)))
    return Registry().with_resources(resources)


def _validator(schema_url: str) -> Draft7Validator:
    """Build a Draft7Validator anchored at the given vendored schema URL."""
    schema_path = _URL_TO_PATH[schema_url]
    with open(schema_path) as f:
        schema = json.load(f)
    return Draft7Validator(schema, registry=_registry())


def validate_stac_item(item: dict[str, Any]) -> None:
    """Validate a STAC 1.1.0 Item dict; raise jsonschema.ValidationError on failure."""
    _validator("https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/item.json").validate(item)


def validate_stac_collection(collection: dict[str, Any]) -> None:
    """Validate a STAC 1.1.0 Collection dict; raise on failure."""
    _validator(
        "https://schemas.stacspec.org/v1.1.0/collection-spec/json-schema/collection.json"
    ).validate(collection)


def validate_stac_catalog(catalog: dict[str, Any]) -> None:
    """Validate a STAC 1.1.0 Catalog dict; raise on failure."""
    _validator(
        "https://schemas.stacspec.org/v1.1.0/catalog-spec/json-schema/catalog.json"
    ).validate(catalog)


def iter_item_validation_errors(item: dict[str, Any]) -> list[str]:
    """Return formatted error messages without raising. Useful for batch reports."""
    validator = _validator("https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/item.json")
    return [f"{'/'.join(str(p) for p in e.path)}: {e.message}" for e in validator.iter_errors(item)]


__all__ = [
    "assert_schemas_vendored",
    "iter_item_validation_errors",
    "validate_stac_catalog",
    "validate_stac_collection",
    "validate_stac_item",
]
