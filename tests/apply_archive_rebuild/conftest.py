"""Load `scripts/232-apply-archive-rebuild.py` as a module for the test suite.

Hyphenated/digit-prefixed script name → load via `importlib.util`.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest

if TYPE_CHECKING:
    from types import ModuleType

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SCRIPT_PATH = _REPO_ROOT / "scripts" / "232-apply-archive-rebuild.py"
_MODULE_NAME = "_apply_archive_rebuild_script"


def _load_module() -> ModuleType:
    if _MODULE_NAME in sys.modules:
        return sys.modules[_MODULE_NAME]
    spec = importlib.util.spec_from_file_location(_MODULE_NAME, _SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {_SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[_MODULE_NAME] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def aar() -> ModuleType:
    """Loaded `scripts/232-apply-archive-rebuild.py` module."""
    return _load_module()


@pytest.fixture
def repo_root() -> Path:
    return _REPO_ROOT


@pytest.fixture
def fixtures_root() -> Path:
    return Path(__file__).resolve().parent / "fixtures"


@pytest.fixture
def archive_shape(aar: ModuleType) -> dict[str, Any]:
    """Minimal archive-post factory for tests — keeps the types at the boundary."""
    return {
        "FrontMatter": aar.FrontMatter,
        "ArchivePost": aar.ArchivePost,
        "SitePost": aar.SitePost,
        "ImageRef": aar.ImageRef,
        "ArchivePostRef": aar.ArchivePostRef,
        "Classification": aar.Classification,
        "Divergence": aar.Divergence,
        "AssetCopy": aar.AssetCopy,
        "MigrationPlan": aar.MigrationPlan,
    }
