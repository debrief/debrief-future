"""Unit tests for `resolve_asset` (T022)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _make_image_ref(aar: ModuleType, slug: str, basename: str) -> object:
    return aar.ImageRef(
        alt="x",
        site_path=f"/assets/images/future-debrief/{slug}/{basename}",
        slug=slug,
        basename=basename,
        line_number=1,
    )


def test_primary_screenshot_hit(aar: ModuleType, fixtures_root: Path) -> None:
    archive_root = fixtures_root / "archive"
    ref = _make_image_ref(aar, "100-alpha-feature", "overview.png")
    ac = aar.resolve_asset(ref, archive_root)
    assert ac.found is True
    assert ac.source_path.name == "overview.png"
    assert "screenshots" in ac.source_path.parts


def test_top_level_evidence_fallback(aar: ModuleType, fixtures_root: Path) -> None:
    archive_root = fixtures_root / "archive"
    ref = _make_image_ref(aar, "100-alpha-feature", "interaction.gif")
    ac = aar.resolve_asset(ref, archive_root)
    assert ac.found is True
    assert ac.source_path.name == "interaction.gif"
    assert "screenshots" not in ac.source_path.parts


def test_neither_location_unfound(aar: ModuleType, fixtures_root: Path) -> None:
    archive_root = fixtures_root / "archive"
    ref = _make_image_ref(aar, "100-alpha-feature", "missing.png")
    ac = aar.resolve_asset(ref, archive_root)
    assert ac.found is False


def test_symlink_resolves_to_real_file(aar: ModuleType, tmp_path: Path) -> None:
    real_root = tmp_path / "archive"
    (real_root / "specs/123-foo/evidence/screenshots").mkdir(parents=True)
    real_target = real_root / "real-image.png"
    real_target.write_bytes(b"REAL-PNG")
    sym = real_root / "specs/123-foo/evidence/screenshots/foo.png"
    sym.symlink_to(real_target)
    ref = _make_image_ref(aar, "123-foo", "foo.png")
    ac = aar.resolve_asset(ref, real_root)
    assert ac.found is True
    assert ac.source_path == real_target.resolve()
