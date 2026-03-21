"""CLI entry point for legacy data import.

Usage:
    python -m debrief_io.cli.import_cmd SOURCE_DIR CATALOG_PATH [--title TITLE]

Example:
    python -m debrief_io.cli.import_cmd \\
        ~/debrief/org.mwc.cmap.combined.feature/root_installs/sample_data \\
        demo/catalog \\
        --title "Debrief Legacy Sample Data"
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path


def main() -> None:
    """CLI entry point for legacy data import."""
    parser = argparse.ArgumentParser(
        description="Import legacy Debrief sample data into a STAC catalog"
    )
    parser.add_argument("source_dir", type=Path, help="Path to legacy sample_data directory")
    parser.add_argument("catalog_path", type=Path, help="Path for output STAC catalog")
    parser.add_argument("--title", default="Debrief Legacy Sample Data", help="Catalog title")
    parser.add_argument(
        "--register",
        action="store_true",
        help="Register catalog with debrief-config so VS Code can discover it",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    from debrief_io.import_catalog import generate_report, import_legacy_data

    try:
        result = import_legacy_data(args.source_dir, args.catalog_path, args.title)
        print(generate_report(result))

        if args.register:
            from debrief_config import register_store
            from debrief_config.exceptions import StoreExistsError

            try:
                store = register_store(
                    args.catalog_path.resolve(),
                    args.title,
                    notes="Imported from legacy sample data",
                )
                print(f"Registered store: {store.path}")
            except StoreExistsError:
                print(f"Store already registered: {args.catalog_path.resolve()}")

        sys.exit(0 if result.files_failed == 0 else 1)
    except (FileNotFoundError, FileExistsError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
