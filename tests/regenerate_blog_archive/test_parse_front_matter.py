"""T015–T016: YAML front-matter parser + C11 malformed-YAML contract."""

from __future__ import annotations

import datetime as _dt
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType

_FIXTURES = Path(__file__).parent / "fixtures"


def test_valid_front_matter(rba: ModuleType) -> None:
    fm = rba.parse_front_matter(_FIXTURES / "shipped-post-valid.md")
    assert fm.title == "Shipped: Valid Fixture"
    assert fm.date == _dt.date(2026, 3, 15)
    # noise filter strips `tracer-bullet`
    assert "tracer-bullet" not in fm.tags
    assert "stac" not in fm.tags  # noise-widened list includes stac
    assert "schema" not in fm.tags  # widened list includes `schema`
    assert fm.tags == frozenset()  # after widening, only noise tags remain
    assert fm.track == "momentum"
    assert fm.author == "Ian"
    assert fm.excerpt == "A valid fixture for front-matter parser tests."


def test_missing_title(tmp_path: Path, rba: ModuleType) -> None:
    path = tmp_path / "no-title.md"
    path.write_text("---\ndate: 2026-01-01\n---\n\nbody\n")
    with pytest.raises(rba.FrontMatterError, match="title"):
        rba.parse_front_matter(path)


def test_missing_date(tmp_path: Path, rba: ModuleType) -> None:
    path = tmp_path / "no-date.md"
    path.write_text('---\ntitle: "Ok"\n---\n\nbody\n')
    with pytest.raises(rba.FrontMatterError, match="date"):
        rba.parse_front_matter(path)


def test_track_as_list(tmp_path: Path, rba: ModuleType) -> None:
    path = tmp_path / "track-list.md"
    path.write_text(
        '---\ntitle: "Ok"\ndate: 2026-01-01\ntrack: [momentum, credibility]\n---\n'
    )
    fm = rba.parse_front_matter(path)
    assert fm.track == "momentum, credibility"


def test_malformed_yaml_raises_errorclass(rba: ModuleType) -> None:
    """C11: malformed YAML produces FrontMatterError (not a bare yaml exception)."""
    with pytest.raises(rba.FrontMatterError, match="malformed YAML"):
        rba.parse_front_matter(_FIXTURES / "shipped-post-malformed.md")


def test_tags_string_form(tmp_path: Path, rba: ModuleType) -> None:
    path = tmp_path / "tags-str.md"
    path.write_text(
        '---\ntitle: "Ok"\ndate: 2026-01-01\ntags: provenance\n---\n'
    )
    fm = rba.parse_front_matter(path)
    assert fm.tags == frozenset({"provenance"})


def test_tags_noise_filtered(tmp_path: Path, rba: ModuleType) -> None:
    path = tmp_path / "tags-mix.md"
    path.write_text(
        '---\ntitle: "Ok"\ndate: 2026-01-01\n'
        "tags: [provenance, tracer-bullet, platform-registry]\n---\n"
    )
    fm = rba.parse_front_matter(path)
    # Noise tags removed
    assert "tracer-bullet" not in fm.tags
    # Non-noise tags retained
    assert "provenance" in fm.tags
    assert "platform-registry" in fm.tags
