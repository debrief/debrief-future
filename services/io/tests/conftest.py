"""Shared test fixtures for debrief-io tests."""

from pathlib import Path

import pytest


@pytest.fixture
def fixtures_dir() -> Path:
    """Return path to test fixtures directory."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def valid_fixtures_dir(fixtures_dir: Path) -> Path:
    """Return path to valid test fixtures."""
    return fixtures_dir / "valid"


@pytest.fixture
def invalid_fixtures_dir(fixtures_dir: Path) -> Path:
    """Return path to invalid test fixtures."""
    return fixtures_dir / "invalid"


@pytest.fixture
def boat1_rep(valid_fixtures_dir: Path) -> Path:
    """Return path to boat1.rep fixture."""
    return valid_fixtures_dir / "boat1.rep"


@pytest.fixture
def boat2_rep(valid_fixtures_dir: Path) -> Path:
    """Return path to boat2.rep fixture."""
    return valid_fixtures_dir / "boat2.rep"


@pytest.fixture
def narrative_rep(valid_fixtures_dir: Path) -> Path:
    """Return path to narrative.rep fixture."""
    return valid_fixtures_dir / "narrative.rep"


@pytest.fixture
def boat1_content(boat1_rep: Path) -> str:
    """Return content of boat1.rep fixture."""
    return boat1_rep.read_text(encoding="utf-8")


@pytest.fixture
def boat2_content(boat2_rep: Path) -> str:
    """Return content of boat2.rep fixture."""
    return boat2_rep.read_text(encoding="utf-8")
