"""Unit tests for `diff_post` (T032)."""

from __future__ import annotations

import datetime as _dt
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def _site_post(
    aar: ModuleType,
    *,
    title: str = "Building Foo",
    body: str = "Body\n",
    extra_fields: dict[str, object] | None = None,
) -> object:
    extras = extra_fields or {}
    fm = aar.FrontMatter(
        layout="future-post",
        title=title,
        date=_dt.date(2026, 3, 1),
        author="Ian",
        track="credibility",
        tags=["x"],
        excerpt="e",
        reading_time=extras.get("reading_time"),
        permalink=extras.get("permalink"),
    )
    return aar.SitePost(
        filename="2026-03-01-foo.md",
        path=__import__("pathlib").Path("/tmp/2026-03-01-foo.md"),
        front_matter=fm,
        body=body,
        inferred_spec_key="x",
    )


def _archive_post(
    aar: ModuleType,
    *,
    title: str = "Building Foo",
    body: str = "Body\n",
    track: object = "credibility",
) -> object:
    fm = aar.FrontMatter(
        layout="future-post",
        title=title,
        date=_dt.date(2026, 3, 1),
        author="Ian",
        track=track,
        tags=["x"],
        excerpt="e",
    )
    return aar.ArchivePost(
        spec_key="x",
        kind="unified",
        source_path=__import__("pathlib").Path("specs/x/media/unified-post.md"),
        front_matter=fm,
        body=body,
        target_filename="2026-03-01-foo.md",
        referenced_images=tuple(),
    )


def test_identical_posts_clean(aar: ModuleType) -> None:
    sp = _site_post(aar)
    ap = _archive_post(aar)
    div = aar.diff_post(sp, ap)
    assert div.is_clean is True


def test_site_extra_reading_time(aar: ModuleType) -> None:
    sp = _site_post(aar, extra_fields={"reading_time": 3})
    ap = _archive_post(aar)
    div = aar.diff_post(sp, ap)
    assert div.site_only_fields == {"reading_time": 3}


def test_archive_extra_field(aar: ModuleType) -> None:
    """Archive front-matter has a value the site front-matter lacks."""
    sp = _site_post(aar)
    sp = aar.SitePost(
        filename=sp.filename,
        path=sp.path,
        front_matter=aar.FrontMatter(
            layout="future-post",
            title=sp.front_matter.title,
            date=sp.front_matter.date,
            author=sp.front_matter.author,
            track=sp.front_matter.track,
            tags=sp.front_matter.tags,
            excerpt=None,
            reading_time=None,
            permalink=None,
        ),
        body=sp.body,
        inferred_spec_key=sp.inferred_spec_key,
    )
    ap = _archive_post(aar)
    div = aar.diff_post(sp, ap)
    assert "excerpt" in div.archive_only_fields


def test_body_diverged(aar: ModuleType) -> None:
    sp = _site_post(aar, body="Same\nLine\n")
    ap = _archive_post(aar, body="Same\nDIFFERENT\n")
    div = aar.diff_post(sp, ap)
    assert div.body_diff_lines > 0
    assert div.body_diff_summary != ""


def test_whitespace_only_body_clean(aar: ModuleType) -> None:
    sp = _site_post(aar, body="Body   \nLine\n")
    ap = _archive_post(aar, body="Body\nLine\n")
    div = aar.diff_post(sp, ap)
    assert div.body_diff_lines == 0


def test_value_mismatch_track_list_vs_string(aar: ModuleType) -> None:
    sp = _site_post(aar)
    ap = _archive_post(aar, track=["credibility"])
    div = aar.diff_post(sp, ap)
    assert "track" in div.value_mismatches
