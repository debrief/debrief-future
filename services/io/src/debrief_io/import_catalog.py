"""Batch import pipeline for legacy Debrief sample data.

Imports REP, DPF, and DSF files from a source directory into a
STAC catalog with one plot per source file.
"""

from __future__ import annotations

import logging
import re
import time
from pathlib import Path
from typing import Any

from debrief_io.models import ImportFileError, ImportResult, ImportWarning
from debrief_io.parser import parse

logger = logging.getLogger(__name__)

# Supported extensions for import
_SUPPORTED_EXTENSIONS = {".rep", ".dpf", ".dsf"}

# Category mapping from legacy directory structure
_CATEGORY_MAP: dict[str, str] = {
    "demo": "demo",
    "multipath": "multi-path",
    "multistatics": "multi-static",
    "s2r": "s2r",
    "satc": "satc",
    "satc_test": "satc-test",
}


def _slugify(name: str) -> str:
    """Convert a filename to a kebab-case slug for use as plot ID."""
    stem = Path(name).stem
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()
    return slug


def _detect_category(file_path: Path, source_dir: Path) -> str:
    """Detect scenario category from directory structure."""
    try:
        relative = file_path.parent.relative_to(source_dir)
        parts = [p.lower() for p in relative.parts]
    except ValueError:
        return "general"

    for part in parts:
        if part in _CATEGORY_MAP:
            return _CATEGORY_MAP[part]

    return "general"


def _count_feature_kinds(features: list[dict[str, Any]]) -> tuple[int, int, int]:
    """Count tracks, sensors, and narratives in a feature list."""
    tracks = 0
    sensors = 0
    narratives = 0
    for f in features:
        kind = f.get("properties", {}).get("kind", "")
        if kind == "TRACK":
            tracks += 1
        elif kind in ("SENSOR_CONTACT", "SENSOR", "SENSOR2"):
            sensors += 1
        elif kind == "NARRATIVE":
            narratives += 1
    return tracks, sensors, narratives


def import_legacy_data(
    source_dir: Path,
    catalog_path: Path,
    catalog_title: str = "Debrief Legacy Sample Data",
) -> ImportResult:
    """Import all REP/DPF/DSF files from source directory into a STAC catalog.

    Args:
        source_dir: Path to legacy sample_data directory (must exist).
        catalog_path: Path where STAC catalog will be created (must not exist).
        catalog_title: Title for the STAC catalog.

    Returns:
        ImportResult with per-file outcomes and aggregate statistics.

    Raises:
        FileNotFoundError: If source_dir does not exist.
        FileExistsError: If catalog_path already exists.
    """
    from debrief_stac.assets import add_asset
    from debrief_stac.catalog import create_catalog
    from debrief_stac.features import add_features
    from debrief_stac.models import PlotMetadata
    from debrief_stac.plot import create_plot, update_temporal_metadata

    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    if catalog_path.exists():
        raise FileExistsError(f"Catalog path already exists: {catalog_path}")

    start_time = time.perf_counter()

    result = ImportResult(catalog_path=str(catalog_path))

    # Collect source files
    source_files = sorted(
        f
        for f in source_dir.rglob("*")
        if f.is_file() and f.suffix.lower() in _SUPPORTED_EXTENSIONS
    )

    if not source_files:
        logger.warning("No supported files found in %s", source_dir)
        result.duration_seconds = time.perf_counter() - start_time
        return result

    # Create catalog
    create_catalog(catalog_path, title=catalog_title)

    for source_file in source_files:
        result.files_processed += 1
        file_rel = str(source_file.relative_to(source_dir))

        try:
            # Parse the file
            parse_result = parse(source_file)

            # Collect parse warnings
            for w in parse_result.warnings:
                result.warnings.append(
                    ImportWarning(file=file_rel, code=w.code, message=w.message)
                )

            if not parse_result.features:
                result.warnings.append(
                    ImportWarning(
                        file=file_rel,
                        code="NO_FEATURES",
                        message="File parsed but produced no features",
                    )
                )
                result.files_succeeded += 1
                continue

            # Determine plot metadata
            category = _detect_category(source_file, source_dir)
            slug = _slugify(source_file.name)
            plot_id = f"{category}-{slug}" if category != "general" else slug

            metadata = PlotMetadata(
                title=f"{source_file.stem} ({category})",
                description=f"Imported from {file_rel}",
            )

            # Create plot
            created_id = create_plot(catalog_path, metadata, plot_id=plot_id)

            # Add features
            add_features(catalog_path, created_id, parse_result.features)

            # Add source file as asset
            add_asset(catalog_path, created_id, source_file)

            # Update temporal metadata
            update_temporal_metadata(catalog_path, created_id)

            # Count feature kinds
            tracks, sensors, narratives = _count_feature_kinds(parse_result.features)
            result.total_tracks += tracks
            result.total_sensors += sensors
            result.total_narratives += narratives
            result.files_succeeded += 1

        except Exception as e:
            logger.error("Failed to import %s: %s", file_rel, e)
            result.errors.append(
                ImportFileError(file=file_rel, error=str(e))
            )
            result.files_failed += 1

    result.duration_seconds = time.perf_counter() - start_time
    return result


def generate_report(result: ImportResult) -> str:
    """Generate a human-readable summary report from import results."""
    lines = [
        "=" * 60,
        "Import Summary",
        "=" * 60,
        f"Catalog: {result.catalog_path}",
        f"Duration: {result.duration_seconds:.1f}s",
        "",
        f"Files processed: {result.files_processed}",
        f"Files succeeded: {result.files_succeeded}",
        f"Files failed:    {result.files_failed}",
        "",
        f"Total tracks:     {result.total_tracks}",
        f"Total sensors:    {result.total_sensors}",
        f"Total narratives: {result.total_narratives}",
    ]

    if result.warnings:
        lines.append("")
        lines.append(f"Warnings ({len(result.warnings)}):")
        for w in result.warnings[:20]:
            lines.append(f"  [{w.code}] {w.file}: {w.message}")
        if len(result.warnings) > 20:
            lines.append(f"  ... and {len(result.warnings) - 20} more")

    if result.errors:
        lines.append("")
        lines.append(f"Errors ({len(result.errors)}):")
        for e in result.errors:
            lines.append(f"  {e.file}: {e.error}")

    lines.append("=" * 60)
    return "\n".join(lines)
