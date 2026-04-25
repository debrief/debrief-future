"""End-to-end test (T016, T024) using the 3-post fixture tree."""

from __future__ import annotations

import shutil
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _seed_site_clone(fixtures_root: Path, tmp_path: Path) -> Path:
    """Copy the site fixture into a tmp clone and add a minimal _config.yml."""
    src = fixtures_root / "site"
    dest = tmp_path / "site"
    shutil.copytree(src, dest)
    (dest / "_config.yml").write_text(
        "title: Test\nplugins:\n  - jekyll-feed\n", encoding="utf-8"
    )
    return dest


def test_end_to_end_happy_path(
    aar: ModuleType, fixtures_root: Path, tmp_path: Path
) -> None:
    archive_root = fixtures_root / "archive"
    site_clone = _seed_site_clone(fixtures_root, tmp_path)

    plan = aar.build_migration_plan(archive_root, site_clone)
    assert len(plan.classifications) == 3  # legacy v3 post is filtered (layout: post)
    assert plan.source_relative_leaks == []
    assert plan.filename_collisions == []
    # Fixture has all 3 archive image refs available; FR-009 should pass.
    assert all(ac.found for ac in plan.asset_copies), [
        (ac.image_ref.slug, ac.image_ref.basename) for ac in plan.asset_copies if not ac.found
    ]
    assert plan.is_blocked is False
    assert plan.config_edit_needed is True

    result = aar.execute_migration_plan(plan, site_clone, archive_root)
    assert result.config_edited is True

    # SC-001-equivalent: every replace produced an output file.
    posts_dir = site_clone / "_posts"
    written = sorted(p.name for p in posts_dir.glob("*.md"))
    # legacy v3 post stays
    assert "2025-12-01-legacy-post.md" in written
    # archive's unified post landed
    assert any(p.startswith("2026-03-01-") and "alpha-feature" in p for p in written)


def test_end_to_end_idempotent(
    aar: ModuleType, fixtures_root: Path, tmp_path: Path
) -> None:
    archive_root = fixtures_root / "archive"
    site_clone = _seed_site_clone(fixtures_root, tmp_path)
    plan = aar.build_migration_plan(archive_root, site_clone)
    aar.execute_migration_plan(plan, site_clone, archive_root)
    snapshot1 = {
        p.relative_to(site_clone): p.read_bytes()
        for p in sorted(site_clone.rglob("*"))
        if p.is_file()
    }
    plan2 = aar.build_migration_plan(archive_root, site_clone)
    aar.execute_migration_plan(plan2, site_clone, archive_root)
    snapshot2 = {
        p.relative_to(site_clone): p.read_bytes()
        for p in sorted(site_clone.rglob("*"))
        if p.is_file()
    }
    assert snapshot1 == snapshot2


def test_blocked_plan_refuses_to_execute(
    aar: ModuleType, fixtures_root: Path, tmp_path: Path
) -> None:
    archive_root = fixtures_root / "archive"
    site_clone = _seed_site_clone(fixtures_root, tmp_path)
    plan = aar.build_migration_plan(archive_root, site_clone)

    # Force blocked-state by injecting a synthetic missing asset.
    bad_ref = aar.ImageRef(
        alt="x", site_path="/x", slug="999", basename="missing.png", line_number=1
    )
    plan.asset_copies.append(
        aar.AssetCopy(
            image_ref=bad_ref,
            source_path=archive_root / "specs/999/missing.png",
            destination_path=__import__("pathlib").Path("assets/images/future-debrief/999/missing.png"),
            found=False,
        )
    )
    assert plan.is_blocked is True
    import pytest

    with pytest.raises(RuntimeError, match="blocked"):
        aar.execute_migration_plan(plan, site_clone, archive_root)


def test_source_relative_leaks_detect_synthetic(
    aar: ModuleType, fixtures_root: Path
) -> None:
    """A synthetic archive-post body with `../evidence/foo.png` flags as leak."""
    fm = aar.FrontMatter(
        layout="future-post",
        title="Building Leaky",
        date=__import__("datetime").date(2026, 1, 1),
        author="Ian",
        track="credibility",
        tags=[],
    )
    body = "Body\n![bad](../evidence/foo.png)\n"
    leaky = aar.ArchivePost(
        spec_key="999-leaky",
        kind="unified",
        source_path=__import__("pathlib").Path("specs/999-leaky/media/unified-post.md"),
        front_matter=fm,
        body=body,
        target_filename="2026-01-01-leaky.md",
        referenced_images=tuple(),
    )
    leaks = aar.detect_source_relative_leaks([leaky])
    assert len(leaks) == 1
