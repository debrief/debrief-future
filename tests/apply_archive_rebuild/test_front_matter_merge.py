"""Unit tests for `merge_front_matter` (T033)."""

from __future__ import annotations

import datetime as _dt
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def _fm(
    aar: ModuleType,
    *,
    title: str = "Foo",
    reading_time: int | None = None,
    permalink: str | None = None,
    redirect_from: list[str] | None = None,
    extra: dict[str, object] | None = None,
) -> object:
    return aar.FrontMatter(
        layout="future-post",
        title=title,
        date=_dt.date(2026, 3, 1),
        author="Ian",
        track="credibility",
        tags=["x"],
        excerpt="e",
        reading_time=reading_time,
        permalink=permalink,
        redirect_from=redirect_from or [],
        extra=extra or {},
    )


def test_archive_title_overrides_site(aar: ModuleType) -> None:
    site = _fm(aar, title="Site Title")
    archive = _fm(aar, title="Archive Title")
    out = aar.merge_front_matter(site, archive)
    assert out.title == "Archive Title"


def test_site_reading_time_carried(aar: ModuleType) -> None:
    site = _fm(aar, reading_time=3)
    archive = _fm(aar)
    out = aar.merge_front_matter(site, archive)
    assert out.reading_time == 3


def test_site_permalink_carried(aar: ModuleType) -> None:
    site = _fm(aar, permalink="/future/custom/")
    archive = _fm(aar)
    out = aar.merge_front_matter(site, archive)
    assert out.permalink == "/future/custom/"


def test_redirect_from_unioned(aar: ModuleType) -> None:
    site = _fm(aar, redirect_from=["/old-a/"])
    archive = _fm(aar, redirect_from=["/old-b/"])
    out = aar.merge_front_matter(site, archive)
    assert "/old-a/" in out.redirect_from
    assert "/old-b/" in out.redirect_from


def test_extra_preserved(aar: ModuleType) -> None:
    site = _fm(aar, extra={"site_only": "yes"})
    archive = _fm(aar)
    out = aar.merge_front_matter(site, archive)
    assert out.extra["site_only"] == "yes"
