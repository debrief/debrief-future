"""Unit cases for `harvest_image_refs` (FR-010, FR-013).

Exercises both regexes (_IMAGE_RE, _HTML_IMG_RE) plus the malformed pass.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def _make_spec(rba: ModuleType, *, number: int = 176, slug: str = "log-panel-ux") -> object:
    return rba.SpecRecord(
        number=number,
        slug=slug,
        path=Path("/tmp") / f"{number:03d}-{slug}",
        shipped_post_path=None,
        has_opening_context=False,
        has_planning_post=False,
        front_matter=None,
        epic_prefix=None,
    )


def test_harvest_empty_body(rba: ModuleType) -> None:
    refs, malformed = rba.harvest_image_refs("", _make_spec(rba))
    assert refs == []
    assert malformed == []


def test_harvest_single_markdown(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("![x](./evidence/a.png)", spec)
    assert len(refs) == 1
    assert malformed == []
    ref = refs[0]
    assert ref.alt == "x"
    assert ref.source_path == "./evidence/a.png"
    assert ref.rewritten_path == "/assets/images/future-debrief/176-log-panel-ux/a.png"
    assert ref.kind == "markdown"
    assert ref.line_number == 1


def test_harvest_html_with_alt(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs(
        '<img src="./evidence/b.png" alt="b">', spec,
    )
    assert len(refs) == 1
    assert malformed == []
    ref = refs[0]
    assert ref.kind == "html"
    assert ref.alt == "b"
    assert ref.source_path == "./evidence/b.png"


def test_harvest_html_without_alt_single_quotes(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("<img src='c.png'>", spec)
    assert len(refs) == 1
    assert malformed == []
    assert refs[0].alt == ""
    assert refs[0].kind == "html"


def test_harvest_html_uppercase_tag(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, _ = rba.harvest_image_refs('<IMG SRC="d.png">', spec)
    assert len(refs) == 1
    assert refs[0].kind == "html"
    assert refs[0].source_path == "d.png"


def test_harvest_same_path_twice(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    body = "![a](foo.png)\n![a](foo.png)"
    refs, _ = rba.harvest_image_refs(body, spec)
    assert len(refs) == 2


def test_harvest_empty_alt(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, malformed = rba.harvest_image_refs("![](foo.png)", spec)
    assert len(refs) == 1
    assert refs[0].alt == ""
    assert malformed == []


def test_harvest_title_arm_ignored(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    refs, _ = rba.harvest_image_refs('![x](foo.png "title")', spec)
    assert len(refs) == 1
    assert refs[0].source_path == "foo.png"


def test_harvest_unclosed_paren_malformed_on_line_7(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    body = "\n\n\n\n\n\n![unclosed(foo.png"
    refs, malformed = rba.harvest_image_refs(body, spec)
    assert refs == []
    assert len(malformed) == 1
    assert malformed[0].line_number == 7
    assert malformed[0].snippet.startswith("![unclosed")


def test_harvest_markdown_and_html_mixed_on_one_line(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    body = '![a](foo.png) and <img src="bar.png">'
    refs, malformed = rba.harvest_image_refs(body, spec)
    assert len(refs) == 2
    assert malformed == []
    kinds = {r.kind for r in refs}
    assert kinds == {"markdown", "html"}


def test_harvest_176_log_panel_ux_shape_four_images_no_malformed(rba: ModuleType) -> None:
    spec = _make_spec(rba)
    body = (
        "## Screenshots\n"
        "\n"
        "![screen1](./evidence/screenshots/a.png)\n"
        "![screen2](./evidence/screenshots/b.png)\n"
        "\n"
        "## Screenshots We Built\n"
        "\n"
        "![screen3](./evidence/screenshots/c.png)\n"
        "![screen4](./evidence/screenshots/d.png)\n"
    )
    refs, malformed = rba.harvest_image_refs(body, spec)
    assert len(refs) == 4
    assert malformed == []
    assert all(r.kind == "markdown" for r in refs)
