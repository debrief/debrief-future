"""T012–T013: CLI argparse surface + constraint validation (C2, C3)."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def test_defaults(rba: ModuleType, repo_root: Path, tmp_path: Path) -> None:
    args = rba.parse_cli_args(["--repo-root", str(tmp_path)])
    assert args.dry_run is False
    assert args.verbose is False
    assert args.composite_window_days == 5
    assert args.near_miss_max_days == 10
    assert args.skip_gh is False
    assert args.fail_fast is False
    # Default out_index sits at <repo>/ARCHIVE-REBUILD.md.
    assert args.out_index == (tmp_path.resolve() / "ARCHIVE-REBUILD.md")


def test_invalid_window_exits_2(rba: ModuleType, tmp_path: Path) -> None:
    """C2: exit 2 on invalid --composite-window-days (0)."""
    with pytest.raises(SystemExit) as excinfo:
        rba.parse_cli_args([
            "--composite-window-days", "0", "--repo-root", str(tmp_path),
        ])
    assert excinfo.value.code == 2


def test_near_miss_below_window_exits_2(rba: ModuleType, tmp_path: Path) -> None:
    with pytest.raises(SystemExit) as excinfo:
        rba.parse_cli_args([
            "--composite-window-days", "5",
            "--near-miss-max-days", "3",
            "--repo-root", str(tmp_path),
        ])
    assert excinfo.value.code == 2


def test_out_index_guard_exits_2(rba: ModuleType, tmp_path: Path) -> None:
    """C3: exit 2 on --out-index that resolves to an existing non-index file."""
    target = tmp_path / "some-other-file.md"
    target.write_text("existing content")
    with pytest.raises(SystemExit) as excinfo:
        rba.parse_cli_args([
            "--out-index", str(target),
            "--repo-root", str(tmp_path),
        ])
    assert excinfo.value.code == 2


def test_out_index_allows_existing_archive_rebuild(
    rba: ModuleType,
    tmp_path: Path,
) -> None:
    target = tmp_path / "ARCHIVE-REBUILD.md"
    target.write_text("old index")
    args = rba.parse_cli_args([
        "--out-index", str(target), "--repo-root", str(tmp_path),
    ])
    assert args.out_index == target.resolve()
