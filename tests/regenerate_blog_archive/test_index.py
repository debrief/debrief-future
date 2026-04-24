"""T093–T104: index + runbook + summary serialisation."""

from __future__ import annotations

import datetime as _dt
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _build_cli(rba: ModuleType, tmp_path: Path) -> object:
    return rba.CliArgs(
        dry_run=True, verbose=False,
        out_index=tmp_path / "ARCHIVE-REBUILD.md",
        composite_window_days=5, near_miss_max_days=10,
        skip_gh=True, fail_fast=False, repo_root=tmp_path,
    )


def _write_shipped(
    rba: ModuleType,
    tmp_path: Path,
    *,
    number: int,
    slug: str,
    tags: list[str] | None = None,
    date: str = "2026-03-01",
) -> None:
    d = tmp_path / "specs" / f"{number:03d}-{slug}"
    d.mkdir(parents=True)
    (d / "spec.md").write_text(f"# {slug}\n")
    (d / "media").mkdir()
    (d / "media" / "shipped-post.md").write_text(
        "---\n"
        f"title: \"Shipped: {slug}\"\n"
        f"date: {date}\n"
        f"tags: {tags or ['example']}\n"
        "---\n\n## What Shipped\n\nbody\n"
    )


def test_c7_every_post_gets_a_row(rba: ModuleType, tmp_path: Path) -> None:
    _write_shipped(rba, tmp_path, number=100, slug="alpha")
    _write_shipped(rba, tmp_path, number=101, slug="beta")
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    index = rba.ArchiveIndex(
        generated_posts=posts, classifications=classifications,
        unresolved=unresolved, near_misses=near,
        skipped_specs=[c.spec for c in classifications if c.category == "skipped"],
    )
    index.run_completed_at = _dt.datetime.now(tz=_dt.UTC)
    rendered = rba.serialise_archive_index(index, args=args)
    # One row per generated post (excluding the table header and separator).
    row_count = sum(
        1 for line in rendered.splitlines()
        if line.startswith("| 100-alpha") or line.startswith("| 101-beta")
    )
    assert row_count == 2


def test_runbook_has_four_canonical_steps(rba: ModuleType, tmp_path: Path) -> None:
    args = _build_cli(rba, tmp_path)
    rendered = rba.serialise_archive_index(rba.ArchiveIndex(), args=args)
    assert "Wipe existing future posts" in rendered
    assert "Copy generated files" in rendered
    assert "Adjust front matter" in rendered
    assert "Build and deploy" in rendered


def test_summary_block_counts_match_index(rba: ModuleType, tmp_path: Path) -> None:
    _write_shipped(rba, tmp_path, number=100, slug="alpha")
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    index = rba.ArchiveIndex(
        generated_posts=posts,
        classifications=classifications,
        unresolved=unresolved, near_misses=near,
        run_tool_versions={"python": "3.11.0", "gh": "absent"},
    )
    index.run_completed_at = _dt.datetime.now(tz=_dt.UTC)
    summary = rba.render_summary(index, args=args, elapsed=0.5)
    assert "Unified posts:" in summary
    assert "1" in summary  # one unified post
    assert "[DRY-RUN]" in summary  # dry-run prefix present
