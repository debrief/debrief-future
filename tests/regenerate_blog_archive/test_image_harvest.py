"""Spec 231 Phase 2: harvest_image_refs unit cases.

Covers markdown + HTML image extraction, malformed-reference surface
(FR-013), and the 176-log-panel-ux four-image regression fixture.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def _make_spec(rba: ModuleType, slug: str = "176-log-panel-ux") -> object:
    # Number parses from slug prefix by convention; the harvester only
    # reads .key so keep number aligned.
    number = int(slug.split("-", 1)[0]) if "-" in slug and slug[:3].isdigit() else 999
    _slug = slug.split("-", 1)[1] if slug[:3].isdigit() else slug
    return rba.SpecRecord(
        number=number,
        slug=_slug,
        path=Path("/tmp") / slug,
        shipped_post_path=None,
        has_opening_context=False,
        has_planning_post=False,
        front_matter=None,
        epic_prefix=None,
    )


def test_empty_body_returns_empty(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("", spec)
    assert refs == []
    assert malformed == []


def test_single_markdown_ref(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("![x](./evidence/a.png)", spec)
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].alt == "x"
    assert refs[0].source_path == "./evidence/a.png"
    assert refs[0].kind == "markdown"
    assert refs[0].rewritten_path == "/assets/images/future-debrief/176-log-panel-ux/a.png"


def test_html_img_with_alt(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs(
        '<img src="./evidence/b.png" alt="b">', spec,
    )
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].alt == "b"
    assert refs[0].kind == "html"
    assert refs[0].rewritten_path.endswith("/b.png")


def test_html_img_without_alt(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("<img src='c.png'>", spec)
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].alt == ""
    assert refs[0].kind == "html"


def test_html_img_uppercase_tag(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs('<IMG SRC="d.png">', spec)
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].source_path == "d.png"
    assert refs[0].kind == "html"


def test_markdown_and_html_on_same_line(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    line = '![md](m.png) then <img src="h.png" alt="ht">'
    refs, malformed = rba.harvest_image_refs(line, spec)
    assert len(refs) == 2
    assert malformed == []
    kinds = {r.kind for r in refs}
    assert kinds == {"markdown", "html"}


def test_same_path_twice_preserved(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    body = "![x](foo.png)\n\n![x](foo.png)"
    refs, malformed = rba.harvest_image_refs(body, spec)
    assert len(refs) == 2
    assert malformed == []


def test_empty_alt_markdown(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("![](foo.png)", spec)
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].alt == ""


def test_markdown_title_arm_ignored(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs('![x](foo.png "title")', spec)
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].source_path == "foo.png"


def test_malformed_unclosed_paren(rba: ModuleType) -> None:
    """FR-013: unclosed `![` occurrence surfaces as malformed row."""
    spec = _make_spec(rba)
    body = "\n\n\n\n\n\n![unclosed(foo.png"
    refs, malformed = rba.harvest_image_refs(body, spec)
    assert refs == []
    assert len(malformed) == 1
    assert malformed[0].line_number == 7
    assert malformed[0].snippet.startswith("![unclosed")


def test_176_log_panel_ux_shaped_fixture(rba: ModuleType) -> None:
    """Regression guard: four image refs across two `## Screenshots` sections."""
    body = """## Context

Lead paragraph.

## Screenshots

![a](./evidence/screenshots/a.png)
![b](./evidence/screenshots/b.png)

## Mid-section

Some text.

## Screenshots

![c](./evidence/screenshots/c.png)
![d](./evidence/screenshots/d.png)
"""
    spec = _make_spec(rba, "176-log-panel-ux")
    refs, malformed = rba.harvest_image_refs(body, spec)
    assert len(refs) == 4
    assert malformed == []
    basenames = [Path(r.source_path).name for r in refs]
    assert basenames == ["a.png", "b.png", "c.png", "d.png"]
