#!/usr/bin/env python3
"""Nuke and regenerate the sample STAC catalog from scratch.

Deletes ``preview/workspace/samples/local-store/`` and rebuilds it by
re-importing every ``.rep``/``.dpf``/``.dsf`` source file currently stored
inside the catalog assets (plus the standalone REP files at
``preview/workspace/samples/``) through the enriched import pipeline.

The regenerated catalog replaces the deprecated flat aggregate fields
(``debrief:vessel_classes``, ``debrief:nationalities``, ``debrief:track_names``)
with ``debrief:platforms`` structured arrays.

Pipeline
--------
1. Extract source files from ``local-store/*/assets/`` into a temporary
   staging directory (copy, not move, so the operation is safe).
2. Delete ``local-store/``.
3. Re-import via ``import_legacy_data(staging_dir, catalog_path)``.
4. Run ``scripts/enrich-legacy-catalog.py`` as a subprocess to add
   exercise metadata, ``debrief:platforms`` arrays and tags.
5. Clean up the staging directory.
6. Report item count, warnings and duration.

Usage
-----
::

    # From the repository root
    uv run python scripts/regenerate-sample-catalog.py

    # With verbose logging
    uv run python scripts/regenerate-sample-catalog.py --verbose

    # Stage-only mode (extract + delete, skip import/enrich)
    uv run python scripts/regenerate-sample-catalog.py --stage-only

See ``specs/184-regenerate-sample-catalog/quickstart.md`` for full details.
"""

from __future__ import annotations

import argparse
import logging
import shutil
import subprocess
import sys
import tempfile
import time
from collections import Counter
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Sequence

logger = logging.getLogger("regenerate-sample-catalog")

# Relative-to-repo-root paths
REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOG_DIR = REPO_ROOT / "preview" / "workspace" / "samples" / "local-store"
STANDALONE_SAMPLES_DIR = REPO_ROOT / "preview" / "workspace" / "samples"
ENRICH_SCRIPT = REPO_ROOT / "scripts" / "enrich-legacy-catalog.py"

# Extensions accepted by the import pipeline
SUPPORTED_EXTENSIONS = {".rep", ".dpf", ".dsf"}


def discover_source_files(catalog_dir: Path) -> list[Path]:
    """Walk ``catalog_dir``/*/assets and collect all supported source files.

    Returns
    -------
    list[Path]
        Absolute paths to every ``.rep``/``.dpf``/``.dsf`` asset found
        inside any item directory of the catalog. Sorted for determinism.
    """
    if not catalog_dir.exists():
        return []

    found: list[Path] = []
    for asset_dir in sorted(catalog_dir.glob("*/assets")):
        if not asset_dir.is_dir():
            continue
        for path in sorted(asset_dir.iterdir()):
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
                found.append(path.resolve())
    return found


def discover_standalone_samples(samples_dir: Path) -> list[Path]:
    """Return the standalone REP/DPF/DSF files at ``samples_dir`` root.

    These live alongside ``local-store/`` (e.g. ``boat1.rep``) and should
    also be imported to keep parity with the existing sample set.
    """
    found: list[Path] = []
    if not samples_dir.exists():
        return found
    for path in sorted(samples_dir.iterdir()):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            found.append(path.resolve())
    return found


def stage_source_files(source_files: list[Path], staging_dir: Path) -> int:
    """Copy ``source_files`` into ``staging_dir`` preserving filenames.

    If two files share a basename (e.g. ``sample.dpf`` in two item dirs),
    the second copy is prefixed with a short directory hint to avoid
    collisions. Returns the number of files staged.
    """
    staging_dir.mkdir(parents=True, exist_ok=True)
    staged: set[str] = set()
    count = 0
    for src in source_files:
        target_name = src.name
        if target_name in staged:
            # Disambiguate by including the immediate grandparent (item dir)
            hint = src.parent.parent.name
            target_name = f"{hint}__{src.name}"
        target = staging_dir / target_name
        shutil.copy2(src, target)
        staged.add(target_name)
        count += 1
    return count


def extract_warning_counts(warnings: Sequence[object]) -> Counter[str]:
    """Return a Counter of warning codes for reporting."""
    counter: Counter[str] = Counter()
    for w in warnings:
        code = getattr(w, "code", None)
        if isinstance(code, str):
            counter[code] += 1
    return counter


def log_unregistered_platforms(warnings: Sequence[object]) -> list[str]:
    """Pull unique platform IDs from UNREGISTERED_PLATFORM warnings."""
    ids: set[str] = set()
    for w in warnings:
        if getattr(w, "code", None) == "UNREGISTERED_PLATFORM":
            # message is like: "Platform 'XYZ' is not registered in the platform registry"
            msg = getattr(w, "message", "")
            if "'" in msg:
                pid = msg.split("'", 2)[1]
                ids.add(pid)
    return sorted(ids)


def run_enrichment(verbose: bool = False) -> subprocess.CompletedProcess[str]:
    """Invoke ``scripts/enrich-legacy-catalog.py`` as a subprocess.

    The enrichment script hardcodes the catalog path, uses module-level
    state (RNG seed), and is designed to be run from the repo root.
    Invoking it as a subprocess respects that design.
    """
    cmd = ["uv", "run", "python", str(ENRICH_SCRIPT)]
    logger.info("Running enrichment: %s", " ".join(cmd))
    return subprocess.run(
        cmd,
        cwd=REPO_ROOT,
        capture_output=not verbose,
        text=True,
        check=True,
    )


def regenerate_catalog(
    catalog_dir: Path,
    samples_dir: Path,
    *,
    stage_only: bool = False,
    verbose: bool = False,
) -> int:
    """Run the full regeneration pipeline.

    Parameters
    ----------
    catalog_dir:
        Path to the STAC catalog directory to regenerate.
    samples_dir:
        Parent directory containing standalone sample files and the
        catalog directory.
    stage_only:
        If True, stop after staging source files (useful for dry runs
        and debugging).
    verbose:
        Emit subprocess output live instead of capturing it.

    Returns
    -------
    int
        Process exit code (0 on success).
    """
    from debrief_io.import_catalog import generate_report, import_legacy_data

    started = time.perf_counter()

    # Phase 1: discover source files
    asset_sources = discover_source_files(catalog_dir)
    standalone_sources = discover_standalone_samples(samples_dir)
    all_sources = asset_sources + standalone_sources

    logger.info(
        "Discovered %d asset files + %d standalone files = %d total sources",
        len(asset_sources),
        len(standalone_sources),
        len(all_sources),
    )
    if not all_sources:
        logger.error("No source files found. Aborting (nothing to regenerate).")
        return 2

    # Phase 2: stage into temp dir
    staging_root = Path(tempfile.mkdtemp(prefix="debrief-regen-"))
    try:
        staged_count = stage_source_files(all_sources, staging_root)
        logger.info("Staged %d source files to %s", staged_count, staging_root)
        if staged_count == 0:
            logger.error("Staging produced zero files. Aborting before deletion.")
            return 2

        if stage_only:
            logger.info("Stage-only mode requested — stopping here.")
            logger.info("Staging directory preserved at %s", staging_root)
            return 0

        # Phase 3: delete existing catalog (safety check passed)
        if catalog_dir.exists():
            logger.info("Deleting existing catalog at %s", catalog_dir)
            shutil.rmtree(catalog_dir)

        # Phase 4: reimport
        logger.info("Running import_legacy_data(%s, %s)", staging_root, catalog_dir)
        result = import_legacy_data(staging_root, catalog_dir)

        report = generate_report(result)
        print(report)

        warning_counts = extract_warning_counts(result.warnings)
        if warning_counts:
            logger.info("Warning summary: %s", dict(warning_counts))
        unregistered = log_unregistered_platforms(result.warnings)
        if unregistered:
            logger.warning(
                "Unregistered platform IDs found (%d): %s",
                len(unregistered),
                ", ".join(unregistered),
            )

        if result.files_failed > 0:
            # Known data-quality failures (e.g. narrative.rep has empty geometry,
            # shapes.rep has unsupported feature kinds) are expected and
            # non-fatal. The script proceeds to enrichment so the catalog
            # is usable, but we log the failures for visibility.
            logger.warning(
                "%d source files failed to import (see errors above)",
                result.files_failed,
            )

        # Phase 5: enrich
        try:
            enrich_proc = run_enrichment(verbose=verbose)
        except subprocess.CalledProcessError as e:
            logger.error("Enrichment failed with exit code %s", e.returncode)
            if e.stdout:
                logger.error("stdout:\n%s", e.stdout)
            if e.stderr:
                logger.error("stderr:\n%s", e.stderr)
            return 1
        if not verbose and enrich_proc.stdout:
            # Print a compressed view of enrichment output
            tail = enrich_proc.stdout.strip().splitlines()[-6:]
            logger.info("Enrichment completed:\n%s", "\n".join(tail))
        else:
            logger.info("Enrichment completed")

        # Phase 6: report
        elapsed = time.perf_counter() - started
        item_dirs = [p for p in catalog_dir.glob("*") if p.is_dir()]
        logger.info(
            "Regeneration complete: %d items, %d warnings, %.1fs",
            len(item_dirs),
            len(result.warnings),
            elapsed,
        )
        return 0

    finally:
        # Phase 7: clean up staging directory
        if staging_root.exists() and not stage_only:
            shutil.rmtree(staging_root, ignore_errors=True)
            logger.debug("Cleaned up staging directory %s", staging_root)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Nuke and regenerate the sample STAC catalog via the enriched "
            "import pipeline."
        ),
    )
    parser.add_argument(
        "--catalog-dir",
        type=Path,
        default=CATALOG_DIR,
        help="Path to catalog directory (default: %(default)s)",
    )
    parser.add_argument(
        "--samples-dir",
        type=Path,
        default=STANDALONE_SAMPLES_DIR,
        help="Path to samples directory holding the catalog (default: %(default)s)",
    )
    parser.add_argument(
        "--stage-only",
        action="store_true",
        help="Stage source files to a temp directory and stop (no deletion).",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging and subprocess output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s [%(name)s] %(message)s",
    )

    return regenerate_catalog(
        args.catalog_dir.resolve(),
        args.samples_dir.resolve(),
        stage_only=args.stage_only,
        verbose=args.verbose,
    )


if __name__ == "__main__":
    sys.exit(main())
