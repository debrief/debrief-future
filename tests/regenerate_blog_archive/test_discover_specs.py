"""T020–T023: spec discovery (incl. legacy date-stamped shipped-post R7 patch)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def _write_minimal_spec(
    spec_dir: Path,
    *,
    title: str,
    shipped_content: str | None,
    legacy_files: dict[str, str] | None = None,
) -> None:
    spec_dir.mkdir(parents=True)
    (spec_dir / "spec.md").write_text(f"# {title}\n\nBody.\n")
    media = spec_dir / "media"
    media.mkdir()
    if shipped_content is not None:
        (media / "shipped-post.md").write_text(shipped_content)
    for filename, content in (legacy_files or {}).items():
        (media / filename).write_text(content)


def _valid_shipped(date: str = "2026-02-14") -> str:
    return (
        "---\n"
        f'title: "Shipped: Example"\n'
        f"date: {date}\n"
        "tags: [example]\n"
        "---\n\n## What Shipped\n\nBody.\n"
    )


def test_discovers_canonical_shipped_post(tmp_path: Path, rba: ModuleType) -> None:
    spec_dir = tmp_path / "specs" / "123-example"
    _write_minimal_spec(spec_dir, title="Example", shipped_content=_valid_shipped())
    records = rba.discover_specs(tmp_path)
    assert len(records) == 1
    assert records[0].number == 123
    assert records[0].slug == "example"
    assert records[0].has_shipped_post is True


def test_discovers_legacy_date_stamped_shipped_post(
    tmp_path: Path,
    rba: ModuleType,
) -> None:
    """R7 patch: legacy `YYYY-MM-DD-shipped-*.md` must be recognised."""
    spec_dir = tmp_path / "specs" / "000-schemas"
    _write_minimal_spec(
        spec_dir,
        title="Schemas",
        shipped_content=None,
        legacy_files={
            "2024-09-30-shipped-schemas.md": _valid_shipped("2024-09-30"),
        },
    )
    records = rba.discover_specs(tmp_path)
    assert len(records) == 1
    assert records[0].has_shipped_post is True
    assert records[0].shipped_post_path is not None
    assert records[0].shipped_post_path.name == "2024-09-30-shipped-schemas.md"


def test_multiple_legacy_shipped_latest_wins(tmp_path: Path, rba: ModuleType) -> None:
    spec_dir = tmp_path / "specs" / "001-multi"
    _write_minimal_spec(
        spec_dir,
        title="Multi",
        shipped_content=None,
        legacy_files={
            "2024-01-10-shipped-v1.md": _valid_shipped("2024-01-10"),
            "2025-06-22-shipped-v2.md": _valid_shipped("2025-06-22"),
            "2024-11-05-shipped-v1b.md": _valid_shipped("2024-11-05"),
        },
    )
    records = rba.discover_specs(tmp_path)
    assert records[0].shipped_post_path is not None
    assert records[0].shipped_post_path.name == "2025-06-22-shipped-v2.md"


def test_directory_without_spec_md_skipped(tmp_path: Path, rba: ModuleType) -> None:
    (tmp_path / "specs" / "456-no-spec").mkdir(parents=True)
    records = rba.discover_specs(tmp_path)
    assert records == []


def test_non_conforming_directory_name_skipped(
    tmp_path: Path,
    rba: ModuleType,
) -> None:
    random = tmp_path / "specs" / "not-a-spec"
    random.mkdir(parents=True)
    (random / "spec.md").write_text("# x\n")
    records = rba.discover_specs(tmp_path)
    assert records == []


def test_epic_prefix_detected(tmp_path: Path, rba: ModuleType) -> None:
    spec_dir = tmp_path / "specs" / "100-member"
    spec_dir.mkdir(parents=True)
    (spec_dir / "spec.md").write_text("# [E02] Member Spec\n\n**Input**: stuff\n")
    (spec_dir / "media").mkdir()
    (spec_dir / "media" / "shipped-post.md").write_text(_valid_shipped())
    records = rba.discover_specs(tmp_path)
    assert records[0].epic_prefix == "E02"
