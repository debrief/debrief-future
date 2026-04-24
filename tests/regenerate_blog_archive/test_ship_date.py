"""T025–T026: ship-date resolver R2 tiers."""

from __future__ import annotations

import datetime as _dt
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _fake_spec(rba: ModuleType, tmp_path: Path, *, fm_date: _dt.date | None) -> object:
    spec_dir = tmp_path / "specs" / "207-example"
    spec_dir.mkdir(parents=True)
    (spec_dir / "spec.md").write_text("# x\n")
    shipped = spec_dir / "media" / "shipped-post.md"
    shipped.parent.mkdir()
    shipped.write_text("---\ntitle: x\ndate: 2099-01-01\n---\n")
    fm = (
        rba.FrontMatter(
            title="x", date=fm_date, tags=frozenset(),
            track=None, excerpt=None, author=None, layout=None,
        )
        if fm_date is not None
        else None
    )
    return rba.SpecRecord(
        number=207,
        slug="example",
        path=spec_dir,
        shipped_post_path=shipped,
        has_opening_context=False,
        has_planning_post=False,
        front_matter=fm,
        epic_prefix=None,
    )


def test_tier1_front_matter_wins(rba: ModuleType, tmp_path: Path) -> None:
    spec = _fake_spec(rba, tmp_path, fm_date=_dt.date(2026, 3, 1))
    date, source = rba.resolve_ship_date(
        spec, repo_root=tmp_path, skip_gh=True,
        logger=logging.getLogger("test"),
    )
    assert date == _dt.date(2026, 3, 1)
    assert source == "front-matter"


def test_tier3_git_log_fallback_when_no_fm_and_no_gh(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    """When front-matter missing AND skip_gh, tier 3 attempts git log.

    In an isolated tmp_path (not a git repo), git log returns nothing →
    `resolve_ship_date` returns (None, "git-log").
    """
    spec = _fake_spec(rba, tmp_path, fm_date=None)
    date, source = rba.resolve_ship_date(
        spec, repo_root=tmp_path, skip_gh=True,
        logger=logging.getLogger("test"),
    )
    assert source == "git-log"
    assert date is None
