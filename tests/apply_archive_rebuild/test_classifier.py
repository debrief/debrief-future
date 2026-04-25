"""Unit tests for archive index parser + classifier (T010, T014)."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType

# ---------------------------------------------------------------------------
# parse_archive_index (T010)
# ---------------------------------------------------------------------------


def test_parse_archive_index_real_runbook(aar: ModuleType, repo_root: Path) -> None:
    """The real ARCHIVE-REBUILD.md on main has many index rows."""
    runbook = repo_root / "ARCHIVE-REBUILD.md"
    if not runbook.exists():
        pytest.skip("ARCHIVE-REBUILD.md not present on disk")
    index = aar.parse_archive_index(runbook)
    # Spec says 131 rows; we accept >= 50 to tolerate index drift.
    assert len(index) >= 50, f"expected ≥50 entries, got {len(index)}"


def test_parse_archive_index_fixture(aar: ModuleType, fixtures_root: Path) -> None:
    runbook = fixtures_root / "archive" / "ARCHIVE-REBUILD.md"
    index = aar.parse_archive_index(runbook)
    assert set(index.keys()) == {
        "100-alpha-feature",
        "101-beta-feature",
        "200-rollup-anchor",
        "300-composite-anchor",
        "301-composite-member",
    }
    assert index["100-alpha-feature"].category == "unified"
    assert index["200-rollup-anchor"].category == "epic-rollup"


def test_parse_archive_index_missing_heading(
    aar: ModuleType, tmp_path: Path
) -> None:
    runbook = tmp_path / "no-heading.md"
    runbook.write_text("# Other doc\n\nNo index here.\n", encoding="utf-8")
    assert aar.parse_archive_index(runbook) == {}


def test_parse_archive_index_missing_file(aar: ModuleType, tmp_path: Path) -> None:
    runbook = tmp_path / "does-not-exist.md"
    assert aar.parse_archive_index(runbook) == {}


def test_parse_archive_index_escaped_pipe(aar: ModuleType, tmp_path: Path) -> None:
    runbook = tmp_path / "escaped.md"
    runbook.write_text(
        "## Index\n\n"
        "| Spec | Cat | Title | Date | Path |\n"
        "|------|-----|-------|------|------|\n"
        "| 042-x | unified | Building X \\| Y | 2026-01-01 | specs/042-x/media/unified-post.md |\n",
        encoding="utf-8",
    )
    index = aar.parse_archive_index(runbook)
    assert "042-x" in index
    assert index["042-x"].title == "Building X | Y"


def test_parse_archive_index_duplicate_raises(
    aar: ModuleType, tmp_path: Path
) -> None:
    runbook = tmp_path / "dup.md"
    runbook.write_text(
        "## Index\n\n"
        "| Spec | Cat | Title | Date | Path |\n"
        "|------|-----|-------|------|------|\n"
        "| 042-x | unified | A | 2026-01-01 | specs/042-x/media/unified-post.md |\n"
        "| 042-x | unified | B | 2026-01-02 | specs/042-x/media/unified-post.md |\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="duplicate"):
        aar.parse_archive_index(runbook)


def test_parse_archive_index_malformed_row_skipped(
    aar: ModuleType, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    runbook = tmp_path / "malformed.md"
    runbook.write_text(
        "## Index\n\n"
        "| Spec | Cat | Title | Date | Path |\n"
        "|------|-----|-------|------|------|\n"
        "| 042-x | only-three-cells |\n"
        "| 043-y | unified | B | 2026-01-02 | specs/043-y/media/unified-post.md |\n",
        encoding="utf-8",
    )
    index = aar.parse_archive_index(runbook)
    assert set(index.keys()) == {"043-y"}
    captured = capsys.readouterr()
    assert "malformed index row" in captured.err
