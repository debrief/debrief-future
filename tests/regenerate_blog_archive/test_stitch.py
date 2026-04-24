"""T044–T048: unified-post stitcher — tense-inverted twin heading, etc."""

from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType

_FIX = Path(__file__).parent / "fixtures" / "specs"


def _build_spec(rba: ModuleType, slug: str) -> object:
    path = _FIX / slug
    fm = rba.parse_front_matter(path / "media" / "shipped-post.md")
    return rba.SpecRecord(
        number=500 if slug == "with-opener" else 501,
        slug=slug,
        path=path,
        shipped_post_path=path / "media" / "shipped-post.md",
        has_opening_context=(path / "evidence" / "opening-context.md").is_file(),
        has_planning_post=False,
        front_matter=fm,
        epic_prefix=None,
    )


def test_twin_heading_splices_into_key_decisions(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    # Twin heading ## What We Built should NOT appear in the body.
    assert "## What We Built" not in post.body
    # Its opening paragraph should now sit inside Key Decisions.
    assert "tense-inverted twin heading" in post.body


def test_title_is_building_prefixed(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    assert post.title == "Building Example With Opener"


def test_front_matter_has_layout_future_post(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    assert "layout: future-post" in post.body
    assert "date: 2026-03-10" in post.body


def test_destination_is_media_unified_post(rba: ModuleType) -> None:
    spec = _build_spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    post = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    assert post.destination.name == "unified-post.md"
    assert post.destination.parent.name == "media"


def test_no_overwrite_proof_over_a_stitch(rba: ModuleType, tmp_path: Path) -> None:
    """C5: stitching does NOT mutate the shipped-post source file."""
    import hashlib
    # Build a fresh spec in tmp so we can measure byte identity.
    src_spec = _FIX / "with-opener"
    target = tmp_path / "spec"
    import shutil as _shutil
    _shutil.copytree(src_spec, target)
    fm = rba.parse_front_matter(target / "media" / "shipped-post.md")
    spec = rba.SpecRecord(
        number=500, slug="with-opener", path=target,
        shipped_post_path=target / "media" / "shipped-post.md",
        has_opening_context=True, has_planning_post=False,
        front_matter=fm, epic_prefix=None,
    )
    pre = hashlib.sha256(
        (target / "media" / "shipped-post.md").read_bytes()
    ).hexdigest()
    opener, source = rba.load_or_synthesise_opener(spec)
    _ = rba.stitch_unified_post(
        spec=spec, opener=opener, opener_source=source,
        ship_date=_dt.date(2026, 3, 10),
    )
    post_hash = hashlib.sha256(
        (target / "media" / "shipped-post.md").read_bytes()
    ).hexdigest()
    assert pre == post_hash
