"""T036, T050–T051, T070, T089, T101–T102: classifier orchestration + coverage invariant."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _build_cli(rba: ModuleType, tmp_path: Path) -> object:
    return rba.CliArgs(
        dry_run=True, verbose=False,
        out_index=tmp_path / "ARCHIVE-REBUILD.md",
        composite_window_days=5, near_miss_max_days=10,
        skip_gh=True, fail_fast=False, repo_root=tmp_path,
    )


def _write_minimal(
    rba: ModuleType,
    tmp_path: Path,
    *,
    number: int,
    slug: str,
    shipped: bool,
    tags: list[str] | None = None,
    date: str = "2026-03-01",
) -> None:
    d = tmp_path / "specs" / f"{number:03d}-{slug}"
    d.mkdir(parents=True)
    (d / "spec.md").write_text(f"# {slug}\n")
    if shipped:
        media = d / "media"
        media.mkdir()
        body = (
            "---\n"
            f"title: \"Shipped: {slug}\"\n"
            f"date: {date}\n"
            f"tags: {tags or ['example']}\n"
            "---\n\n## What Shipped\n\nbody\n"
        )
        (media / "shipped-post.md").write_text(body)


def test_standalone_shipped_classifies_unified(rba: ModuleType, tmp_path: Path) -> None:
    _write_minimal(rba, tmp_path, number=100, slug="x", shipped=True)
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, unresolved, near = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    assert len(classifications) == 1
    assert classifications[0].category == "unified"
    assert any(p.kind == "unified" for p in posts)


def test_in_flight_classifies_skipped(rba: ModuleType, tmp_path: Path) -> None:
    _write_minimal(rba, tmp_path, number=100, slug="x", shipped=False)
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, _, _ = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    assert classifications[0].category == "skipped"
    assert posts == []


def test_epic_precedence_over_composite(rba: ModuleType, tmp_path: Path) -> None:
    """A spec in a complete epic AND within 5d of another shipped spec with
    shared tag classifies as `epic-member`, not `composite-member`."""
    _write_minimal(rba, tmp_path, number=70, slug="a",
                   shipped=True, tags=["shared"], date="2026-01-01")
    _write_minimal(rba, tmp_path, number=71, slug="b",
                   shipped=True, tags=["shared"], date="2026-01-02")
    # spec 72 is also in the epic but not close to 70/71 temporally:
    _write_minimal(rba, tmp_path, number=72, slug="c",
                   shipped=True, tags=["shared"], date="2026-02-20")
    specs = rba.discover_specs(tmp_path)
    epic = rba.Epic(
        id="E02", title="PROV", description="d",
        idea_doc_path=None, status="complete",
        member_spec_numbers=(70, 71),
    )
    args = _build_cli(rba, tmp_path)
    classifications, _, _, _ = rba.classify_and_generate(
        specs=specs, epics=[epic], args=args, logger=logging.getLogger("test"),
    )
    by_num = {c.spec.number: c.category for c in classifications}
    assert by_num[70] == "epic-member"
    assert by_num[71] == "epic-member"
    # spec 72 is outside the epic but is ONLY one — no composite possible.
    assert by_num[72] == "unified"


def test_coverage_invariant_detects_duplicates(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    specs = [
        rba.SpecRecord(
            number=1, slug="a", path=tmp_path,
            shipped_post_path=None, has_opening_context=False,
            has_planning_post=False, front_matter=None, epic_prefix=None,
        )
    ]
    classifications = [
        rba.Classification(
            spec=specs[0], category="unified", reason="x",
            epic_id=None, composite_id=None,
            opener_source=None, pr_body_source=None, date_source=None,
        ),
        rba.Classification(
            spec=specs[0], category="unified", reason="x",
            epic_id=None, composite_id=None,
            opener_source=None, pr_body_source=None, date_source=None,
        ),
    ]
    with pytest.raises(AssertionError, match="classified twice"):
        rba.assert_coverage_invariant(
            specs=specs, classifications=classifications,
            logger=logging.getLogger("test"),
        )


def test_coverage_invariant_detects_missing(rba: ModuleType, tmp_path: Path) -> None:
    specs = [
        rba.SpecRecord(
            number=1, slug="a", path=tmp_path,
            shipped_post_path=None, has_opening_context=False,
            has_planning_post=False, front_matter=None, epic_prefix=None,
        ),
        rba.SpecRecord(
            number=2, slug="b", path=tmp_path,
            shipped_post_path=None, has_opening_context=False,
            has_planning_post=False, front_matter=None, epic_prefix=None,
        ),
    ]
    classifications = [
        rba.Classification(
            spec=specs[0], category="unified", reason="x",
            epic_id=None, composite_id=None,
            opener_source=None, pr_body_source=None, date_source=None,
        ),
    ]
    with pytest.raises(AssertionError, match="missing from classification"):
        rba.assert_coverage_invariant(
            specs=specs, classifications=classifications,
            logger=logging.getLogger("test"),
        )


def test_malformed_yaml_is_skipped_with_unresolved(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    """C11: malformed YAML surfaces as UnresolvedGrouping, run continues."""
    # Build a spec whose shipped-post has malformed YAML.
    d = tmp_path / "specs" / "300-bad"
    d.mkdir(parents=True)
    (d / "spec.md").write_text("# bad\n")
    (d / "media").mkdir()
    (d / "media" / "shipped-post.md").write_text(
        "---\ntitle: Shipped: Unquoted: Colon\ndate: 2026-01-01\n---\n\nbody\n"
    )
    specs = rba.discover_specs(tmp_path)
    args = _build_cli(rba, tmp_path)
    classifications, posts, unresolved, _ = rba.classify_and_generate(
        specs=specs, epics=[], args=args, logger=logging.getLogger("test"),
    )
    kinds = {u.kind for u in unresolved}
    assert "malformed-yaml" in kinds
    assert classifications[0].category == "skipped"
    assert posts == []
