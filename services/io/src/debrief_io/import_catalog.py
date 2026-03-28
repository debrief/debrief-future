"""Batch import pipeline for legacy Debrief sample data.

Imports REP, DPF, and DSF files from a source directory into a
STAC catalog with one plot per source file.
"""

from __future__ import annotations

import logging
import re
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from debrief_io.models import ImportFileError, ImportResult, ImportWarning
from debrief_io.parser import parse

logger = logging.getLogger(__name__)

# Supported extensions for import
_SUPPORTED_EXTENSIONS = {".rep", ".dpf", ".dsf"}

# Domain tier mapping from legacy directory structure.
# Keys are lowercased directory names; values are hierarchical domain paths
# used as STAC collection prefixes (e.g. "s2r/freq/file-slug").
_DOMAIN_MAP: dict[str, str] = {
    # Core — basic tracks, narratives, shapes, colors (root-level files)
    # (no entry needed; root-level files default to "core")
    #
    # Demo — tutorial walkthrough scenarios
    "demo": "demo",
    # S2R — sensor-to-range analysis
    "s2r": "s2r",
    # SATC — semi-auto track construction
    "satc": "satc",
    "satc_test": "satc",
    # Multi-static — multi-static sonar / multi-path scenarios
    "multistatics": "multi-static",
    "multipath": "multi-static",
    # Other formats — edge cases, towed array, BRT import tests
    "other_formats": "other-formats",
}


def _slugify(name: str) -> str:
    """Convert a filename to a kebab-case slug for use as plot ID."""
    stem = Path(name).stem
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()
    return slug


def _detect_domain(file_path: Path, source_dir: Path) -> str:
    """Detect domain tier from directory structure.

    Returns a hierarchical domain path (e.g. "s2r/freq", "demo/analysis").
    Root-level files map to "core".
    """
    try:
        relative = file_path.parent.relative_to(source_dir)
        parts = [p.lower() for p in relative.parts]
    except ValueError:
        return "core"

    if not parts:
        return "core"

    # Map the top-level directory to a domain
    domain = _DOMAIN_MAP.get(parts[0], "core")

    # Preserve sub-directory structure as path segments
    if len(parts) > 1:
        sub_parts = [_slugify(p + ".x") for p in parts[1:]]  # slugify sub-dirs
        return "/".join([domain, *sub_parts])

    return domain


def _duration_ms_to_iso8601(duration_ms: float) -> str:
    """Convert milliseconds to ISO 8601 duration string (e.g., PT0.3S)."""
    seconds = duration_ms / 1000.0
    if seconds == int(seconds):
        return f"PT{int(seconds)}S"
    formatted = f"{seconds:.6f}".rstrip("0").rstrip(".")
    return f"PT{formatted}S"


def _build_provenance_entry(
    *,
    tool: str,
    tool_version: str,
    feature_id: str,
    parse_time_ms: float,
    activity_id: str,
    timestamp: str,
) -> dict[str, Any]:
    """Build a PROV-aligned LogEntry dict for an imported feature.

    Matches the LogEntry schema from shared/schemas/src/linkml/log-entry.yaml.
    Source file provenance is recorded at the STAC asset level via add_asset().
    """
    return {
        "activity_id": activity_id,
        "timestamp": timestamp,
        "was_generated_by": {
            "tool": tool,
            "tool_version": tool_version,
            "parameters": [],
        },
        "used": [],
        "generated": [feature_id],
        "execution_duration": _duration_ms_to_iso8601(parse_time_ms),
    }


def _attach_provenance(
    features: list[dict[str, Any]],
    *,
    handler_name: str,
    handler_version: str,
    source_file_rel: str,
    parse_time_ms: float,
) -> None:
    """Attach PROV LogEntry to each feature in-place.

    All features from the same file share one activity_id
    (they were produced by the same parse operation).
    """
    activity_id = str(uuid.uuid4())
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    # Derive a kebab-case tool name from the handler name
    # e.g. "Debrief REP Format" -> "rep-parser"
    parts = handler_name.lower().split()
    ext = parts[1] if len(parts) >= 2 else parts[0]
    tool = f"{ext}-parser"

    for feature in features:
        feature_id = str(feature.get("id", "unknown"))
        entry = _build_provenance_entry(
            tool=tool,
            tool_version=handler_version,
            feature_id=feature_id,
            parse_time_ms=parse_time_ms,
            activity_id=activity_id,
            timestamp=timestamp,
        )
        props = feature.setdefault("properties", {})
        props["provenance"] = [entry]


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
                result.warnings.append(ImportWarning(file=file_rel, code=w.code, message=w.message))

            # Schema-validate at parser_output boundary (warn-and-continue)
            schema_warnings = parse_result.schema_validate_features()
            for sw in schema_warnings:
                result.warnings.append(ImportWarning(file=file_rel, code=sw.code, message=sw.message))

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

            # Attach PROV lineage to each feature (Constitution III.1)
            _attach_provenance(
                parse_result.features,
                handler_name=parse_result.handler,
                handler_version=parse_result.handler_version,
                source_file_rel=file_rel,
                parse_time_ms=parse_result.parse_time_ms,
            )

            # Determine plot metadata
            domain = _detect_domain(source_file, source_dir)
            slug = _slugify(source_file.name)
            # Flatten domain path to hyphenated prefix for STAC plot ID
            domain_prefix = domain.replace("/", "-")
            plot_id = f"{domain_prefix}--{slug}"

            metadata = PlotMetadata(
                title=f"{source_file.stem} ({domain})",
                description=f"Domain: {domain}\nImported from {file_rel}",
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
            result.errors.append(ImportFileError(file=file_rel, error=str(e)))
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
