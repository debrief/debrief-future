"""Unit tests for `detect_filename_collisions` (T023)."""

from __future__ import annotations

import datetime as _dt
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def _make_archive_post(
    aar: ModuleType,
    *,
    title: str,
    date: _dt.date,
    spec_key: str = "x",
) -> object:
    fm = aar.FrontMatter(
        layout="future-post",
        title=title,
        date=date,
        author="Ian",
        track="credibility",
        tags=[],
    )
    return aar.ArchivePost(
        spec_key=spec_key,
        kind="unified",
        source_path=__import__("pathlib").Path(f"specs/{spec_key}/media/unified-post.md"),
        front_matter=fm,
        body="",
        target_filename=f"{date.isoformat()}-{aar.slugify_title(title)}.md",
        referenced_images=tuple(),
    )


def test_no_collisions(aar: ModuleType) -> None:
    posts = [
        _make_archive_post(aar, title="Building One", date=_dt.date(2026, 1, 1), spec_key="a"),
        _make_archive_post(aar, title="Building Two", date=_dt.date(2026, 1, 2), spec_key="b"),
    ]
    assert aar.detect_filename_collisions(posts) == []


def test_two_colliding(aar: ModuleType) -> None:
    posts = [
        _make_archive_post(aar, title="Building Same", date=_dt.date(2026, 1, 1), spec_key="a"),
        _make_archive_post(aar, title="Building Same", date=_dt.date(2026, 1, 1), spec_key="b"),
    ]
    collisions = aar.detect_filename_collisions(posts)
    assert len(collisions) == 1


def test_three_colliding_yield_three_pairs(aar: ModuleType) -> None:
    posts = [
        _make_archive_post(aar, title="Building Same", date=_dt.date(2026, 1, 1), spec_key=k)
        for k in ("a", "b", "c")
    ]
    collisions = aar.detect_filename_collisions(posts)
    assert len(collisions) == 3  # n choose 2 = 3
