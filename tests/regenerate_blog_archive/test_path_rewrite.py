"""Unit cases for `rewrite_image_path` (FR-004, FR-011).

Covers the six-rule ordered logic from contracts/helpers.md:
scheme → absolute → suffix split → loop-strip → basename → compose.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType


def test_rewrite_basic_dot_slash_evidence(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("./evidence/foo.png", "174-thumbnail-capture")
    assert out == "/assets/images/future-debrief/174-thumbnail-capture/foo.png"


def test_rewrite_dotdot_evidence_gif(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("../evidence/interaction.gif", "191-spec-navigator")
    assert out == "/assets/images/future-debrief/191-spec-navigator/interaction.gif"


def test_rewrite_bare_evidence_prefix(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("evidence/screenshots/a.png", "085-chart-renderer")
    assert out == "/assets/images/future-debrief/085-chart-renderer/a.png"


def test_rewrite_multi_level_climb_fr011(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("../../evidence/screenshots/foo.png", "x")
    assert out == "/assets/images/future-debrief/x/foo.png"


def test_rewrite_repeated_dot_slash(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("./././evidence/foo.png", "x")
    assert out == "/assets/images/future-debrief/x/foo.png"


def test_rewrite_absolute_media_path_unchanged(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("/media/x.png", "any")
    assert out == "/media/x.png"


def test_rewrite_jekyll_absolute_unchanged(rba: ModuleType) -> None:
    src = "/assets/images/future-debrief/x/y.png"
    assert rba.rewrite_image_path(src, "any") == src


def test_rewrite_https_scheme_unchanged(rba: ModuleType) -> None:
    src = "https://example.com/a.png"
    assert rba.rewrite_image_path(src, "any") == src


def test_rewrite_http_scheme_unchanged(rba: ModuleType) -> None:
    src = "http://example.com/a.png"
    assert rba.rewrite_image_path(src, "any") == src


def test_rewrite_data_scheme_unchanged(rba: ModuleType) -> None:
    src = "data:image/png;base64,AAA"
    assert rba.rewrite_image_path(src, "any") == src


def test_rewrite_preserves_query_string(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("foo.png?raw=true", "x")
    assert out == "/assets/images/future-debrief/x/foo.png?raw=true"


def test_rewrite_preserves_fragment(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("foo.png#frag", "x")
    assert out == "/assets/images/future-debrief/x/foo.png#frag"


def test_rewrite_combined_climb_and_suffix(rba: ModuleType) -> None:
    out = rba.rewrite_image_path("../evidence/foo.png?raw=true", "x")
    assert out == "/assets/images/future-debrief/x/foo.png?raw=true"
