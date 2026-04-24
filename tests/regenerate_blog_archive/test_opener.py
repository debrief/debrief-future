"""T039–T040: cached opener byte-for-byte + synthesis fallback + marker."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType

_FIX = Path(__file__).parent / "fixtures" / "specs"


def _spec(rba: ModuleType, slug: str) -> object:
    path = _FIX / slug
    return rba.SpecRecord(
        number=500 if slug == "with-opener" else 501,
        slug=slug,
        path=path,
        shipped_post_path=path / "media" / "shipped-post.md",
        has_opening_context=(path / "evidence" / "opening-context.md").is_file(),
        has_planning_post=False,
        front_matter=None,
        epic_prefix=None,
    )


def test_cached_opener_copied_byte_for_byte(rba: ModuleType) -> None:
    spec = _spec(rba, "with-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    assert source == "cached"
    cached_text = (_FIX / "with-opener" / "evidence" / "opening-context.md").read_text()
    # Opener equals cached text (modulo trailing newline handling).
    assert opener.rstrip() == cached_text.rstrip()


def test_synthesis_fallback_marker_present(rba: ModuleType) -> None:
    spec = _spec(rba, "no-opener")
    opener, source = rba.load_or_synthesise_opener(spec)
    assert source == "synthesised"
    assert rba.OPENER_SYNTHESIS_MARKER in opener
    assert "## What We're Building" in opener
    assert "## How It Fits" in opener
    assert "## Key Decisions" in opener
