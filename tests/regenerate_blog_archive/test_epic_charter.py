"""T055–T068: BACKLOG Epics table parser + [Ex] prefix + mismatches + rollup anchor."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType

_FIX = Path(__file__).parent / "fixtures"


def test_parses_epics_table(rba: ModuleType) -> None:
    epics = rba.parse_backlog_epics(_FIX / "backlog-excerpt.md")
    ids = sorted(e.id for e in epics)
    assert ids == ["E02", "E98", "E99"]
    e02 = next(e for e in epics if e.id == "E02")
    assert e02.title == "PROV Logging Implementation"
    assert e02.member_spec_numbers == (70, 71, 72)
    assert e02.status == "complete"  # struck-through


def test_proposed_and_active_statuses_parsed(rba: ModuleType) -> None:
    epics = rba.parse_backlog_epics(_FIX / "backlog-excerpt.md")
    e99 = next(e for e in epics if e.id == "E99")
    e98 = next(e for e in epics if e.id == "E98")
    assert e99.status == "proposed"
    assert e98.status == "active"


def _make_spec(
    rba: ModuleType,
    tmp_path: Path,
    *,
    number: int,
    slug: str,
    shipped: bool = True,
    epic_prefix: str | None = None,
    tags: list[str] | None = None,
    date: str = "2026-02-01",
) -> object:
    path = tmp_path / "specs" / f"{number:03d}-{slug}"
    path.mkdir(parents=True)
    (path / "spec.md").write_text(
        f"# {'[' + epic_prefix + '] ' if epic_prefix else ''}{slug}\n\nBody.\n"
    )
    media = path / "media"
    media.mkdir()
    shipped_path: Path | None = None
    fm = None
    if shipped:
        body = (
            "---\n"
            f"title: \"Shipped: {slug}\"\n"
            f"date: {date}\n"
            f"tags: {tags if tags is not None else ['example']}\n"
            "---\n\n## What Shipped\n\nBody.\n"
        )
        shipped_path = media / "shipped-post.md"
        shipped_path.write_text(body)
        fm = rba.parse_front_matter(shipped_path)
    return rba.SpecRecord(
        number=number, slug=slug, path=path,
        shipped_post_path=shipped_path,
        has_opening_context=False, has_planning_post=False,
        front_matter=fm, epic_prefix=epic_prefix,
    )


def test_rollup_anchor_is_lowest_nnn(rba: ModuleType, tmp_path: Path) -> None:
    """C10: epic rollup lands at the lowest-NNN member's media folder."""
    specs = [
        _make_spec(rba, tmp_path, number=72, slug="third", tags=["provenance"]),
        _make_spec(rba, tmp_path, number=70, slug="first", tags=["provenance"]),
        _make_spec(rba, tmp_path, number=71, slug="second", tags=["provenance"]),
    ]
    epic = rba.Epic(
        id="E02", title="PROV Logging", description="desc",
        idea_doc_path=None, status="complete",
        member_spec_numbers=(70, 71, 72),
    )
    post = rba.stitch_epic_rollup(epic=epic, members=tuple(specs))
    assert post is not None
    assert "070-first" in str(post.destination)
    assert post.destination.name == "epic-rollup.md"


def test_rollup_title_not_building_prefixed(rba: ModuleType, tmp_path: Path) -> None:
    specs = [_make_spec(rba, tmp_path, number=70, slug="first")]
    epic = rba.Epic(
        id="E02", title="PROV Logging", description="desc",
        idea_doc_path=None, status="complete",
        member_spec_numbers=(70,),
    )
    post = rba.stitch_epic_rollup(epic=epic, members=tuple(specs))
    assert post is not None
    assert not post.title.startswith("Building ")
    assert post.title == "PROV Logging"


def test_charter_prefix_mismatch_surfaced(rba: ModuleType, tmp_path: Path) -> None:
    specs = [
        _make_spec(rba, tmp_path, number=50, slug="mystery", epic_prefix="E02"),
    ]
    epic = rba.Epic(
        id="E02", title="PROV Logging", description="desc",
        idea_doc_path=None, status="complete",
        member_spec_numbers=(70,),  # 50 is NOT listed
    )
    unresolved = rba.detect_charter_prefix_mismatches(
        epics=[epic],
        prefix_groups={"E02": specs},
        specs=specs,
    )
    kinds = {u.kind for u in unresolved}
    assert "charter-prefix-mismatch" in kinds
    assert "missing-charter-member" in kinds  # number 70 has no directory
