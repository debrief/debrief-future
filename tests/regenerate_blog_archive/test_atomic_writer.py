"""T031–T034: AtomicWriter (C1, C5, no-overwrite guard, rollback)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from pathlib import Path
    from types import ModuleType


def test_c1_dry_run_no_promotion(rba: ModuleType, tmp_path: Path) -> None:
    dest = tmp_path / "new.md"
    with rba.AtomicWriter(dry_run=True, logger=logging.getLogger("test")) as w:
        w.stage(dest, "content")
        # Temp dir exists during the block.
        assert w.temp_dir.exists()
    assert not dest.exists()


def test_successful_promotion(rba: ModuleType, tmp_path: Path) -> None:
    dest = tmp_path / "sub" / "new.md"
    with rba.AtomicWriter(dry_run=False, logger=logging.getLogger("test")) as w:
        w.stage(dest, "content")
    assert dest.exists()
    assert dest.read_text() == "content"


def test_no_overwrite_guard_raises(rba: ModuleType, tmp_path: Path) -> None:
    existing = tmp_path / "already.md"
    existing.write_text("original")
    with (
        rba.AtomicWriter(dry_run=False, logger=logging.getLogger("test")) as w,
        pytest.raises(rba.NoOverwriteError),
    ):
        w.stage(existing, "new content")
    assert existing.read_text() == "original"


def test_exception_rolls_back(rba: ModuleType, tmp_path: Path) -> None:
    """Exception during the `with` block keeps the repo untouched."""
    dest = tmp_path / "should-not-exist.md"
    temp_dir_ref: list[Path] = []
    try:
        with rba.AtomicWriter(dry_run=False, logger=logging.getLogger("test")) as w:
            w.stage(dest, "hello")
            temp_dir_ref.append(w.temp_dir)
            raise RuntimeError("boom")
    except RuntimeError:
        pass
    assert not dest.exists()
    assert temp_dir_ref
    assert not temp_dir_ref[0].exists()


def test_c5_no_overwrites_of_existing_specs(rba: ModuleType, tmp_path: Path) -> None:
    """Every existing file under `specs/*/` stays byte-identical."""
    existing = tmp_path / "specs" / "100-x" / "media" / "shipped-post.md"
    existing.parent.mkdir(parents=True)
    existing.write_text("original body")
    new_file = tmp_path / "specs" / "100-x" / "media" / "unified-post.md"
    import hashlib
    pre_hash = hashlib.sha256(existing.read_bytes()).hexdigest()
    with rba.AtomicWriter(dry_run=False, logger=logging.getLogger("test")) as w:
        w.stage(new_file, "new body")
    assert new_file.exists()
    post_hash = hashlib.sha256(existing.read_bytes()).hexdigest()
    assert pre_hash == post_hash
