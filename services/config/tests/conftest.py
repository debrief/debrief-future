"""Shared pytest fixtures for debrief-config tests."""

import json
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def isolated_config(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Isolate config to a temp directory for all tests.

    Uses XDG_CONFIG_HOME environment variable which platformdirs respects.
    """
    config_base = tmp_path / "config"
    config_base.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("XDG_CONFIG_HOME", str(config_base))

    # Force reimport of paths module to pick up new env var
    import importlib

    import debrief_config.paths
    importlib.reload(debrief_config.paths)

    return config_base / "debrief"


@pytest.fixture
def temp_config_dir(isolated_config: Path) -> Path:
    """Create a temporary config directory."""
    isolated_config.mkdir(parents=True, exist_ok=True)
    return isolated_config


@pytest.fixture
def temp_config_file(temp_config_dir: Path) -> Path:
    """Create a temporary config file with defaults."""
    config_file = temp_config_dir / "config.json"
    config_file.write_text(json.dumps({
        "version": "1.0.0",
        "stores": [],
        "preferences": {}
    }))
    return config_file


@pytest.fixture
def sample_stac_catalog(tmp_path: Path) -> Path:
    """Create a sample STAC catalog for testing."""
    catalog_dir = tmp_path / "sample-catalog"
    catalog_dir.mkdir(parents=True, exist_ok=True)

    catalog_json = catalog_dir / "catalog.json"
    catalog_json.write_text(json.dumps({
        "type": "Catalog",
        "stac_version": "1.0.0",
        "id": "sample-catalog",
        "description": "A sample STAC catalog for testing",
        "links": []
    }))

    return catalog_dir


@pytest.fixture
def invalid_stac_catalog(tmp_path: Path) -> Path:
    """Create an invalid STAC catalog (missing required fields)."""
    catalog_dir = tmp_path / "invalid-catalog"
    catalog_dir.mkdir(parents=True, exist_ok=True)

    catalog_json = catalog_dir / "catalog.json"
    catalog_json.write_text(json.dumps({
        "type": "Feature",  # Wrong type
        "id": "invalid"
    }))

    return catalog_dir
