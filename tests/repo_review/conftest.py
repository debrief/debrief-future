"""Shared fixtures for the repo-review ledger helper tests.

``scripts/review-ledger.py`` has a hyphen in its filename and is not importable
as a normal module, so we load it once per session via importlib and expose it
as the ``rl`` fixture.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType

_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "review-ledger.py"


def _load_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location("review_ledger", _SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # Register before exec so dataclasses can resolve string annotations
    # (from __future__ import annotations) against the module's namespace.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def rl() -> ModuleType:
    return _load_module()
