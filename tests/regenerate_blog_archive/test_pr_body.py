"""T028–T029: PR-body retriever + C6 `--skip-gh` contract."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _spec(rba: ModuleType, tmp_path: Path) -> object:
    spec_dir = tmp_path / "specs" / "207-example"
    spec_dir.mkdir(parents=True)
    (spec_dir / "spec.md").write_text("# x\n")
    media = spec_dir / "media"
    media.mkdir()
    shipped = media / "shipped-post.md"
    shipped.write_text(
        "---\ntitle: x\ndate: 2026-01-01\n---\n\n## What Shipped\n\nBody.\n"
    )
    return rba.SpecRecord(
        number=207, slug="example", path=spec_dir,
        shipped_post_path=shipped,
        has_opening_context=False, has_planning_post=False,
        front_matter=None, epic_prefix=None,
    )


def test_c6_skip_gh_forces_shipped_post_fallback(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    spec = _spec(rba, tmp_path)
    body, source = rba.get_pr_body(
        spec, skip_gh=True, logger=logging.getLogger("test"),
    )
    assert source == "shipped-post"
    assert "What Shipped" in body


def test_missing_shipped_post_returns_missing(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    spec = rba.SpecRecord(
        number=404, slug="missing", path=tmp_path,
        shipped_post_path=None,
        has_opening_context=False, has_planning_post=False,
        front_matter=None, epic_prefix=None,
    )
    body, source = rba.get_pr_body(
        spec, skip_gh=True, logger=logging.getLogger("test"),
    )
    assert source == "missing"
    assert body == ""
