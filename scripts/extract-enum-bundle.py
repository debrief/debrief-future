#!/usr/bin/env python3
"""Extract a compact enum bundle from the platform registry and sample catalog.

Produces ``shared/data/enum-bundle.json`` (by default) — the deterministic
controlled-vocabulary artefact consumed by the LLM prompt builder in item
#188. Re-run the script (and commit the regenerated file) whenever the
registry, the sample catalog, or the extraction logic changes.

Usage
-----
::

    # Standard run (from the repository root) — writes shared/data/enum-bundle.json
    uv run python scripts/extract-enum-bundle.py

    # With custom paths (used by tests and fixture experiments)
    uv run python scripts/extract-enum-bundle.py \\
        --registry path/to/registry.json \\
        --catalog  path/to/local-store \\
        --output   /tmp/test-bundle.json

Exit codes
----------
0  Success.
1  Missing/unreadable input (registry file or catalog directory).
2  Malformed registry JSON.

See ``specs/187-build-time-enums/quickstart.md`` for the full usage guide.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from debrief_data import build_bundle, load_registry, serialize
from debrief_data.registry import RegistryError

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = REPO_ROOT / "shared/data/platform-registry.json"
DEFAULT_CATALOG = REPO_ROOT / "preview/workspace/samples/local-store"
DEFAULT_OUTPUT = REPO_ROOT / "shared/data/enum-bundle.json"


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="extract-enum-bundle",
        description="Extract a compact enum bundle for the LLM prompt builder.",
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=DEFAULT_REGISTRY,
        help=f"Platform registry JSON file (default: {DEFAULT_REGISTRY.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--catalog",
        type=Path,
        default=DEFAULT_CATALOG,
        help=f"STAC catalog directory (default: {DEFAULT_CATALOG.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Output bundle path (default: {DEFAULT_OUTPUT.relative_to(REPO_ROOT)})",
    )
    return parser.parse_args(argv)


def _count_class_nodes(tree: dict[str, object]) -> int:
    """Count interior (non-underscore) nodes in the projected class tree."""
    count = 0
    for key, value in tree.items():
        if key.startswith("_"):
            continue
        if isinstance(value, dict):
            count += 1
            count += _count_class_nodes(value)
    return count


def _log(message: str) -> None:
    print(f"[extract-enum-bundle] {message}")


def main(argv: list[str]) -> int:
    args = _parse_args(argv)
    registry_path: Path = args.registry
    catalog_path: Path = args.catalog
    output_path: Path = args.output

    if not registry_path.is_file():
        print(f"Registry file not found: {registry_path}", file=sys.stderr)
        return 1
    if not catalog_path.is_dir():
        print(f"Catalog directory not found: {catalog_path}", file=sys.stderr)
        return 1

    _log(f"reading registry: {registry_path}")
    try:
        registry = load_registry(registry_path)
    except RegistryError as exc:
        print(f"Invalid registry format ({registry_path}): {exc}", file=sys.stderr)
        return 2
    except FileNotFoundError as exc:
        # Should not happen because we checked is_file() above, but be explicit.
        print(str(exc), file=sys.stderr)
        return 1

    _log(f"reading catalog : {catalog_path}")
    bundle = build_bundle(registry, catalog_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(serialize(bundle), encoding="utf-8")
    _log(f"wrote           : {output_path}")
    print(f"  vessel-class nodes : {_count_class_nodes(bundle['vessel_class_tree'])}")
    print(f"  nationalities      : {len(bundle['nationalities'])}")
    print(f"  exercise names     : {len(bundle['exercise_names'])}")
    print(f"  tags               : {len(bundle['tags'])}")
    print(f"  feature tags       : {len(bundle['feature_tags'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
