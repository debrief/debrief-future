"""
Pytest configuration and shared fixtures for debrief-stac tests.
"""

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

import pytest

from debrief_stac.models import PlotMetadata


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for test catalogs."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def catalog_path(temp_dir: Path) -> Path:
    """Return path for a test catalog."""
    return temp_dir / "test_catalog"


@pytest.fixture
def sample_plot_metadata() -> PlotMetadata:
    """Create sample PlotMetadata for testing."""
    return PlotMetadata(
        title="Test Plot",
        description="A test plot for unit testing",
        timestamp=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_plot_metadata_minimal() -> PlotMetadata:
    """Create minimal PlotMetadata (title only)."""
    return PlotMetadata(
        title="Minimal Plot",
    )
