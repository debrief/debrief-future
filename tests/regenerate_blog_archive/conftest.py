"""Load `scripts/regenerate-blog-archive.py` as a module for the test suite.

The script name uses a hyphen, so we load it via `importlib.util` and register
it in `sys.modules` before exposing it as a `rba` fixture / `rba_module`.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SCRIPT_PATH = _REPO_ROOT / "scripts" / "regenerate-blog-archive.py"
_MODULE_NAME = "_regenerate_blog_archive_script"


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
def rba() -> ModuleType:
    return _load_module()


@pytest.fixture
def repo_root() -> Path:
    return _REPO_ROOT
