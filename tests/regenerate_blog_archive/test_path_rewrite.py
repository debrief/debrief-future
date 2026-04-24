"""Spec 231 Phase 2: rewrite_image_path unit cases.

Covers each first-match-wins branch + suffix preservation + loop-strip
of multi-level climbs (FR-011) per contracts/helpers.md.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def test_basic_dot_slash_evidence(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("./evidence/foo.png", "174-thumbnail-capture")
    assert out == "/assets/images/future-debrief/174-thumbnail-capture/foo.png"


def test_dotdot_slash_evidence(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("../evidence/interaction.gif", "191-spec-navigator")
    assert out == "/assets/images/future-debrief/191-spec-navigator/interaction.gif"


def test_bare_evidence_screenshots(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("evidence/screenshots/a.png", "085-chart-renderer")
    assert out == "/assets/images/future-debrief/085-chart-renderer/a.png"


def test_multi_level_climb_resolves(rba: ModuleType) -> None:
    """FR-011: ../../evidence/foo.png resolves identically to ../evidence/foo.png."""
    out = rba.rewrite_image_path("../../evidence/screenshots/foo.png", "x")
    assert out == "/assets/images/future-debrief/x/foo.png"


def test_repeated_dot_slash(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("./././evidence/foo.png", "x")
    assert out == "/assets/images/future-debrief/x/foo.png"


def test_absolute_media_path_unchanged(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("/media/x.png", "anything")
    assert out == "/media/x.png"


def test_already_jekyll_path_unchanged(rba: ModuleType) -> None:
    out = rba.rewrite_image_path(
        "/assets/images/future-debrief/x/y.png", "anything",
    )
    assert out == "/assets/images/future-debrief/x/y.png"


def test_https_scheme_pass_through(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("https://example.com/a.png", "anything")
    assert out == "https://example.com/a.png"


def test_data_scheme_pass_through(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("data:image/png;base64,AAAA", "anything")
    assert out == "data:image/png;base64,AAAA"


def test_query_string_preserved(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("foo.png?raw=true", "x")
    assert out == "/assets/images/future-debrief/x/foo.png?raw=true"


def test_fragment_preserved(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("foo.png#frag", "x")
    assert out == "/assets/images/future-debrief/x/foo.png#frag"


def test_climb_plus_query_suffix(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("../evidence/foo.png?raw=true", "x")
    assert out == "/assets/images/future-debrief/x/foo.png?raw=true"
